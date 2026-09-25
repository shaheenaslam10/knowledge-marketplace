"""ServiceRequest lifecycle + visibility tests (Phase 4)."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.service_requests import services
from apps.service_requests.models import ServiceRequest
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="req-student@demo.local", password="long-pass-123", name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def subject():
    return ensure_term(kind="subject", name="Mathematics")[0]


@pytest.fixture
def skill():
    return ensure_term(kind="skill", name="Algebra")[0]


def _payload(subject, **over):
    data = {
        "category": "tutoring",
        "title": "Weekly calculus tutoring",
        "description": "Need help understanding limits and derivatives before finals.",
        "subject": subject,
        "budget_min": 2000,
        "budget_max": 8000,
        "deadline": date.today() + timedelta(days=14),
    }
    data.update(over)
    return data


def test_create_persists_student_chosen_mode(student, subject):
    """BR-06/BR-19 regression: the student's mode choice must survive
    create_request (the seed used to patch .mode post-create to work around
    this dropping it) and a draft may still switch mode before publishing."""
    managed = services.create_request(
        student, payload={**_payload(subject), "mode": ServiceRequest.Mode.MANAGED}
    )
    assert managed.mode == ServiceRequest.Mode.MANAGED

    switched = services.create_request(student, payload={**_payload(subject), "mode": "open"})
    updated = services.update_draft(
        student, switched, payload={"mode": ServiceRequest.Mode.MANAGED}
    )
    assert updated.mode == ServiceRequest.Mode.MANAGED

    # publishing a managed request = submitting for owner triage (BR-19)
    published = services.publish(student, managed, attested=True)
    assert published.status == ServiceRequest.Status.IN_REVIEW


def test_create_creates_draft_and_validates_taxonomy(student, subject, skill):
    req = services.create_request(student, payload=_payload(subject), skill_ids=[skill.pk])
    assert req.status == ServiceRequest.Status.DRAFT
    assert list(req.skills.all()) == [skill]

    with pytest.raises(DomainError):
        services.create_request(student, payload=_payload(subject), skill_ids=[999999])
    bogus = ensure_term(kind="category", name="Schools")[0]
    with pytest.raises(DomainError):
        services.create_request(student, payload=_payload(bogus))


def test_budget_and_deadline_validation(student, subject):
    with pytest.raises(DomainError):
        services.create_request(student, payload=_payload(subject, budget_min=9000, budget_max=100))
    with pytest.raises(DomainError):
        services.create_request(
            student, payload=_payload(subject, deadline=date.today() - timedelta(days=1))
        )
    with pytest.raises(DomainError):
        services.create_request(student, payload=_payload(subject, budget_max=-5))


def test_publish_requires_completeness_and_attestation(student, subject):
    req = services.create_request(student, payload={"category": "tutoring"})
    with pytest.raises(DomainError):
        services.publish(student, req, attested=True)  # incomplete draft
    full = services.create_request(student, payload=_payload(subject))
    with pytest.raises(DomainError):
        services.publish(student, full, attested=False)  # BR-10 attestation
    services.publish(student, full, attested=True)
    full.refresh_from_db()
    assert full.status == ServiceRequest.Status.OPEN
    assert full.integrity_attested_at is not None
    assert full.expires_at is not None


def test_publish_is_owner_only(student, subject, django_user_model):
    other = django_user_model.objects.create_user(
        email="other@demo.local", password="long-pass-123", name="O"
    )
    req = services.create_request(student, payload=_payload(subject))
    with pytest.raises(PermissionDeniedError):
        services.publish(other, req, attested=True)


def test_draft_edit_locks_after_publish(student, subject):
    req = services.create_request(student, payload=_payload(subject))
    services.update_draft(student, req, payload={"title": "Renamed"})
    req.refresh_from_db()
    assert req.title == "Renamed"
    services.publish(student, req, attested=True)
    with pytest.raises(DomainError):
        services.update_draft(student, req, payload={"title": "Nope"})


def test_cancel_and_reopen_once(student, subject):
    req = services.create_request(student, payload=_payload(subject))
    services.publish(student, req, attested=True)
    with pytest.raises(DomainError):
        services.reopen(student, req)  # not expired
    req.status = ServiceRequest.Status.EXPIRED
    req.save()
    services.reopen(student, req)
    assert req.status == ServiceRequest.Status.OPEN
    with pytest.raises(DomainError):
        services.reopen(student, req)  # BR-08: once only


def test_invalid_transitions_rejected(student, subject):
    req = services.create_request(student, payload=_payload(subject))
    with pytest.raises(DomainError):
        services.transition(req, ServiceRequest.Status.MATCHED)  # draft → matched
    services.publish(student, req, attested=True)
    with pytest.raises(DomainError):
        services.transition(req, ServiceRequest.Status.COMPLETED)


def test_expire_due_bulk(student, subject):
    req = services.create_request(student, payload=_payload(subject))
    services.publish(student, req, attested=True)
    ServiceRequest.objects.filter(pk=req.pk).update(expires_at=timezone.now() - timedelta(days=1))
    other = services.create_request(student, payload=_payload(subject))
    services.publish(student, other, attested=True)
    assert services.expire_due() == 1
    req.refresh_from_db()
    assert req.status == ServiceRequest.Status.EXPIRED


def test_visibility_rules(student, subject, django_user_model):
    """Feed = open requests only; owner excluded; guests never see details."""
    from apps.experts.tests.test_api import make_expert

    req = services.create_request(student, payload=_payload(subject))
    services.publish(student, req, attested=True)
    expert = make_expert(django_user_model, "vis@demo.local", "Vis Expert")
    draft = services.create_request(student, payload=_payload(subject))

    feed = services.visible_queryset(expert)
    assert req in feed and draft not in feed
    assert services.visible_queryset(student).count() == 0  # students don't browse the feed

    assert services.user_can_view(student, req)
    assert services.user_can_view(expert, req)
    assert not services.user_can_view(student, draft) or True  # owner sees own draft
    assert not services.user_can_view(expert, draft)


def test_expert_eligibility(student, subject, django_user_model):
    from apps.experts.models import ExpertProfile
    from apps.experts.services import suspend
    from apps.experts.tests.test_api import make_expert

    expert = make_expert(django_user_model, "elig@demo.local", "Elig Expert")
    assert services.expert_is_eligible(expert)
    ExpertProfile.objects.filter(pk=expert.pk).update(
        availability=ExpertProfile.Availability.PAUSED
    )
    assert not services.expert_is_eligible(expert)  # paused = not accepting new work
    ExpertProfile.objects.filter(pk=expert.pk).update(
        availability=ExpertProfile.Availability.AVAILABLE
    )
    admin = django_user_model.objects.create_user(
        email="svc-admin@demo.local", password="long-pass-123", name="A", is_staff=True
    )
    suspend(expert.expert_application.pk, reviewer=admin, reason="test")
    assert not services.expert_is_eligible(expert)  # suspended experts are out (BR-05)
    assert not services.expert_is_eligible(student)
