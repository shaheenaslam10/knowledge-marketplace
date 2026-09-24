"""Dispute services (Phase 9, BR-40/41) — window enforcement, the payout
freeze, the state machine, and outcomes that REUSE the Phase 7 payment/
refund/ledger services (no direct ledger writes here, ever).

Concurrency contract: `open_dispute` and `settle_payout` both take
select_for_update on the ORDER row, so dispute-open vs payout-settle serialize.
"""

from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, NotFoundError, PermissionDeniedError

from .models import Dispute

DISPUTE_WINDOW_DAYS = 7  # BR-40: within 7 days after completion
DISPUTABLE_STATUSES = ("active", "delivered", "revision_requested")
MIN_DESCRIPTION = 20

TRANSITIONS: dict[tuple[str, str], str | None] = {
    (Dispute.Status.OPEN, Dispute.Status.UNDER_REVIEW): "disputes.taken",
    (Dispute.Status.OPEN, Dispute.Status.AWAITING_RESPONSE): "disputes.awaiting_response",
    (Dispute.Status.AWAITING_RESPONSE, Dispute.Status.UNDER_REVIEW): "disputes.resumed",
    (Dispute.Status.UNDER_REVIEW, Dispute.Status.RESOLVED): "disputes.resolved",
    (Dispute.Status.RESOLVED, Dispute.Status.CLOSED): "disputes.closed",
}

OPEN_STATUSES = (Dispute.Status.OPEN, Dispute.Status.UNDER_REVIEW, Dispute.Status.AWAITING_RESPONSE)


def get_for_user(dispute_id: str, user) -> Dispute:
    """Participant/staff fetch — the only read path (server-side authz)."""
    dispute = Dispute.objects.select_related("order").filter(pk=dispute_id).first()
    if dispute is None:
        raise NotFoundError("Dispute not found.")
    if not _is_participant(dispute, user) and not getattr(user, "is_staff", False):
        raise PermissionDeniedError("You are not a participant of this dispute.")
    return dispute


def _is_participant(dispute: Dispute, user) -> bool:
    order = dispute.order
    return user is not None and user.id in (order.student_id, order.expert_id)


def _freeze(order, *, frozen: bool) -> None:
    """Single writer of the denormalized flag (caller holds the order lock)."""
    if order.has_open_dispute != frozen:
        order.has_open_dispute = frozen
        order.save(update_fields=["has_open_dispute", "updated_at"])


@transaction.atomic
def open_dispute(
    order, *, actor, reason: str, description: str, evidence_ids: list[str] | None = None
) -> Dispute:
    """BR-40: participant files within the window; freezes payout; order →
    disputed; creates the dispute thread; notifies the counterpart."""
    order = type(order).objects.select_for_update().get(pk=order.pk)
    if actor.id not in (order.student_id, order.expert_id):
        raise PermissionDeniedError("Only the order's participants can open a dispute.")
    if Dispute.objects.filter(order=order).exists():
        raise DomainError("This order already has a dispute.", code="duplicate_dispute")
    now = timezone.now()
    if order.status == "completed":
        if order.completed_at is None or now - order.completed_at > timedelta(
            days=DISPUTE_WINDOW_DAYS
        ):
            raise DomainError(
                "The dispute window closed 7 days after completion (BR-40).",
                code="dispute_window_closed",
            )
    elif order.status not in DISPUTABLE_STATUSES:
        raise DomainError(
            "Disputes open while the order is active, delivered, revision_requested, "
            "or within 7 days after completion (BR-40).",
            code="dispute_window_closed",
        )
    if reason not in Dispute.Reason.values:
        raise DomainError("Unknown dispute reason.", code="validation_error")
    description = (description or "").strip()
    if len(description) < MIN_DESCRIPTION:
        raise DomainError(
            f"Describe the problem in at least {MIN_DESCRIPTION} characters.",
            code="validation_error",
        )

    dispute = Dispute.objects.create(
        order=order,
        opened_by=actor,
        reason=reason,
        description=description,
        prior_order_status=order.status,
    )
    if evidence_ids:
        from apps.files.models import Attachment
        from apps.files.services import grant_download

        evidence = []
        for attachment_id in evidence_ids:
            attachment = Attachment.objects.filter(pk=attachment_id).first()
            if attachment is None or attachment.purpose != "dispute_evidence":
                raise DomainError(
                    "Evidence files must use the dispute_evidence purpose.", code="validation_error"
                )
            if attachment.uploader_id != actor.id:
                raise PermissionDeniedError("Only your own uploads can be attached as evidence.")
            _ = grant_download  # traversal check happens at download time
            evidence.append(attachment)
        dispute.evidence.set(evidence)

    _freeze(order, frozen=True)
    from apps.orders.models import Order
    from apps.orders.services import transition

    _ = Order
    transition(order, "disputed", event_type="dispute_opened", data={"dispute_id": str(dispute.pk)})
    audit_log(actor, action="dispute.opened", obj=dispute, detail={"reason": reason})

    from apps.messaging import services as messaging

    messaging.get_or_create_thread(context_type="dispute", context=order, actor=actor)

    from apps.notifications.services import notify

    counterpart = order.expert_id if actor.id == order.student_id else order.student_id
    notify(
        counterpart,
        "dispute_opened",
        title="A dispute was opened on your order",
        body=f"Reason: {dispute.get_reason_display()}. Order {order.number} is frozen until resolution.",
        url=f"/orders/{order.pk}",
        context={"dispute_id": str(dispute.pk)},
    )
    return dispute


