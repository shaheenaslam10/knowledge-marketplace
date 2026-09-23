"""ServiceRequest lifecycle + visibility services (docs/workflows/open-marketplace.md).

State machine (open mode; managed states reserved, Phase 6+):
    draft -> open -> matched -> in_progress -> completed
    draft|open|matched|in_progress -> cancelled
    open -> expired -> open (once, BR-08)
All transitions go through `transition()`; views/tasks never assign status.
"""

from __future__ import annotations

import uuid as uuid_lib
from datetime import date, timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.models import ExpertApplication, ExpertProfile
from apps.experts.roles import is_expert
from apps.files.models import Attachment
from apps.service_requests.models import ServiceRequest

REQUEST_TTL_DAYS = 30  # BR-08 (PlatformConfig replaces module constants in the payments phase)
INTEGRITY_POLICY_VERSION = "2026-09"

TRANSITIONS: dict[tuple[str, str], str] = {
    ("draft", "open"): "publish",
    ("draft", "cancelled"): "cancel",
    ("open", "matched"): "select_offer",
    ("open", "cancelled"): "cancel",
    ("open", "expired"): "expire",
    ("expired", "open"): "reopen",
    ("matched", "in_progress"): "order_paid",
    ("matched", "cancelled"): "cancel",
    ("in_progress", "completed"): "order_completed",
    ("in_progress", "cancelled"): "cancel",
}


def transition(
    request: ServiceRequest, to_status: str, *, actor=None, reason: str = ""
) -> ServiceRequest:
    action = TRANSITIONS.get((request.status, to_status))
    if action is None:
        raise DomainError(
            f"Cannot move a request from '{request.status}' to '{to_status}'.",
            code="invalid_transition",
        )
    request.status = to_status
    if to_status == ServiceRequest.Status.CANCELLED:
        request.closed_reason = reason[:200]
    request.save(update_fields=["status", "closed_reason", "updated_at"])
    audit_log(actor, action=action, obj=request, detail={"to": to_status})
    return request


def _clean_budget(payload: dict[str, Any]) -> None:
    bmin, bmax = payload.get("budget_min"), payload.get("budget_max")
    if (bmin is not None and bmin <= 0) or (bmax is not None and bmax <= 0):
        raise DomainError("Budget must be positive.", code="validation_error")
    if bmin is not None and bmax is not None and bmin > bmax:
        raise DomainError("budget_min cannot exceed budget_max.", code="validation_error")


def _clean_taxonomy(payload: dict[str, Any], skill_ids: list[int] | None) -> None:
    from apps.taxonomy.models import TaxonomyTerm

    subject = payload.get("subject")
    if subject is not None and not isinstance(subject, TaxonomyTerm):
        try:  # API payloads arrive with a taxonomy id, services speak instances
            subject = TaxonomyTerm.objects.get(pk=int(subject))
            payload["subject"] = subject
        except (TaxonomyTerm.DoesNotExist, TypeError, ValueError):
            raise DomainError("Unknown subject.", code="validation_error") from None
    if subject is not None and subject.kind != TaxonomyTerm.Kind.SUBJECT:
        raise DomainError("subject must be a taxonomy subject.", code="validation_error")
    if skill_ids:
        try:
            ids = [int(pk) for pk in skill_ids]
        except (TypeError, ValueError):
            raise DomainError("skill_ids must be taxonomy ids.", code="validation_error") from None
        found = TaxonomyTerm.objects.filter(kind=TaxonomyTerm.Kind.SKILL, pk__in=ids)
        if found.count() != len(set(ids)):
            raise DomainError("Unknown skill in skills list.", code="validation_error")


def _clean_attachments(student, attachment_ids: list[str] | None) -> list[Attachment]:
    if not attachment_ids:
        return []
    try:
        ids = [str(uuid_lib.UUID(str(pk))) for pk in attachment_ids]
    except (TypeError, ValueError, AttributeError):
        raise DomainError("attachment_ids must be upload ids.", code="validation_error") from None
    found = Attachment.objects.filter(pk__in=ids, uploader=student, purpose="request_brief")
    if found.count() != len(set(ids)):
        raise DomainError(
            "Attachments must be your own request_brief uploads.", code="validation_error"
        )
    return list(found)


def _clean_deadline(payload: dict[str, Any]) -> None:
    deadline = payload.get("deadline")
    if isinstance(deadline, str):
        from django.utils.dateparse import parse_date

        parsed = parse_date(deadline)
        if parsed is None:
            raise DomainError("deadline must be YYYY-MM-DD.", code="validation_error")
        payload["deadline"] = parsed
        deadline = parsed
    if deadline is not None and deadline < date.today():
        raise DomainError("Deadline cannot be in the past.", code="validation_error")


def create_request(
    student, *, payload: dict[str, Any], skill_ids=None, attachment_ids=None
) -> ServiceRequest:
    """Always creates a DRAFT; publication is an explicit, attested step (BR-10)."""
    _clean_budget(payload)
    _clean_deadline(payload)
    _clean_taxonomy(payload, skill_ids)
    with transaction.atomic():
        request = ServiceRequest.objects.create(student=student, **payload)
        if skill_ids:
            request.skills.set(skill_ids)
        request.attachments.set(_clean_attachments(student, attachment_ids))
    return request


