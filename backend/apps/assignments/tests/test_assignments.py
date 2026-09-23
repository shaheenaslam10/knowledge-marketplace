"""Managed-service lifecycle: triage, pool, direct, convergence, races (Phase 5)."""

import json
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.assignments import services
from apps.assignments.models import DirectAssignment, PoolInvitation
from apps.audit.models import AuditEvent
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.orders.models import Order
from apps.payments.config import MANAGED_COMMISSION_RATE, commission_split
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin(django_user_model):
    user = django_user_model.objects.create_user(
        email="triage-admin@demo.local",
        password=PASSWORD,
        name="Ops",
        is_staff=True,
        is_superuser=True,
    )
    return user


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="managed-student@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def managed_request(student):
    subject = ensure_term(kind="subject", name="ManagedSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Managed: statistics coaching",
            "description": "Want the platform to pick the right expert for weekly stats coaching.",
            "subject": subject,
            "budget_min": 3000,
            "budget_max": 15000,
        },
    )
    req.mode = ServiceRequest.Mode.MANAGED
    req.save(update_fields=["mode"])
    return request_services.publish(student, req, attested=True)


def _assert_in_review(managed_request):
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.IN_REVIEW
    return managed_request


def test_managed_submission_goes_to_in_review_not_open(student, managed_request):
    _assert_in_review(managed_request)
    assert managed_request.expires_at is None  # no TTL before routing
    assert managed_request.integrity_attested_at is not None  # BR-10 still applies


def test_student_cannot_touch_owner_routing_fields(student):
    """Routing fields are owner territory: the student write path filters them
    out (WRITABLE_FIELDS) and every triage service demands staff."""
    subject = ensure_term(kind="subject", name="RouteSub")[0]
    draft = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "T",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 5000,
            # mass-assignment attempt — must be silently dropped:
            "quote_amount": 999999,
            "reviewer_id": 1,
            "status": "completed",
        },
    )
    draft = request_services.update_draft(
        student, draft, payload={"title": "T2", "quote_amount": 1, "reviewer_id": 1}
    )
    assert draft.quote_amount is None
    assert draft.reviewer_id is None
    assert draft.title == "T2"
    draft.mode = ServiceRequest.Mode.MANAGED
    draft.save(update_fields=["mode"])
    request_services.publish(student, draft, attested=True)
    with pytest.raises(PermissionDeniedError):
        services.set_quote(student, draft, quote_amount=100)


def test_triage_requires_staff(student, managed_request):
    with pytest.raises(PermissionDeniedError):
        services.reject_managed(student, managed_request, reason="nope")


def test_reject_requires_reason_and_records(admin, managed_request):
    with pytest.raises(DomainError):
        services.reject_managed(admin, managed_request, reason="")
    services.reject_managed(admin, managed_request, reason="Out of scope for this term")
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.REJECTED
    assert managed_request.review_notes == "Out of scope for this term"
    assert managed_request.reviewer_id == admin.id
    assert AuditEvent.objects.filter(
        action="reject_managed", object_id=str(managed_request.pk)
    ).exists()


def test_pool_routing_invites_subject_matched_eligible_experts(
    admin, managed_request, django_user_model
):
    _assert_in_review(managed_request)
    matched = make_expert(django_user_model, "pool-match@demo.local", "Pool Match")
    # a subject-mismatched approved expert must NOT be auto-invited
    make_expert(django_user_model, "pool-other@demo.local", "Pool Other")
    from apps.experts.models import ExpertProfile

    ExpertProfile.objects.filter(pk=matched.pk).update(availability="available")
    from django.contrib.auth import get_user_model

    other = get_user_model().objects.get(email="pool-other@demo.local")
    ExpertProfile.objects.filter(pk=other.pk).update(availability="available")
    # give 'matched' the request's subject
    profile = ExpertProfile.objects.get(pk=matched.pk)
    profile.subjects.add(managed_request.subject)

    with pytest.raises(DomainError):
        services.approve_pool(admin, managed_request)  # no quote yet (BR-22 gating)

    invitations = services.approve_pool(admin, managed_request, quote_amount=8000)
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.POOLED
    assert managed_request.quote_amount == 8000
    invited_ids = {inv.expert_id for inv in invitations}
    assert invited_ids == {matched.pk}  # only the subject-matched expert
    assert all(inv.expires_at > timezone.now() for inv in invitations)
    assert AuditEvent.objects.filter(action="assignment.pool_approve").exists()


