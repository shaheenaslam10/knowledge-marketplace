"""Expert onboarding state machine + application/profile services.

ALL lifecycle rules live here (docs/workflows/expert-journey.md, BR-03):
views/serializers/admin actions/tasks call these functions — they never
mutate application state directly. Every staff transition is transactional,
audited (audit sidecar) and emailed (django-q2).
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.services import user_has_role
from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, NotFoundError, PermissionDeniedError
from apps.experts.models import ExpertApplication, ExpertProfile
from apps.experts.tasks import enqueue_expert_email

logger = logging.getLogger(__name__)

# (from, to) → guard passed by the caller. Kept declarative so the matrix in
# docs/workflows/expert-journey.md and this code can't drift apart.
STAFF_TRANSITIONS: dict[tuple[str, str], None] = {
    (ExpertApplication.Status.SUBMITTED, ExpertApplication.Status.UNDER_REVIEW): None,
    (ExpertApplication.Status.UNDER_REVIEW, ExpertApplication.Status.APPROVED): None,
    (ExpertApplication.Status.UNDER_REVIEW, ExpertApplication.Status.REJECTED): None,
    (ExpertApplication.Status.APPROVED, ExpertApplication.Status.SUSPENDED): None,
    (ExpertApplication.Status.SUSPENDED, ExpertApplication.Status.APPROVED): None,
}

USER_EDITABLE_STATUSES = frozenset(
    {
        ExpertApplication.Status.DRAFT,
        ExpertApplication.Status.SUBMITTED,
        ExpertApplication.Status.REJECTED,
    }
)
SUBMITTABLE_FROM = frozenset({ExpertApplication.Status.DRAFT, ExpertApplication.Status.REJECTED})


def get_application_for(user) -> ExpertApplication | None:
    """Own-application lookup (owner-scoped by construction)."""
    return ExpertApplication.objects.filter(pk=user.pk).first()


def require_own_application(user) -> ExpertApplication:
    application = get_application_for(user)
    if application is None:
        raise NotFoundError("You have not started an expert application.", code="no_application")
    return application


def _validate_application_content(application: ExpertApplication) -> None:
    """Submit-time validation — completeness + attestations + ≥1 credential."""
    required = {
        "display_name": application.display_name,
        "headline": application.headline,
        "bio": application.bio,
        "expertise_summary": application.expertise_summary,
    }
    missing = [field for field, value in required.items() if not (value or "").strip()]
    if missing:
        raise DomainError(
            "Missing required application fields.",
            code="application_incomplete",
            details={"fields": missing},
        )
    if not application.certified_18_plus:
        raise DomainError("You must confirm you are 18 or older.", code="attestation_required")
    if not application.integrity_acknowledged:
        raise DomainError(
            "You must acknowledge the tutor guidelines (academic-integrity policy).",
            code="attestation_required",
        )
    if not application.credentials.exists():
        raise DomainError(
            "At least one supporting credential document is required.",
            code="credential_required",
        )
    if not user_has_role(application.user, "verified"):
        raise DomainError(
            "Verify your email address before submitting.", code="verification_required"
        )


@transaction.atomic
def apply(user, *, data: dict, credential_attachments: list | None = None) -> ExpertApplication:
    """Start (or restart after rejection) an application in `draft`."""
    if ExpertApplication.objects.filter(pk=user.pk).exists():
        raise DomainError(
            "You already have an expert application.", code="application_exists", status_code=409
        )
    application = ExpertApplication(user=user, **data)
    application.full_clean()
    application.save()
    if credential_attachments:
        application.credentials.set(credential_attachments)
    logger.info("expert application drafted user_id=%s", user.pk)
    return application


@transaction.atomic
def update_application(
    user, *, fields: dict, credential_attachments: list | None = None
) -> ExpertApplication:
    """Applicant edit — only in draft/submitted/rejected (BR-03: editable until
    review starts; rejected applications are edited then resubmitted)."""
    application = require_own_application(user)
    if application.status not in USER_EDITABLE_STATUSES:
        raise DomainError(
            "This application is locked while under review or approved.",
            code="application_locked",
        )
    allowed = {
        "display_name",
        "headline",
        "bio",
        "expertise_summary",
        "experience_years",
        "qualifications",
        "languages",
        "timezone",
        "availability_note",
        "certified_18_plus",
        "integrity_acknowledged",
    }
    for key, value in fields.items():
        if key in allowed:
            setattr(application, key, value)
    application.full_clean()
    application.save()
    if credential_attachments:
        application.credentials.add(*credential_attachments)
    return application


@transaction.atomic
def submit_application(user, *, request=None) -> ExpertApplication:
    """draft/rejected → submitted. Runs full validation first."""
    application = require_own_application(user)
    if application.status not in SUBMITTABLE_FROM:
        raise DomainError(
            "This application cannot be submitted right now.", code="invalid_transition"
        )
    _validate_application_content(application)
    resubmission = application.status == ExpertApplication.Status.REJECTED
    application.status = ExpertApplication.Status.SUBMITTED
    application.submitted_at = timezone.now()
    application.rejection_reason = ""
    if resubmission:
        application.resubmission_count += 1
    application.save(
        update_fields=[
            "status",
            "submitted_at",
            "rejection_reason",
            "resubmission_count",
            "updated_at",
        ]
    )
    audit_log(
        user,
        action="experts.application_submitted",
        obj=application,
        detail={"resubmission": resubmission},
        request=request,
    )
    enqueue_expert_email("apps.experts.tasks.send_application_received_email", user.pk)
    return application


def _staff_transition(
    application_id: int,
    *,
    to_status: str,
    reviewer,
    note: str = "",
    request=None,
) -> ExpertApplication:
    if not reviewer.is_staff:
        raise PermissionDeniedError("Only authorized staff can review expert applications.")
    application = ExpertApplication.objects.select_for_update().filter(pk=application_id).first()
    if application is None:
        raise NotFoundError("Expert application not found.")
    if (application.status, to_status) not in STAFF_TRANSITIONS:
        raise DomainError(
            f"Cannot move an application from '{application.status}' to '{to_status}'.",
            code="invalid_transition",
        )
    application.status = to_status
    application.reviewed_by = reviewer
    application.review_note = note or application.review_note
    application.reviewed_at = timezone.now()
    application.save(
        update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "updated_at"]
    )
    return application


@transaction.atomic
def start_review(application_id: int, *, reviewer, request=None) -> ExpertApplication:
    application = _staff_transition(
        application_id,
        to_status=ExpertApplication.Status.UNDER_REVIEW,
        reviewer=reviewer,
        request=request,
    )
    audit_log(reviewer, action="experts.review_started", obj=application, request=request)
    return application


@transaction.atomic
def approve(application_id: int, *, reviewer, note: str = "", request=None) -> ExpertApplication:
    """under_review → approved: creates/activates the public ExpertProfile."""
    application = _staff_transition(
        application_id,
        to_status=ExpertApplication.Status.APPROVED,
        reviewer=reviewer,
        note=note,
        request=request,
    )
    profile, created = _upsert_profile_from_application(application)
    audit_log(
        reviewer,
        action="experts.approved",
        obj=application,
        detail={"profile_created": created, "slug": profile.slug},
        request=request,
    )
    enqueue_expert_email(
        "apps.experts.tasks.send_decision_email", user_id=application.pk, decision="approved"
    )
    return application


@transaction.atomic
def reject(
    application_id: int, *, reviewer, reason: str, note: str = "", request=None
) -> ExpertApplication:
    if not (reason or "").strip():
        raise DomainError("A rejection reason is required.", code="rejection_reason_required")
    application = _staff_transition(
        application_id,
        to_status=ExpertApplication.Status.REJECTED,
        reviewer=reviewer,
        note=note,
        request=request,
    )
    application.rejection_reason = reason.strip()[:500]
    application.save(update_fields=["rejection_reason", "updated_at"])
    audit_log(
        reviewer,
        action="experts.rejected",
        obj=application,
        detail={"reason": application.rejection_reason},
        request=request,
    )
    enqueue_expert_email(
        "apps.experts.tasks.send_decision_email", user_id=application.pk, decision="rejected"
    )
    return application


@transaction.atomic
def suspend(application_id: int, *, reviewer, reason: str, request=None) -> ExpertApplication:
    """approved → suspended: hides expert surfaces, keeps student access (BR-04)."""
    application = _staff_transition(
        application_id,
        to_status=ExpertApplication.Status.SUSPENDED,
        reviewer=reviewer,
        note=reason,
        request=request,
    )
    audit_log(
        reviewer,
        action="experts.suspended",
        obj=application,
        detail={"reason": reason},
        request=request,
    )
    enqueue_expert_email(
        "apps.experts.tasks.send_decision_email", user_id=application.pk, decision="suspended"
    )
    return application


@transaction.atomic
def reinstate(application_id: int, *, reviewer, request=None) -> ExpertApplication:
    application = _staff_transition(
        application_id,
        to_status=ExpertApplication.Status.APPROVED,
        reviewer=reviewer,
        request=request,
    )
    _upsert_profile_from_application(application)
    audit_log(reviewer, action="experts.reinstated", obj=application, request=request)
    enqueue_expert_email(
        "apps.experts.tasks.send_decision_email", user_id=application.pk, decision="reinstated"
    )
    return application


def _upsert_profile_from_application(application: ExpertApplication) -> tuple[ExpertProfile, bool]:
    """Create on first approval; refresh editable fields on (re)instatement."""
    profile = ExpertProfile.objects.filter(pk=application.pk).first()
    created = profile is None
    if created:
        profile = ExpertProfile(user=application.user)
    profile.display_name = application.display_name
    profile.headline = application.headline
    profile.bio = application.bio
    profile.expertise_summary = application.expertise_summary
    profile.experience_years = application.experience_years
    profile.qualifications = application.qualifications
    profile.languages = application.languages
    profile.timezone = application.timezone
    profile.approved_at = profile.approved_at or application.reviewed_at
    if not profile.slug:
        profile.slug = _unique_expert_slug(profile.display_name, exclude_pk=profile.pk)
    profile.save()
    if created or not profile.subjects.exists():
        profile.subjects.set(application.subjects.all())
    profile.skills.set(application.skills.all())
    return profile, created


def _unique_expert_slug(display_name: str, *, exclude_pk=None) -> str:
    base = slugify(display_name)[:160] or "expert"
    candidate, n = base, 2
    qs = ExpertProfile.objects.filter(slug=candidate)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    while qs.exists():
        candidate = f"{base}-{n}"
        n += 1
        qs = ExpertProfile.objects.filter(slug=candidate)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
    return candidate


@transaction.atomic
def update_expert_profile(user, *, fields: dict) -> ExpertProfile:
    """Owner-scoped profile edit. Availability pause is instant (BR-04)."""
    profile = ExpertProfile.objects.filter(pk=user.pk).first()
    if profile is None:
        raise NotFoundError(
            "No expert profile yet — your application must be approved first.", code="no_profile"
        )
    allowed = {
        "display_name",
        "headline",
        "bio",
        "expertise_summary",
        "experience_years",
        "qualifications",
        "languages",
        "timezone",
        "availability",
        "is_public",
    }
    for key, value in fields.items():
        if key in allowed:
            setattr(profile, key, value)
    profile.full_clean()
    profile.save()
    audit_log(user, action="experts.profile_updated", obj=profile)
    return profile


# --- directory selectors (public read models; NEVER private fields) ---------
def directory_queryset() -> QuerySet[ExpertProfile]:
    """Public directory base queryset: approved + not suspended + opted-in.

    Suspended experts drop out because their application status is no longer
    `approved` — one source of truth for the role, the directory and the API.
    """
    return (
        ExpertProfile.objects.filter(
            is_public=True,
            user__expert_application__status=ExpertApplication.Status.APPROVED,
            user__is_active=True,
        )
        .select_related("user")
        .prefetch_related("subjects", "skills")
    )


def get_public_expert(slug: str) -> ExpertProfile:
    profile = directory_queryset().filter(slug=slug).first()
    if profile is None:
        raise NotFoundError("Expert profile not found.", code="expert_not_found")
    return profile


def application_decision_age(application: ExpertApplication) -> timedelta | None:
    """How long since the last review decision (admin SLA bookkeeping)."""
    return timezone.now() - application.reviewed_at if application.reviewed_at else None


def require_own_profile(user) -> ExpertProfile:
    """Owner-scoped profile lookup for /me/expert-profile."""
    profile = ExpertProfile.objects.filter(pk=user.pk).first()
    if profile is None:
        raise NotFoundError(
            "No expert profile yet — your application must be approved first.", code="no_profile"
        )
    return profile