def update_draft(
    owner, request: ServiceRequest, *, payload: dict[str, Any], skill_ids=None, attachment_ids=None
) -> ServiceRequest:
    if request.student_id != owner.id:
        raise PermissionDeniedError("You can only edit your own requests.")
    if request.status != ServiceRequest.Status.DRAFT:
        raise DomainError("Only draft requests can be edited.", code="request_locked")
    _clean_budget(payload)
    _clean_deadline(payload)
    _clean_taxonomy(payload, skill_ids)
    with transaction.atomic():
        for field, value in payload.items():
            setattr(request, field, value)
        request.save()
        if skill_ids is not None:
            request.skills.set(skill_ids)
        if attachment_ids is not None:
            request.attachments.set(_clean_attachments(owner, attachment_ids))
    return request


def publish(owner, request: ServiceRequest, *, attested: bool) -> ServiceRequest:
    if request.student_id != owner.id:
        raise PermissionDeniedError("You can only publish your own requests.")
    if not attested:
        raise DomainError(
            "You must attest to the academic-integrity policy (BR-10).", code="attestation_required"
        )
    missing = [
        field
        for field in ("title", "description", "subject", "budget_max")
        if not getattr(request, field)
    ]
    if missing:
        raise DomainError(
            f"Complete the request before publishing: {', '.join(missing)}.",
            code="validation_error",
        )
    request.integrity_attested_at = timezone.now()
    request.integrity_policy_version = INTEGRITY_POLICY_VERSION
    request.expires_at = timezone.now() + timedelta(days=REQUEST_TTL_DAYS)
    request.save(
        update_fields=[
            "integrity_attested_at",
            "integrity_policy_version",
            "expires_at",
            "updated_at",
        ]
    )
    transition(request, ServiceRequest.Status.OPEN, actor=owner)
    return request


def cancel(owner, request: ServiceRequest, *, reason: str = "") -> ServiceRequest:
    if request.student_id != owner.id:
        raise PermissionDeniedError("You can only cancel your own requests.")
    return transition(request, ServiceRequest.Status.CANCELLED, actor=owner, reason=reason)


@transaction.atomic
def reopen(owner, request: ServiceRequest) -> ServiceRequest:
    if request.student_id != owner.id:
        raise PermissionDeniedError("You can only re-open your own requests.")
    if request.reopened_at is not None:
        raise DomainError(
            "A request can be re-opened only once (BR-08).", code="invalid_transition"
        )
    transition(request, ServiceRequest.Status.OPEN, actor=owner)  # validates EXPIRED→OPEN first
    request.reopened_at = timezone.now()
    request.expires_at = timezone.now() + timedelta(days=REQUEST_TTL_DAYS)
    request.save(update_fields=["reopened_at", "expires_at", "updated_at"])
    return request


def mark_matched(request: ServiceRequest, *, actor=None) -> ServiceRequest:
    """Called by bidding.accept inside its transaction (offer selection)."""
    return transition(request, ServiceRequest.Status.MATCHED, actor=actor)


def expire_due(now=None) -> int:
    """Bulk-expire open requests past their TTL (BR-08). Returns count."""
    now = now or timezone.now()
    stale = ServiceRequest.objects.filter(status=ServiceRequest.Status.OPEN, expires_at__lte=now)
    count = stale.update(status=ServiceRequest.Status.EXPIRED, closed_reason="TTL expired")
    if count:
        audit_log(None, action="requests.bulk_expire", detail={"count": count})
    return count


def visible_queryset(user):
    """Expert feed: open-mode, still-open requests only (BR-05/BR-07)."""
    now = timezone.now()
    return ServiceRequest.objects.filter(
        mode=ServiceRequest.Mode.OPEN,
        status=ServiceRequest.Status.OPEN,
        expires_at__gt=now,
    ).exclude(student_id=user.id)


def expert_is_eligible(user) -> bool:
    """Approved + active + not suspended + accepting new work (BR-05/BR-07)."""
    return (
        is_expert(user)
        and ExpertProfile.objects.filter(
            pk=user.id,
            availability=ExpertProfile.Availability.AVAILABLE,
        ).exists()
        and ExpertApplication.objects.filter(
            pk=user.pk, status=ExpertApplication.Status.APPROVED
        ).exists()
    )


def user_can_view(user, request: ServiceRequest) -> bool:
    """Owner always; staff sees all; eligible experts see open requests; the
    selected expert keeps access after matching. Never guests (BR-05)."""
    if not user.is_authenticated:
        return False
    if request.student_id == user.id or user.is_staff:
        return True
    if not expert_is_eligible(user):
        return False
    if request.student_id == user.id:
        return True
    if request.is_open_for_offers and request.mode == ServiceRequest.Mode.OPEN:
        return True
    # Selected expert retains visibility of the request they matched.
    return user.offers.filter(request_id=request.id, status="accepted").exists()