def test_pool_first_accept_wins_creates_single_order(admin, managed_request, django_user_model):
    e1 = make_expert(django_user_model, "first1@demo.local", "First One")
    e2 = make_expert(django_user_model, "first2@demo.local", "First Two")
    invitations = services.approve_pool(
        admin, _assert_in_review(managed_request), expert_ids=[e1.pk, e2.pk], quote_amount=9000
    )
    inv1 = next(i for i in invitations if i.expert_id == e1.pk)
    inv2 = next(i for i in invitations if i.expert_id == e2.pk)

    invitation, order = services.accept_invitation(e1, inv1)
    assert invitation.status == PoolInvitation.Status.ACCEPTED
    assert order.source == Order.Source.MANAGED_POOL
    assert order.amount == 9000
    commission, net = commission_split(9000, MANAGED_COMMISSION_RATE)
    assert (order.commission_amount, order.expert_amount) == (commission, net)
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.MATCHED

    with pytest.raises(DomainError):  # second expert loses the race cleanly
        services.accept_invitation(e2, inv2)
    inv2.refresh_from_db()
    assert inv2.status == PoolInvitation.Status.DECLINED  # siblings closed
    assert Order.objects.filter(request=managed_request).count() == 1  # never two orders


def test_pool_decline_and_expiry(admin, managed_request, django_user_model):
    e1 = make_expert(django_user_model, "pd1@demo.local", "PD One")
    (invitation,) = services.approve_pool(
        admin, _assert_in_review(managed_request), expert_ids=[e1.pk], quote_amount=7000
    )
    services.decline_invitation(e1, invitation, reason="booked")
    invitation.refresh_from_db()
    assert invitation.status == PoolInvitation.Status.DECLINED

    # a stale pending invitation (48h passed) is expired by the scheduled task
    e2 = make_expert(django_user_model, "pd2@demo.local", "PD Two")
    PoolInvitation.objects.create(
        request=managed_request, expert=e2, expires_at=timezone.now() - timedelta(hours=1)
    )
    assert services.expire_due() >= 1
    assert PoolInvitation.objects.filter(expert=e2, status=PoolInvitation.Status.EXPIRED).exists()


def test_direct_assignment_flow(admin, managed_request, django_user_model, student):
    expert = make_expert(django_user_model, "direct@demo.local", "Direct Expert")
    _assert_in_review(managed_request)

    with pytest.raises(PermissionDeniedError):
        services.assign_direct(student, managed_request, expert=expert, amount=8000)  # non-staff

    assignment = services.assign_direct(
        admin, managed_request, expert=expert, amount=12000, scope_note="Weekly sessions, 6 weeks"
    )
    assert assignment.status == DirectAssignment.Status.PENDING
    managed_request.refresh_from_db()
    assert managed_request.quote_amount == 12000  # student sees the quote (BR-22)

    # only the assigned expert can respond
    stranger = make_expert(django_user_model, "direct-x@demo.local", "Stranger Expert")
    with pytest.raises(PermissionDeniedError):
        services.accept_direct(stranger, assignment)

    assignment, order = services.accept_direct(expert, assignment)
    assert order.source == Order.Source.MANAGED_DIRECT
    assert order.amount == 12000
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.MATCHED
    assert Order.objects.filter(request=managed_request).count() == 1
    assert AuditEvent.objects.filter(action="assignment.direct_accept").exists()


def test_direct_decline_then_reassign_via_supersede(admin, managed_request, django_user_model):
    expert = make_expert(django_user_model, "decliner@demo.local", "Decliner")
    assignment = services.assign_direct(
        admin, _assert_in_review(managed_request), expert=expert, amount=6000
    )

    services.decline_direct(expert, assignment, reason="timeline too tight")
    assignment.refresh_from_db()
    assert assignment.status == DirectAssignment.Status.DECLINED
    managed_request.refresh_from_db()
    assert managed_request.status == ServiceRequest.Status.IN_REVIEW  # back with the owner (BR-21)

    replacement = make_expert(django_user_model, "replacement@demo.local", "Replacement")
    first = services.assign_direct(admin, managed_request, expert=replacement, amount=7500)
    stale = services.assign_direct(admin, managed_request, expert=expert, amount=7500)
    services.supersede_direct(admin, stale)
    stale.refresh_from_db()
    assert stale.status == DirectAssignment.Status.SUPERSEDED
    assert first.status == DirectAssignment.Status.PENDING
    assert AuditEvent.objects.filter(action="assignment.direct_supersede").exists()