def _transition(dispute: Dispute, to_status: str, *, actor) -> Dispute:
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only support can move a dispute through review.")
    action = TRANSITIONS.get((dispute.status, to_status))
    if action is None:
        raise DomainError(
            f"Cannot move a dispute from '{dispute.status}' to '{to_status}'.",
            code="invalid_transition",
        )
    dispute.status = to_status
    dispute.save(update_fields=["status", "updated_at"])
    audit_log(actor, action=action, obj=dispute)
    return dispute


@transaction.atomic
def take_case(dispute: Dispute, *, actor) -> Dispute:
    return _transition(dispute, Dispute.Status.UNDER_REVIEW, actor=actor)


@transaction.atomic
def await_response(dispute: Dispute, *, actor) -> Dispute:
    return _transition(dispute, Dispute.Status.AWAITING_RESPONSE, actor=actor)


@transaction.atomic
def resume_review(dispute: Dispute, *, actor) -> Dispute:
    return _transition(dispute, Dispute.Status.UNDER_REVIEW, actor=actor)


@transaction.atomic
def resolve(
    dispute: Dispute,
    *,
    actor,
    outcome: str,
    resolution_notes: str,
    refund_amount_minor: int | None = None,
) -> Dispute:
    """Execute the outcome with the EXISTING payment services, unfreeze/refreeze
    money flows, transition the order, notify both parties. under_review only."""
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only support can resolve disputes (BR-41).")
    if (dispute.status, Dispute.Status.RESOLVED) not in TRANSITIONS:
        raise DomainError(
            f"Cannot resolve a dispute from '{dispute.status}'.", code="invalid_transition"
        )
    if outcome not in Dispute.Outcome.values:
        raise DomainError("Unknown dispute outcome.", code="validation_error")
    resolution_notes = (resolution_notes or "").strip()
    if len(resolution_notes) < 20:
        raise DomainError(
            "Resolution notes are required (≥20 characters).", code="validation_error"
        )

    order = type(dispute.order).objects.select_for_update().get(pk=dispute.order_id)
    from apps.payments.models import Payment

    payment = Payment.objects.filter(
        order=order, status__in=[Payment.Status.SUCCEEDED, Payment.Status.PARTIALLY_REFUNDED]
    ).first()

    if outcome in (
        Dispute.Outcome.REFUND_STUDENT_FULL,
        Dispute.Outcome.REFUND_STUDENT_PARTIAL,
        Dispute.Outcome.SPLIT,
    ):
        if payment is None:
            raise DomainError(
                "No succeeded payment to refund on this order.", code="validation_error"
            )
        if outcome == Dispute.Outcome.REFUND_STUDENT_FULL:
            amount = payment.amount_minor - payment.refunded_minor
        else:
            amount = int(refund_amount_minor or 0)
            refundable = payment.amount_minor - payment.refunded_minor
            if amount <= 0 or amount >= refundable:
                raise DomainError(
                    f"Refund must be between 1 and {refundable - 1} minor units for this outcome.",
                    code="validation_error",
                )
        from apps.payments.services import issue_refund

        issue_refund(
            payment,
            amount_minor=amount,
            reason="dispute_resolution",
            note=f"Dispute {dispute.pk} ({outcome})",
            initiated_by=actor,
        )
        if outcome == Dispute.Outcome.REFUND_STUDENT_FULL:
            _void_scheduled_payout(order, actor=actor)

    # Unfreeze FIRST for outcomes that resume/keep money flows; the flag flips
    # before the order transition so payout scheduling sees the final state.
    _freeze(order, frozen=False)

    # Payout correction: completion auto-schedules the payout; partial/split
    # reduce the expert credit, so the still-unsettled payout is corrected to
    # the remaining balance (audited pre-settlement adjustment — never touches
    # ledger rows directly). Full refunds void it instead (branch above).
    if outcome in (Dispute.Outcome.REFUND_STUDENT_PARTIAL, Dispute.Outcome.SPLIT):
        from apps.payments.models import Payout
        from apps.payments.services import expert_credit_balance

        payout = Payout.objects.filter(order=order).exclude(status=Payout.Status.PAID).first()
        if payout is not None:
            payout.amount_minor = expert_credit_balance(order)
            payout.save(update_fields=["amount_minor", "updated_at"])
            audit_log(
                actor,
                action="payout.adjusted_dispute",
                obj=payout,
                detail={"amount_minor": payout.amount_minor},
            )

    from apps.orders.services import transition

    new_status = {
        Dispute.Outcome.REFUND_STUDENT_FULL: "cancelled",
        Dispute.Outcome.REFUND_STUDENT_PARTIAL: "completed",
        Dispute.Outcome.RELEASE_EXPERT: "completed",
        Dispute.Outcome.SPLIT: "completed",
        Dispute.Outcome.NO_FAULT_CLOSE: dispute.prior_order_status,
    }[outcome]
    if new_status != order.status:
        transition(
            order,
            new_status,
            event_type="dispute_resolved",
            data={"dispute_id": str(dispute.pk), "outcome": outcome},
        )
    else:
        from apps.orders.models import OrderEvent

        OrderEvent.objects.create(
            order=order,
            event_type=OrderEvent.EventType.DISPUTE_RESOLVED,
            data={"dispute_id": str(dispute.pk), "outcome": outcome},
        )

    dispute.outcome = outcome
    dispute.resolution_notes = resolution_notes
    dispute.resolved_by = actor
    dispute.resolved_at = timezone.now()
    dispute.status = Dispute.Status.RESOLVED
    dispute.save(
        update_fields=[
            "outcome",
            "resolution_notes",
            "resolved_by",
            "resolved_at",
            "status",
            "updated_at",
        ]
    )
    audit_log(actor, action="disputes.resolved", obj=dispute, detail={"outcome": outcome})

    from apps.notifications.services import notify

    for user_id in (order.student_id, order.expert_id):
        notify(
            user_id,
            "dispute_resolved",
            title=f"Dispute resolved — {dispute.get_outcome_display()}",
            body=resolution_notes[:120],
            url=f"/orders/{order.pk}",
            context={"dispute_id": str(dispute.pk)},
        )
    return dispute


def _void_scheduled_payout(order, *, actor) -> None:
    from apps.payments.models import Payout
    from apps.payments.services import mark_payout_failed

    payout = Payout.objects.filter(order=order).exclude(status=Payout.Status.PAID).first()
    if payout is not None:
        mark_payout_failed(payout, actor=actor, reason="Order refunded by dispute resolution")


@transaction.atomic
def close(dispute: Dispute, *, actor) -> Dispute:
    """Terminal: funds settled + parties notified (manual rails settle in-ledger
    during resolve, so close is the operational acknowledgement)."""
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only support can close disputes.")
    if (dispute.status, Dispute.Status.CLOSED) not in TRANSITIONS:
        raise DomainError(
            f"Cannot close a dispute from '{dispute.status}'.", code="invalid_transition"
        )
    dispute.status = Dispute.Status.CLOSED
    dispute.closed_at = timezone.now()
    dispute.save(update_fields=["status", "closed_at", "updated_at"])
    audit_log(actor, action="disputes.closed", obj=dispute)
    return dispute
