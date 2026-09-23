"""Expert lifecycle state machine + role wiring (services layer)."""

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.services import get_roles
from apps.audit.models import AuditEvent
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.models import ExpertApplication, ExpertProfile
from apps.experts.services import (
    apply,
    approve,
    directory_queryset,
    reinstate,
    reject,
    start_review,
    submit_application,
    suspend,
    update_application,
)

pytestmark = pytest.mark.django_db

PNG = SimpleUploadedFile("cert.png", b"\x89PNG\r\n\x1a\n" + b"x" * 32)

APPLICATION_DATA = {
    "display_name": "Ayra K.",
    "headline": "Python tutor",
    "bio": "Guided tutoring: you do the work, I coach it. Never ghostwriting.",
    "expertise_summary": "Python, statistics",
    "experience_years": 5,
    "qualifications": "MSc Statistics",
    "languages": "English",
    "timezone": "UTC",
    "availability_note": "Evenings",
    "certified_18_plus": True,
    "integrity_acknowledged": True,
}


@pytest.fixture
def applicant(django_user_model):
    user = django_user_model.objects.create_user(
        email="apply@demo.local", password="long-pass-123", name="A"
    )
    user.mark_email_verified()  # submit requires a verified email (BR-01)
    return user


@pytest.fixture
def reviewer(django_user_model):
    return django_user_model.objects.create_user(
        email="admin@demo.local",
        password="long-pass-123",
        name="Admin",
        is_staff=True,
        is_superuser=True,
    )


def prepare(application, credential=True):
    from apps.files.services import store_upload

    if credential:
        attachment, _ = store_upload(application.user, purpose="credential", uploaded_file=PNG)
        application.credentials.add(attachment)
    application.save()


def full_lifecycle_happy_path(applicant, reviewer):
    application = apply(applicant, data=dict(APPLICATION_DATA))
    assert application.status == ExpertApplication.Status.DRAFT

    with pytest.raises(DomainError) as err:  # incomplete: no credential yet
        submit_application(applicant)
    assert err.value.code == "credential_required"

    prepare(application)
    application = submit_application(applicant)
    assert application.status == ExpertApplication.Status.SUBMITTED
    assert len(mail.outbox) == 1 and "received" in mail.outbox[0].subject.lower()

    application = start_review(application.pk, reviewer=reviewer)
    assert application.status == ExpertApplication.Status.UNDER_REVIEW

    with pytest.raises(DomainError):  # locked for applicant edits while under review
        update_application(applicant, fields={"headline": "new"})

    application = approve(application.pk, reviewer=reviewer, note="ok")
    assert application.status == ExpertApplication.Status.APPROVED
    profile = ExpertProfile.objects.get(pk=applicant.pk)
    assert profile.slug == "ayra-k"
    assert profile.approved_at is not None
    assert get_roles(applicant)["expert"] is True
    assert AuditEvent.objects.filter(action="experts.approved").exists()

    # suspended: hides from role + directory, keeps student access (BR-04)
    application = suspend(application.pk, reviewer=reviewer, reason="demo")
    assert application.status == ExpertApplication.Status.SUSPENDED
    assert get_roles(applicant)["expert"] is False
    assert get_roles(applicant)["student"] is True
    assert not directory_queryset().filter(pk=applicant.pk).exists()

    application = reinstate(application.pk, reviewer=reviewer)
    assert application.status == ExpertApplication.Status.APPROVED
    assert get_roles(applicant)["expert"] is True
    return application


def test_full_lifecycle(applicant, reviewer):
    full_lifecycle_happy_path(applicant, reviewer)


def test_reject_and_resubmit_cycle(applicant, reviewer):
    application = apply(applicant, data=dict(APPLICATION_DATA))
    prepare(application)
    submit_application(applicant)
    start_review(application.pk, reviewer=reviewer)

    with pytest.raises(DomainError):
        reject(application.pk, reviewer=reviewer, reason="   ")  # reason required

    application = reject(application.pk, reviewer=reviewer, reason="Add a verifiable credential.")
    assert application.status == ExpertApplication.Status.REJECTED
    assert "verifiable" in application.rejection_reason
    assert get_roles(applicant)["expert"] is False

    # resubmit: rejected → submitted (validation runs again)
    application = submit_application(applicant)
    assert application.status == ExpertApplication.Status.SUBMITTED
    assert application.resubmission_count == 1


def test_invalid_transitions_are_refused(applicant, reviewer):
    application = apply(applicant, data=dict(APPLICATION_DATA))
    prepare(application)
    application = submit_application(applicant)
    # submitted → approved skips under_review: refused
    with pytest.raises(DomainError) as err:
        approve(application.pk, reviewer=reviewer)
    assert err.value.code == "invalid_transition"
    # one application per user
    with pytest.raises(DomainError) as err:
        apply(applicant, data=dict(APPLICATION_DATA))
    assert err.value.code == "application_exists"


def test_non_staff_cannot_transition(applicant, reviewer, django_user_model):
    stranger = django_user_model.objects.create_user(
        email="x@demo.local", password="long-pass-123", name="X"
    )
    application = apply(applicant, data=dict(APPLICATION_DATA))
    prepare(application)
    submit_application(applicant)
    with pytest.raises(PermissionDeniedError):
        start_review(application.pk, reviewer=stranger)
    with pytest.raises(PermissionDeniedError):
        suspend(application.pk, reviewer=stranger, reason="nope")


def test_submit_requires_attestations_and_verified_email(applicant, reviewer):
    data = dict(APPLICATION_DATA)
    data["certified_18_plus"] = False
    application = apply(applicant, data=data)
    prepare(application)
    with pytest.raises(DomainError) as err:
        submit_application(applicant)
    assert err.value.code == "attestation_required"

    # flip both fields via update, then unverify email
    update_application(
        applicant, fields={"certified_18_plus": True, "integrity_acknowledged": False}
    )
    with pytest.raises(DomainError):
        submit_application(applicant)
    update_application(applicant, fields={"integrity_acknowledged": True})
    applicant.email_verified_at = None
    applicant.save(update_fields=["email_verified_at"])
    with pytest.raises(DomainError) as err:
        submit_application(applicant)
    assert err.value.code == "verification_required"


def test_slug_uniqueness(django_user_model, reviewer):
    u1 = django_user_model.objects.create_user(
        email="s1@demo.local", password="long-pass-123", name="S"
    )
    u2 = django_user_model.objects.create_user(
        email="s2@demo.local", password="long-pass-123", name="S"
    )
    for user in (u1, u2):
        user.mark_email_verified()
        application = apply(user, data=dict(APPLICATION_DATA))
        prepare(application)
        submit_application(user)
        start_review(application.pk, reviewer=reviewer)
        approve(application.pk, reviewer=reviewer)
    slugs = list(ExpertProfile.objects.values_list("slug", flat=True))
    assert len(slugs) == 2 and len(set(slugs)) == 2 and slugs[1].startswith("ayra-k-")


def test_email_decision_delivered(applicant, reviewer):
    full_lifecycle_happy_path(applicant, reviewer)
    subjects = " ".join(m.subject for m in mail.outbox)
    assert "approved" in subjects.lower()
