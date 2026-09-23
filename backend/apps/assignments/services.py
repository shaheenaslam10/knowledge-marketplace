"""Assignment lifecycle — owner triage + expert responses (managed-service.md).

Owner (staff-only, Django admin is the surface — ADR-0010):
    approve_pool      in_review -> pooled (+ invitations to a selected pool
                      of eligible experts; default = subject-matched experts)
    assign_direct     creates DirectAssignment(pending, 24h) + sets the quote
    supersede_direct  pending -> superseded (reassignment, BR-21)
    reject_managed    in_review|pooled -> rejected (reason, no charge ever)
Expert (server-side eligibility at send AND respond):
    accept/decline invitation (first-accept WINS -> Order source=managed_pool)
    accept/decline direct assignment           (-> Order source=managed_direct)
Everything is audited; students can never touch routing fields.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.assignments.models import DirectAssignment, PoolInvitation
from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.orders.services import create_order_for_request
from apps.payments.config import MIN_OFFER_MINOR
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest

POOL_TTL_HOURS = 48
DIRECT_TTL_HOURS = 24
TRIAGE_SLA_HOURS = 24  # BR-19 (operational flag for the admin listing)


def _staff_guard(actor) -> None:
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only operations staff can triage managed requests.")


def _expert_guard(expert) -> None:
    if not request_services.expert_is_eligible(expert):
        raise PermissionDeniedError("Only approved, available experts can respond to assignments.")


def _managed_request_guard(request: ServiceRequest) -> None:
    if request.mode != ServiceRequest.Mode.MANAGED:
        raise DomainError("This request is not in managed mode.", code="not_managed")


def _matched_guard(request: ServiceRequest) -> None:
    """A request can converge into at most one order."""
    if (
        request.status != ServiceRequest.Status.IN_REVIEW
        and request.status != ServiceRequest.Status.POOLED
    ):
        raise DomainError("This request has already been routed or matched.", code="request_closed")
    if request.orders.exists():
        raise DomainError("An order already exists for this request.", code="request_closed")


# --- owner triage -------------------------------------------------------------


@transaction.atomic
def approve_pool(
    admin,
    request: ServiceRequest,
    *,
    expert_ids: list[int] | None = None,
    quote_amount: int | None = None,
) -> list[PoolInvitation]:
    """request -> pooled; invitations for the selected pool (default: eligible
    experts matching the request subject)."""
    _staff_guard(admin)
    _managed_request_guard(request)
    if request.status != ServiceRequest.Status.IN_REVIEW:
        raise DomainError(
            "Only in-review requests can be approved for pooling.", code="invalid_transition"
        )
    if quote_amount is not None:
        if quote_amount < MIN_OFFER_MINOR:
            raise DomainError("Quote is below the platform minimum.", code="offer_too_low")
        request.quote_amount = quote_amount  # BR-22: student sees the quote before any charge
    if request.quote_amount is None:
        raise DomainError("Set a quote (quote_amount) before pooling.", code="quote_required")
    request.save(
        update_fields=["quote_amount", "updated_at"]
    )  # BR-22: persisted before invitations
    request_services.transition(request, ServiceRequest.Status.POOLED, actor=admin)

    candidates = _pool_candidates(request, expert_ids)
    if not candidates:
        raise DomainError("No eligible experts match this request's subject.", code="empty_pool")
    now = timezone.now()
    invitations = PoolInvitation.objects.bulk_create(
        PoolInvitation(
            request=request,
            expert=expert,
            expires_at=now + timedelta(hours=POOL_TTL_HOURS),
            invited_by=admin,
        )
        for expert in candidates
    )
    audit_log(
        admin, action="assignment.pool_approve", obj=request, detail={"invited": len(invitations)}
    )
    _notify_pool(invitations)
    return invitations


def _pool_candidates(request: ServiceRequest, expert_ids: list[int] | None):
    from apps.experts.models import ExpertApplication, ExpertProfile

    approved = ExpertApplication.objects.filter(status=ExpertApplication.Status.APPROVED).values(
        "pk"
    )
    qs = ExpertProfile.objects.filter(
        availability=ExpertProfile.Availability.AVAILABLE,
        pk__in=approved,  # application pk == user pk == profile pk
    )
    if expert_ids:
        qs = qs.filter(pk__in=expert_ids)
    elif request.subject_id:
        qs = qs.filter(subjects=request.subject)
    return [profile.user for profile in qs]  # invitations reference users


@transaction.atomic
def assign_direct(
    admin, request: ServiceRequest, *, expert, amount: int, deadline=None, scope_note: str = ""
) -> DirectAssignment:
    _staff_guard(admin)
    _managed_request_guard(request)
    if request.status not in (ServiceRequest.Status.IN_REVIEW, ServiceRequest.Status.POOLED):
        raise DomainError("This request is not awaiting assignment.", code="invalid_transition")
    _expert_guard(expert)  # suspended/inactive experts can never be assigned
    if amount < MIN_OFFER_MINOR:
        raise DomainError("Quote is below the platform minimum.", code="offer_too_low")
    if DirectAssignment.objects.filter(
        request=request, expert=expert, status=DirectAssignment.Status.PENDING
    ).exists():
        raise DomainError(
            "This expert already has a pending assignment for the request.",
            code="assignment_exists",
        )
    request.quote_amount = amount  # BR-22: student sees the final proposed price
    request.save(update_fields=["quote_amount", "updated_at"])
    assignment = DirectAssignment.objects.create(
        request=request,
        expert=expert,
        expert_name=getattr(expert, "expert_profile", None).display_name
        if getattr(expert, "expert_profile", None)
        else f"user:{expert.pk}",
        amount=amount,
        currency=request.currency,
        deadline=deadline or request.deadline,
        scope_note=scope_note[:500],
        expires_at=timezone.now() + timedelta(hours=DIRECT_TTL_HOURS),
        decided_by_admin=admin,
    )
    audit_log(admin, action="assignment.direct_create", obj=assignment, detail={"amount": amount})
    _notify_direct(assignment)
    return assignment


@transaction.atomic
def supersede_direct(admin, assignment: DirectAssignment) -> DirectAssignment:
    """Reassignment: a pending direct assignment is withdrawn (BR-21)."""
    _staff_guard(admin)
    if assignment.status != DirectAssignment.Status.PENDING:
        raise DomainError("Only pending assignments can be superseded.", code="assignment_locked")
    assignment.status = DirectAssignment.Status.SUPERSEDED
    assignment.responded_at = timezone.now()
    assignment.save(update_fields=["status", "responded_at", "updated_at"])
    audit_log(admin, action="assignment.direct_supersede", obj=assignment)
    return assignment


@transaction.atomic
def reject_managed(admin, request: ServiceRequest, *, reason: str) -> ServiceRequest:
    _staff_guard(admin)
    _managed_request_guard(request)
    if not reason:
        raise DomainError("A rejection reason is required.", code="validation_error")
    request.review_notes = reason[:500]
    request.reviewer = admin
    request.save(update_fields=["review_notes", "reviewer", "updated_at"])
    PoolInvitation.objects.filter(request=request, status=PoolInvitation.Status.PENDING).update(
        status=PoolInvitation.Status.EXPIRED, responded_at=timezone.now()
    )
    return request_services.transition(
        request, ServiceRequest.Status.REJECTED, actor=admin, reason=reason[:200]
    )


@transaction.atomic
def set_quote(
    admin, request: ServiceRequest, *, quote_amount: int | None, review_notes: str | None = None
) -> ServiceRequest:
    """Suggested price guidance — never a charge (BR-22 distinction)."""
    _staff_guard(admin)
    _managed_request_guard(request)
    if quote_amount is not None:
        if quote_amount < MIN_OFFER_MINOR:
            raise DomainError("Quote is below the platform minimum.", code="offer_too_low")
        request.quote_amount = quote_amount
    if review_notes is not None:
        request.review_notes = review_notes[:500]
    request.reviewer = admin
    request.save(update_fields=["quote_amount", "review_notes", "reviewer", "updated_at"])
    audit_log(admin, action="assignment.set_quote", obj=request, detail={"quote": quote_amount})
    return request


# --- expert responses ---------------------------------------------------------


@transaction.atomic
def accept_invitation(
    expert, invitation: PoolInvitation, *, expected_amount: int | None = None
) -> tuple[PoolInvitation, Any]:
    """FIRST ACCEPT WINS: row-lock the invitation and the request; if another
    expert already converged the request, refuse instead of double-matching."""
    _expert_guard(expert)
    if invitation.expert_id != expert.id:
        raise PermissionDeniedError("You can only respond to your own invitations.")
    invitation = PoolInvitation.objects.select_for_update().get(pk=invitation.pk)
    request = ServiceRequest.objects.select_for_update().get(pk=invitation.request_id)
    if (
        invitation.status != PoolInvitation.Status.PENDING
        or invitation.expires_at <= timezone.now()
    ):
        raise DomainError("This invitation is no longer pending.", code="assignment_locked")
    try:
        _matched_guard(request)
    except DomainError as exc:
        raise DomainError(
            "This request was already matched by another expert.", code="request_closed"
        ) from exc

    now = timezone.now()
    invitation.status = PoolInvitation.Status.ACCEPTED
    invitation.expected_amount = expected_amount
    invitation.responded_at = now
    invitation.save(update_fields=["status", "expected_amount", "responded_at", "updated_at"])
    PoolInvitation.objects.filter(request=request, status=PoolInvitation.Status.PENDING).exclude(
        pk=invitation.pk
    ).update(
        status=PoolInvitation.Status.DECLINED,
        responded_at=now,
        decline_reason="Another expert was assigned",
    )
    request_services.mark_matched(request, actor=expert)
    order = create_order_for_request(
        request,
        expert=expert,
        amount=request.quote_amount,  # platform-set price (BR-22)
        currency=request.currency,
        source="managed_pool",
    )
    audit_log(
        expert, action="assignment.pool_accept", obj=invitation, detail={"order": str(order.pk)}
    )
    return invitation, order


@transaction.atomic
def decline_invitation(expert, invitation: PoolInvitation, *, reason: str = "") -> PoolInvitation:
    _expert_guard(expert)
    if invitation.expert_id != expert.id:
        raise PermissionDeniedError("You can only respond to your own invitations.")
    if invitation.status != PoolInvitation.Status.PENDING:
        raise DomainError("This invitation is no longer pending.", code="assignment_locked")
    invitation.status = PoolInvitation.Status.DECLINED
    invitation.decline_reason = reason[:200]
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "decline_reason", "responded_at", "updated_at"])
    audit_log(expert, action="assignment.pool_decline", obj=invitation)
    return invitation


@transaction.atomic
def accept_direct(expert, assignment: DirectAssignment) -> tuple[DirectAssignment, Any]:
    _expert_guard(expert)
    if assignment.expert_id != expert.id:
        raise PermissionDeniedError("You can only respond to your own assignments.")
    assignment = DirectAssignment.objects.select_for_update().get(pk=assignment.pk)
    request = ServiceRequest.objects.select_for_update().get(pk=assignment.request_id)
    if (
        assignment.status != DirectAssignment.Status.PENDING
        or assignment.expires_at <= timezone.now()
    ):
        raise DomainError("This assignment is no longer pending.", code="assignment_locked")
    _matched_guard(request)

    now = timezone.now()
    assignment.status = DirectAssignment.Status.ACCEPTED
    assignment.responded_at = now
    assignment.save(update_fields=["status", "responded_at", "updated_at"])
    request_services.mark_matched(request, actor=expert)
    order = create_order_for_request(
        request,
        expert=expert,
        amount=assignment.amount,
        currency=assignment.currency,
        source="managed_direct",
    )
    audit_log(
        expert, action="assignment.direct_accept", obj=assignment, detail={"order": str(order.pk)}
    )
    return assignment, order


@transaction.atomic
def decline_direct(expert, assignment: DirectAssignment, *, reason: str = "") -> DirectAssignment:
    _expert_guard(expert)
    if assignment.expert_id != expert.id:
        raise PermissionDeniedError("You can only respond to your own assignments.")
    if assignment.status != DirectAssignment.Status.PENDING:
        raise DomainError("This assignment is no longer pending.", code="assignment_locked")
    assignment.status = DirectAssignment.Status.DECLINED
    assignment.decline_reason = reason[:200]
    assignment.responded_at = timezone.now()
    assignment.save(update_fields=["status", "decline_reason", "responded_at", "updated_at"])
    audit_log(expert, action="assignment.direct_decline", obj=assignment)
    return assignment


# --- expiry + notification hooks (django-q2 seams; no Redis) -------------------


def expire_due() -> int:
    now = timezone.now()
    invites = PoolInvitation.objects.filter(
        status=PoolInvitation.Status.PENDING, expires_at__lte=now
    ).update(status=PoolInvitation.Status.EXPIRED, responded_at=now)
    assigns = DirectAssignment.objects.filter(
        status=DirectAssignment.Status.PENDING, expires_at__lte=now
    ).update(status=DirectAssignment.Status.EXPIRED, responded_at=now)
    if invites or assigns:
        audit_log(
            None,
            action="assignment.expire",
            detail={"invitations": invites, "assignments": assigns},
        )
    return invites + assigns


def _notify_pool(invitations: list[PoolInvitation]) -> None:
    from django_q.tasks import async_task

    for invitation in invitations:
        async_task(
            "apps.assignments.tasks.send_invitation_email",
            str(invitation.pk),
            task_name="assignments.email",
        )


def _notify_direct(assignment: DirectAssignment) -> None:
    from django_q.tasks import async_task

    async_task(
        "apps.assignments.tasks.send_assignment_email",
        str(assignment.pk),
        task_name="assignments.email",
    )