def test_suspended_expert_cannot_be_assigned_or_respond(admin, managed_request, django_user_model):
    from apps.experts.services import suspend

    expert = make_expert(django_user_model, "susp-m@demo.local", "Susp M")
    with pytest.raises(PermissionDeniedError):  # cannot be assigned while suspended
        assignment = None
        suspend(expert.expert_application.pk, reviewer=admin, reason="demo")
        services.assign_direct(admin, managed_request, expert=expert, amount=6000)
    # a pending assignment becomes unresponsive after suspension
    active = make_expert(django_user_model, "susp-m2@demo.local", "Susp M2")
    assignment = services.assign_direct(admin, managed_request, expert=active, amount=6000)
    suspend(active.expert_application.pk, reviewer=admin, reason="demo")
    with pytest.raises(PermissionDeniedError):
        services.accept_direct(active, assignment)


def test_double_accept_direct_is_impossible(admin, managed_request, django_user_model):
    expert = make_expert(django_user_model, "double@demo.local", "Double")
    assignment = services.assign_direct(
        admin, _assert_in_review(managed_request), expert=expert, amount=8000
    )
    services.accept_direct(expert, assignment)
    with pytest.raises(DomainError):
        services.accept_direct(expert, assignment)  # second accept → locked


def test_invalid_state_transitions(admin, managed_request):
    with pytest.raises(DomainError):
        request_services.transition(managed_request, ServiceRequest.Status.COMPLETED)
    services.reject_managed(admin, managed_request, reason="no")
    with pytest.raises(DomainError):
        services.approve_pool(admin, managed_request, quote_amount=5000)  # rejected is terminal


def test_open_mode_requests_reject_managed_routing(admin, student):
    subject = ensure_term(kind="subject", name="OpenSub")[0]
    open_request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Open req",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 5000,
        },
    )
    request_services.publish(student, open_request, attested=True)
    with pytest.raises(DomainError):
        services.approve_pool(admin, open_request, quote_amount=5000)  # not managed


# --- expert API surface -------------------------------------------------------


def test_assignment_api_flow(client, admin, managed_request, django_user_model):
    expert = make_expert(django_user_model, "api-m@demo.local", "Api Managed")
    services.assign_direct(admin, _assert_in_review(managed_request), expert=expert, amount=8800)

    api_login(client, expert)
    results = client.get("/api/v1/me/assignments").json()["results"]
    assert len(results) == 1
    row = results[0]
    assert row["amount_display"] == 88.0
    assert row["status"] == "pending"

    response = client.post(
        f"/api/v1/me/assignments/{row['id']}/accept", "{}", content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["order"]["source"] == "managed_direct"

    # strangers see nothing (ownership enforced at the queryset level)
    other = make_expert(django_user_model, "api-m2@demo.local", "Api M2")
    api_login(client, other)
    assert client.get("/api/v1/me/assignments").json()["results"] == []


def test_invitation_api_flow(client, admin, managed_request, django_user_model):
    expert = make_expert(django_user_model, "api-pool@demo.local", "Api Pool")
    (invitation,) = services.approve_pool(
        admin, _assert_in_review(managed_request), expert_ids=[expert.pk], quote_amount=9500
    )
    api_login(client, expert)
    results = client.get("/api/v1/me/pool-invitations").json()["results"]
    assert len(results) == 1 and results[0]["quote_amount_display"] == 95.0

    response = client.post(
        f"/api/v1/me/pool-invitations/{results[0]['id']}/accept",
        json.dumps({"expected_amount": 9000}),
        content_type="application/json",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["order"]["source"] == "managed_pool"
    invitation.refresh_from_db()
    assert invitation.expected_amount == 9000  # advisory field captured
