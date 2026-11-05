"""Order lifecycle (docs/workflows/order-lifecycle.md, BR-23..26).

    awaiting_payment -> active -> delivered -> revision_requested -> delivered ...
                          |           |
                          +-> cancelled   -> completed (approve | auto 72h | admin)

Every transition goes through `transition()` with `select_for_update` on the
order row (double-approve/double-cancel impossible); every transition appends
an OrderEvent (the timeline) + an audit row + a django-q2 email hook (Phase 8
replaces the email layer, not the seams). Payment collection stays in Phase 7:
`mark_paid` is the seam (staff/manual today, gateway webhook later).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.files.models import Attachment
from apps.orders.delivery import Delivery, OrderEvent
from apps.orders.models import DeadlineProposal, LiveSession, Order
from apps.payments import services as payments_services
from apps.service_requests import services as request_services

logger = logging.getLogger(__name__)

AUTO_APPROVE_HOURS = 72  # BR-24
UNPAID_CANCEL_HOURS = 72  # awaiting_payment expiry
REVISION_DUE_EXTENSION_DAYS = 7  # internal due date extension per revision
MIN_DELIVERY_SUMMARY = 20


def _next_number() -> str:
    return f"ORD-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


TRANSITIONS: dict[tuple[str, str], str] = {
    ("awaiting_payment", "active"): "payment_confirmed",
    ("awaiting_payment", "cancelled"): "cancel",
    ("active", "delivered"): "deliver",
    ("active", "cancelled"): "cancel",
    ("active", "disputed"): "open_dispute",  # dispute machine lands in Phase 9
    ("delivered", "revision_requested"): "request_revision",
    ("delivered", "completed"): "approve",
    ("delivered", "cancelled"): "cancel",
    ("delivered", "disputed"): "open_dispute",
    ("revision_requested", "delivered"): "deliver",
    ("revision_requested", "completed"): "approve",
    ("revision_requested", "disputed"): "open_dispute",
    ("revision_requested", "cancelled"): "cancel",
    ("completed", "disputed"): "open_dispute",  # BR-40: 7-day post-completion window
    ("disputed", "completed"): "resolve_release",  # executed by the Phase 9 resolution service
    ("disputed", "cancelled"): "resolve_refund",
    ("disputed", "active"): "resolve_no_fault",
    ("disputed", "delivered"): "resolve_no_fault",
    ("disputed", "revision_requested"): "resolve_no_fault",
}


def _record_event(order: Order, event_type: str, *, actor=None, **data: Any) -> OrderEvent:
    return OrderEvent.objects.create(order=order, event_type=event_type, actor=actor, data=data)


@transaction.atomic
def transition(
    order: Order, to_status: str, *, actor=None, event_type: str | None = None, **event_data
) -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    action = TRANSITIONS.get((order.status, to_status))
    if action is None:
        raise DomainError(
            f"Cannot move an order from '{order.status}' to '{to_status}'.",
            code="invalid_transition",
        )
    order.status = to_status
    order.save(update_fields=["status", "updated_at"])
    _record_event(order, event_type or to_status, actor=actor, **event_data)
    audit_log(actor, action=f"order.{action}", obj=order, detail={"to": to_status})
    return order


# Event → (recipients, notification type, title) — the Phase 8 notification
# catalog (docs/workflows/notifications.md); delivery channels (in-app +
# realtime + email per preference) are the funnel's business.
_EVENT_COPY = {
    "order_active": (
        ("both",),
        "order_paid_activated",
        "Order paid — work can start",
    ),
    "delivered": (("student",), "order_delivered", "Your order has a delivery to review"),
    "revision_requested": (("expert",), "order_revision_requested", "Revision requested"),
    "completed": (("both",), "order_approved_completed", "Order completed"),
    "cancelled": (("both",), "order_cancelled", "Order cancelled"),
    "deadline_reminder": (("expert",), "order_deadline_warning", "Delivery due within 24 hours"),
    "live_session_scheduled": (
        ("both",),
        "live_session_scheduled",
        "Live 1:1 coaching session scheduled",
    ),
    "live_session_completed": (
        ("both",),
        "live_session_completed",
        "Live coaching session completed",
    ),
    "dispute_opened": (("both",), "dispute_opened", "A dispute was opened on your order"),
    "dispute_resolved": (("both",), "dispute_resolved", "The dispute on your order was resolved"),
    "overdue_flagged": (("both",), "order_overdue_flagged", "This order is past its deadline"),
    "deadline_extended": (("both",), "order_deadline_extended", "The order deadline was extended"),
    "auto_approve_warning": (
        ("student",),
        "order_auto_approve_warning",
        "Your delivery auto-approves in 24 hours",
    ),
}


def _notify(order: Order, event: str, extra_email: int | None = None) -> None:
    """Order event → notifications funnel (in-app row + realtime push + email
    per preference). Replaces the Phase 6 direct-email hook (Phase 8)."""
    from apps.notifications.services import notify, notify_many

    (_targets,), ntype, title = _EVENT_COPY[event]
    url = f"/orders/{order.pk}"
    if _targets == "both":
        notify_many(
            [order.student_id, order.expert_id],
            ntype,
            title=title,
            url=url,
            context={"order_id": str(order.pk)},
        )
    elif _targets == "student":
        notify(order.student_id, ntype, title=title, url=url, context={"order_id": str(order.pk)})
    else:
        notify(order.expert_id, ntype, title=title, url=url, context={"order_id": str(order.pk)})


def _student_guard(user, order: Order) -> None:
    if order.student_id != user.id:
        raise PermissionDeniedError("You can only manage your own orders.")


def _expert_guard(user, order: Order) -> None:
    if order.expert_id != user.id:
        raise PermissionDeniedError("Only the assigned expert can deliver on this order.")


# --- payment seam (Phase 7 replaces the call site, not this contract) ---------


def mark_paid(order: Order, *, actor=None, via: str = "manual") -> Order:
    """awaiting_payment -> active. Staff-only until Phase 7 wires the gateway
    webhook (which will call this same function with via="stripe")."""
    if actor is not None and not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only staff can confirm payments in this phase.")
    if order.paid_at is not None:
        raise DomainError("This order is already paid.", code="invalid_transition")
    order.paid_at = timezone.now()
    order.save(update_fields=["paid_at", "updated_at"])
    transition(
        order, Order.Status.ACTIVE, actor=actor, event_type=OrderEvent.EventType.PAYMENT_CONFIRMED
    )
    _record_event(order, OrderEvent.EventType.PAYMENT_CONFIRMED, actor=actor, via=via)
    if order.request.status == "matched":
        request_services.transition(
            order.request, "in_progress", actor=actor
        )  # work starts (BR-23)
    _notify(order, "order_active")
    return order


# --- delivery loop ------------------------------------------------------------


@transaction.atomic
def submit_delivery(
    order: Order, *, expert, summary: str, attachment_ids: list[str] | None = None
) -> Delivery:
    order = Order.objects.select_for_update().get(pk=order.pk)
    _expert_guard(expert, order)
    if order.status not in (Order.Status.ACTIVE, Order.Status.REVISION_REQUESTED):
        raise DomainError("This order is not open for delivery.", code="order_locked")
    if len(summary.strip()) < MIN_DELIVERY_SUMMARY:
        raise DomainError("Add a proper delivery summary.", code="validation_error")
    if attachment_ids:
        found = Attachment.objects.filter(
            pk__in=attachment_ids, uploader=expert, purpose=Attachment.Purpose.DELIVERY
        )
        if found.count() != len(set(attachment_ids)):
            raise DomainError(
                "Attachments must be your own delivery uploads.", code="validation_error"
            )

    revision_number = order.revisions_used if order.status == Order.Status.REVISION_REQUESTED else 0
    now = timezone.now()
    delivery = Delivery.objects.create(
        order=order,
        revision_number=revision_number,
        summary=summary.strip(),
        submitted_at=now,
    )
    if attachment_ids:
        delivery.attachments.set(attachment_ids)
    order.delivered_at = now
    order.auto_approve_at = now + timedelta(hours=AUTO_APPROVE_HOURS)
    order.delivery_due_at = None
    order.save(update_fields=["delivered_at", "auto_approve_at", "delivery_due_at", "updated_at"])
    transition(
        order,
        Order.Status.DELIVERED,
        actor=expert,
        event_type=OrderEvent.EventType.REDELIVERED
        if revision_number
        else OrderEvent.EventType.DELIVERED,
    )
    _notify(order, "delivered")
    return delivery


@transaction.atomic
def request_revision(order: Order, *, student, note: str) -> Delivery:
    order = Order.objects.select_for_update().get(pk=order.pk)
    _student_guard(student, order)
    if order.status != Order.Status.DELIVERED:
        raise DomainError(
            "Only a delivered order can be sent back for revision.", code="order_locked"
        )
    if order.revisions_used >= order.revisions_allowed:
        raise DomainError(
            "The included revisions are exhausted — approve, or contact support.",
            code="revisions_exhausted",
        )
    if len(note.strip()) < 10:
        raise DomainError("Describe the requested changes (required).", code="validation_error")
    delivery = order.deliveries.order_by("-revision_number").first()
    if delivery is None:
        raise DomainError("No delivery to revise.", code="order_locked")
    delivery.status = Delivery.Status.REVISION_REQUESTED
    delivery.save(update_fields=["status", "updated_at"])
    order.revisions_used += 1
    order.auto_approve_at = None  # paused while the revision loop runs
    order.delivery_due_at = timezone.now() + timedelta(days=REVISION_DUE_EXTENSION_DAYS)
    order.save(update_fields=["revisions_used", "auto_approve_at", "delivery_due_at", "updated_at"])
    transition(order, Order.Status.REVISION_REQUESTED, actor=student)
    _record_event(
        order,
        OrderEvent.EventType.REVISION_REQUESTED,
        actor=student,
        note=note[:500],
        revision=order.revisions_used,
    )
    _notify(order, "revision_requested")
    return delivery


@transaction.atomic
def approve_delivery(order: Order, *, actor=None, source: str = "student") -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    if source == "student":
        _student_guard(actor, order)
    elif source == "admin" and (actor is None or not getattr(actor, "is_staff", False)):
        raise PermissionDeniedError("Only staff can force-approve.")
    # source == "auto": actor None, called by the worker
    if order.status not in (Order.Status.DELIVERED,):
        raise DomainError("Only a delivered order can be approved.", code="order_locked")
    delivery = order.deliveries.order_by("-revision_number").first()
    now = timezone.now()
    if delivery is not None:
        delivery.status = Delivery.Status.APPROVED
        delivery.approved_at = now
        delivery.approval_source = source
        delivery.save(update_fields=["status", "approved_at", "approval_source", "updated_at"])
    order.completed_at = now
    order.auto_approve_at = None
    order.save(update_fields=["completed_at", "auto_approve_at", "updated_at"])
    order = transition(
        order,
        Order.Status.COMPLETED,
        actor=actor,
        event_type=OrderEvent.EventType.AUTO_APPROVED
        if source == "auto"
        else OrderEvent.EventType.APPROVED,
    )
    _record_event(order, OrderEvent.EventType.COMPLETED, actor=actor, source=source)
    if order.request.status == "in_progress":
        request_services.transition(order.request, "completed", actor=actor)
    payments_services.schedule_payout(order)  # BR-30 (no-op below the $10 floor)
    _notify(order, "completed")
    return order


# --- cancellation -------------------------------------------------------------


@transaction.atomic
def cancel(order: Order, *, actor, reason: str = "") -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    is_staff = getattr(actor, "is_staff", False)
    is_party = order.student_id == actor.id or order.expert_id == actor.id
    if not is_party and not is_staff:
        raise PermissionDeniedError("You are not a party to this order.")
    if order.status != Order.Status.AWAITING_PAYMENT and not is_staff:
        raise PermissionDeniedError("Cancellation after payment is handled by support (BR-26..28).")
    if not reason:
        raise DomainError("A cancellation reason is required.", code="validation_error")
    now = timezone.now()
    order.cancelled_at = now
    order.cancelled_by = actor
    order.cancellation_reason = reason[:200]
    order.save(update_fields=["cancelled_at", "cancelled_by", "cancellation_reason", "updated_at"])
    order = transition(order, Order.Status.CANCELLED, actor=actor)
    payments_services.void_payment_for_order(order, actor=actor)  # close any open attempt
    if order.request.status in ("matched", "in_progress"):
        request_services.transition(order.request, "cancelled", actor=actor, reason=reason)
    _notify(order, "cancelled")
    return order


# --- worker jobs (django-q2; idempotent + race-safe) ---------------------------


def auto_approve_due(now=None) -> int:
    """Approve delivered orders whose 72h window elapsed (BR-24). Idempotent:
    each candidate is row-locked and re-checked inside its transaction."""
    now = now or timezone.now()
    due_ids = list(
        Order.objects.filter(status=Order.Status.DELIVERED, auto_approve_at__lte=now).values_list(
            "id", flat=True
        )
    )
    approved = 0
    for order_id in due_ids:
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order_id)
                if order.status != Order.Status.DELIVERED or order.auto_approve_at is None:
                    continue  # raced with a student action — skip safely
                approve_delivery(order, source="auto")
                approved += 1
        except DomainError:
            continue
    if approved:
        audit_log(None, action="orders.auto_approve_batch", detail={"count": approved})
    return approved


def sweep_unpaid(now=None) -> int:
    """Cancel orders unpaid for >72h (BR-23)."""
    now = now or timezone.now()
    stale = Order.objects.filter(
        status=Order.Status.AWAITING_PAYMENT,
        created_at__lte=now - timedelta(hours=UNPAID_CANCEL_HOURS),
    )
    count = 0
    for order in stale.select_for_update():
        order.cancelled_at = now
        order.cancellation_reason = "Unpaid for 72 hours"
        order.save(update_fields=["cancelled_at", "cancellation_reason", "updated_at"])
        transition(order, Order.Status.CANCELLED, event_type=OrderEvent.EventType.CANCELLED)
        count += 1
    if count:
        audit_log(None, action="orders.unpaid_sweep", detail={"count": count})
    return count


# --- convergence factory (ADR-0015; Phase 5 seam — unchanged contract) --------


def create_order_for_request(
    request,
    *,
    expert,
    amount: int,
    currency: str,
    source: str,
    offer_id=None,
) -> Order:
    """THE order factory — every acquisition path converges here (ADR-0015).

    Caller holds the surrounding transaction and has already validated
    eligibility. `source` picks the commission rate (open 15%, managed 20%),
    which is snapshotted onto the row (BR-17/BR-22). Also records the timeline
    seed event (created).
    """
    from apps.experts.models import ExpertProfile
    from apps.payments.config import commission_split, rate_for_source

    expert_pk = getattr(expert, "pk", expert)
    if request.student_id == expert_pk:
        raise DomainError("Student and expert cannot be the same account.", code="self_dealing")
    profile = ExpertProfile.objects.filter(pk=expert_pk).first()
    commission, net = commission_split(amount, rate_for_source(source))
    order = Order.objects.create(
        number=_next_number(),
        request=request,
        student=request.student,
        expert_id=expert_pk,
        expert_name=profile.display_name if profile else f"user:{expert_pk}",
        expert_slug=profile.slug if profile else "",
        source=source,
        offer_id=offer_id,
        amount=amount,
        currency=currency,
        commission_amount=commission,
        expert_amount=net,
        accepted_at=timezone.now(),
        deadline=request.deadline,
    )
    _record_event(order, OrderEvent.EventType.CREATED, data={"source": source, "amount": amount})
    audit_log(None, action="order.create", obj=order, detail={"source": source, "amount": amount})
    return order


def create_order_from_offer(offer) -> Order:
    """Open-bid selection seam (bidding.accept) — delegates to the generic factory."""
    return create_order_for_request(
        offer.request,
        expert=offer.expert_id,
        amount=offer.amount,
        currency=offer.currency,
        source=Order.Source.OPEN_BID,
        offer_id=offer.pk,
    )


def deadline_reminder(now: datetime | None = None) -> int:
    """T-24h expert warning (hourly job). Idempotent via the persisted
    deadline_reminded event; safe to run on every schedule tick."""
    now = now or timezone.now()
    horizon = now + timedelta(hours=24)
    reminded = 0
    for order in (
        Order.objects.filter(
            status__in=[
                Order.Status.ACTIVE,
                Order.Status.DELIVERED,
                Order.Status.REVISION_REQUESTED,
            ],
            delivery_due_at__gt=now,
            delivery_due_at__lte=horizon,
        )
        .exclude(events__event_type=OrderEvent.EventType.DEADLINE_REMINDED)
        .select_related("request")
        .iterator()
    ):
        OrderEvent.objects.create(
            order=order, event_type=OrderEvent.EventType.DEADLINE_REMINDED, data={}
        )
        _notify(order, "deadline_reminder", extra_email=order.expert_id)
        reminded += 1
    return reminded


AUTO_APPROVE_WARNING_HOURS = 24


def auto_approve_warning(now: datetime | None = None) -> int:
    """T-24h student warning before an unreviewed delivery auto-approves (BR-24).

    Auto-approval completes the order and releases the expert's money. Doing
    that silently is the problem: the student gets one last chance to approve
    deliberately, request a revision, or dispute. Idempotent via the persisted
    event marker, so the hourly tick cannot re-warn.
    """
    now = now or timezone.now()
    horizon = now + timedelta(hours=AUTO_APPROVE_WARNING_HOURS)
    warned = 0
    for order in (
        Order.objects.filter(
            status=Order.Status.DELIVERED,
            auto_approve_at__gt=now,
            auto_approve_at__lte=horizon,
        )
        .exclude(events__event_type=OrderEvent.EventType.AUTO_APPROVE_WARNED)
        .select_related("request")
        .iterator()
    ):
        OrderEvent.objects.create(
            order=order, event_type=OrderEvent.EventType.AUTO_APPROVE_WARNED, data={}
        )
        _notify(order, "auto_approve_warning", extra_email=order.student_id)
        warned += 1
    return warned


# --- deadline proposals + overdue flagging (order-lifecycle.md, Phase 9) ----------


@transaction.atomic
def propose_deadline(order, *, actor, proposed_due_at, note: str = "") -> DeadlineProposal:
    """Either participant proposes a new delivery deadline (BR-26 late path)."""
    from django.utils import timezone as tz

    order = Order.objects.select_for_update().get(pk=order.pk)
    if actor.id not in (order.student_id, order.expert_id):
        raise PermissionDeniedError("Only the order's participants can propose deadlines.")
    if order.status not in ("active", "delivered", "revision_requested"):
        raise DomainError(
            "Deadlines can be proposed only while work is in progress.", code="invalid_transition"
        )
    if DeadlineProposal.objects.filter(
        order=order, status=DeadlineProposal.Status.PENDING
    ).exists():
        raise DomainError("A proposal is already pending on this order.", code="duplicate_proposal")
    if tz.is_naive(proposed_due_at):
        proposed_due_at = tz.make_aware(proposed_due_at)
    if proposed_due_at <= tz.now():
        raise DomainError("The proposed deadline must be in the future.", code="validation_error")
    proposal, _ = DeadlineProposal.objects.update_or_create(
        order=order,
        defaults={
            "proposed_by_id": actor.id,
            "proposed_due_at": proposed_due_at,
            "note": (note or "")[:300],
            "status": DeadlineProposal.Status.PENDING,
        },
    )
    _record_event(
        order,
        "deadline_proposed",
        actor=actor,
        proposal_id=str(proposal.pk),
        proposed_due_at=proposed_due_at.isoformat(),
        note=(note or "")[:300],
    )
    audit_log(
        actor, action="order.deadline_proposed", obj=order, detail={"proposal": str(proposal.pk)}
    )
    counterpart = order.expert_id if actor.id == order.student_id else order.student_id
    from apps.notifications.services import notify

    notify(
        counterpart,
        "order_deadline_proposed",
        title="A new delivery deadline was proposed",
        body=(note or "Review the proposal on the order page.")[:120],
        url=f"/orders/{order.pk}",
        context={"proposal_id": str(proposal.pk)},
    )

    try:
        from apps.messaging.models import Thread
        from apps.messaging.services import send_message

        thread = Thread.objects.filter(order=order, context_type=Thread.Context.ORDER).first()
        if thread:
            role_label = "Specialist" if actor.id == order.expert_id else "Student"
            due_str = proposed_due_at.strftime("%b %d, %Y %H:%M UTC")
            msg_body = f"📅 {role_label} proposed a new delivery deadline: {due_str}."
            if note:
                msg_body += f"\nNote: {note}"
            send_message(thread, sender=actor, body=msg_body)
    except Exception:
        logger.exception("Failed to emit chat message for deadline proposal")

    return proposal


@transaction.atomic
def respond_deadline_proposal(order, *, actor, accept: bool | str) -> DeadlineProposal:
    """Counterpart accepts/declines the pending proposal; acceptance extends
    delivery_due_at (audit-recorded, order-lifecycle.md)."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if actor.id not in (order.student_id, order.expert_id):
        raise PermissionDeniedError("Only the order's participants can respond to proposals.")
    proposal = DeadlineProposal.objects.filter(
        order=order, status=DeadlineProposal.Status.PENDING
    ).first()
    if proposal is None:
        raise DomainError("No pending deadline proposal on this order.", code="not_found")

    is_withdraw = False
    if isinstance(accept, str):
        action_lower = accept.lower()
        if action_lower == "withdraw":
            is_withdraw = True
        else:
            accept = action_lower in ("accept", "true", "1")
    elif not accept and proposal.proposed_by_id == actor.id:
        is_withdraw = True

    if proposal.proposed_by_id == actor.id or is_withdraw:
        proposal.status = DeadlineProposal.Status.WITHDRAWN
        proposal.save(update_fields=["status", "updated_at"])
        _record_event(
            order,
            "deadline_withdrawn",
            actor=actor,
            proposal_id=str(proposal.pk),
        )
        try:
            from apps.messaging.models import Thread
            from apps.messaging.services import send_message

            thread = Thread.objects.filter(order=order, context_type=Thread.Context.ORDER).first()
            if thread:
                send_message(
                    thread, sender=actor, body="↩️ Deadline extension proposal was withdrawn."
                )
        except Exception:
            logger.exception("Failed to emit chat message for withdrawn deadline proposal")
        return proposal

    proposal.status = (
        DeadlineProposal.Status.ACCEPTED if accept else DeadlineProposal.Status.DECLINED
    )
    proposal.save(update_fields=["status", "updated_at"])
    if accept:
        order.delivery_due_at = proposal.proposed_due_at
        order.save(update_fields=["delivery_due_at", "updated_at"])
        _record_event(
            order,
            "deadline_extended",
            actor=actor,
            proposal_id=str(proposal.pk),
            due_at=proposal.proposed_due_at.isoformat(),
        )
        audit_log(actor, action="order.deadline_extended", obj=order)
        from apps.notifications.services import notify

        notify(
            proposal.proposed_by_id,
            "order_deadline_accepted",
            title="Deadline proposal accepted",
            body=f"The delivery deadline has been updated to {proposal.proposed_due_at.strftime('%b %d, %Y')}.",
            url=f"/orders/{order.pk}",
        )
    else:
        _record_event(
            order,
            "deadline_declined",
            actor=actor,
            proposal_id=str(proposal.pk),
        )
        audit_log(actor, action="order.deadline_proposal_declined", obj=order)
        from apps.notifications.services import notify

        notify(
            proposal.proposed_by_id,
            "order_deadline_declined",
            title="Deadline proposal declined",
            body="Your proposal for a new delivery deadline was declined.",
            url=f"/orders/{order.pk}",
        )

    try:
        from apps.messaging.models import Thread
        from apps.messaging.services import send_message

        thread = Thread.objects.filter(order=order, context_type=Thread.Context.ORDER).first()
        if thread:
            status_text = "accepted ✅" if accept else "declined ❌"
            send_message(
                thread,
                sender=actor,
                body=f"📅 Deadline proposal was {status_text}.",
            )
    except Exception:
        logger.exception("Failed to emit chat message for deadline response")

    return proposal


OVERDUE_FLAG_GRACE_HOURS = 24  # order-lifecycle.md jobs table (BR-26)


def flag_overdue(now=None) -> int:
    """Daily job: flag orders whose delivery deadline passed >24h ago without a
    delivery, once (deduped by the persisted overdue_flagged event)."""
    from django.utils import timezone as tz

    now = now or tz.now()
    cutoff = now - timedelta(hours=OVERDUE_FLAG_GRACE_HOURS)
    flagged = 0
    overdue = Order.objects.filter(
        status__in=["active", "revision_requested"],
        delivery_due_at__lt=cutoff,
    ).exclude(events__event_type="overdue_flagged")
    for order in overdue:
        _record_event(order, "overdue_flagged")
        audit_log(None, action="order.overdue_flagged", obj=order)
        _notify(order, "overdue_flagged")
        flagged += 1
    return flagged


def schedule_live_session(order: Order, *, actor, scheduled_at) -> LiveSession:
    """Schedule a live 1:1 coaching session on an active/in-progress order."""
    from django.utils import timezone as tz

    if actor.id not in (order.student_id, order.expert_id) and not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only order participants can schedule live sessions.")
    if order.status not in ("active", "delivered", "revision_requested"):
        raise DomainError(
            "Live sessions can only be scheduled while an order is in progress.",
            code="invalid_transition",
        )
    if tz.is_naive(scheduled_at):
        scheduled_at = tz.make_aware(scheduled_at)

    session = LiveSession.objects.create(
        order=order,
        scheduled_at=scheduled_at,
        status=LiveSession.Status.SCHEDULED,
        created_by=actor,
    )

    _record_event(
        order,
        "live_session_scheduled",
        actor=actor,
        session_id=str(session.pk),
        scheduled_at=scheduled_at.isoformat(),
    )
    audit_log(
        actor,
        action="order.live_session_scheduled",
        obj=order,
        detail={"session": str(session.pk), "scheduled_at": scheduled_at.isoformat()},
    )

    counterpart = order.expert_id if actor.id == order.student_id else order.student_id
    try:
        from apps.notifications.services import notify
        notify(
            counterpart,
            "live_session_scheduled",
            title="Live coaching session scheduled",
            url=f"/orders/{order.pk}",
            context={"order_id": str(order.pk)},
        )
    except Exception:
        logger.exception("Failed to emit notification for live session scheduling")

    try:
        from apps.messaging.models import Thread
        from apps.messaging.services import send_message
        thread = Thread.objects.filter(context_id=order.pk, context=Thread.Context.ORDER).first()
        if thread:
            send_message(
                thread,
                sender=actor,
                body=f"Live 1:1 coaching session scheduled for {scheduled_at.strftime('%b %d, %Y at %H:%M UTC')}.",
            )
    except Exception:
        logger.exception("Failed to emit chat message for live session scheduling")

    return session


def start_live_session(order: Order, *, actor) -> LiveSession:
    """Start or join an instant live coaching session on an order."""
    from django.utils import timezone as tz

    if actor.id not in (order.student_id, order.expert_id) and not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only order participants can join live sessions.")

    session = (
        order.live_sessions.filter(status__in=[LiveSession.Status.LIVE, LiveSession.Status.SCHEDULED])
        .order_by("-created_at")
        .first()
    )
    if not session:
        session = LiveSession.objects.create(
            order=order,
            status=LiveSession.Status.LIVE,
            started_at=tz.now(),
            created_by=actor,
        )
    elif session.status != LiveSession.Status.LIVE:
        session.status = LiveSession.Status.LIVE
        if not session.started_at:
            session.started_at = tz.now()
        session.save(update_fields=["status", "started_at", "updated_at"])

    return session


def end_live_session(
    order: Order, *, actor, duration_seconds: int = 0, scratchpad_content: str = ""
) -> LiveSession:
    """End a live coaching session, record duration and snapshot scratchpad notes."""
    from django.utils import timezone as tz

    if actor.id not in (order.student_id, order.expert_id) and not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only order participants can end live sessions.")

    session = (
        order.live_sessions.filter(status__in=[LiveSession.Status.LIVE, LiveSession.Status.SCHEDULED])
        .order_by("-created_at")
        .first()
    )
    if not session:
        session = LiveSession.objects.create(
            order=order,
            status=LiveSession.Status.ENDED,
            started_at=tz.now() - timedelta(seconds=duration_seconds),
            ended_at=tz.now(),
            duration_seconds=duration_seconds,
            scratchpad_content=scratchpad_content,
            created_by=actor,
        )
    else:
        session.status = LiveSession.Status.ENDED
        session.ended_at = tz.now()
        session.duration_seconds = duration_seconds
        session.scratchpad_content = scratchpad_content
        session.save(
            update_fields=[
                "status",
                "ended_at",
                "duration_seconds",
                "scratchpad_content",
                "updated_at",
            ]
        )

    _record_event(
        order,
        "live_session_completed",
        actor=actor,
        session_id=str(session.pk),
        duration_seconds=duration_seconds,
        scratchpad_content=scratchpad_content,
    )
    audit_log(
        actor,
        action="order.live_session_completed",
        obj=order,
        detail={"session": str(session.pk), "duration_seconds": duration_seconds},
    )

    counterpart = order.expert_id if actor.id == order.student_id else order.student_id
    try:
        from apps.notifications.services import notify
        notify(
            counterpart,
            "live_session_completed",
            title="Live coaching session completed",
            url=f"/orders/{order.pk}",
            context={"order_id": str(order.pk)},
        )
    except Exception:
        logger.exception("Failed to emit notification for live session completion")

    try:
        from apps.messaging.models import Thread
        from apps.messaging.services import send_message
        thread = Thread.objects.filter(context_id=order.pk, context=Thread.Context.ORDER).first()
        if thread:
            mins = max(1, round(duration_seconds / 60))
            send_message(
                thread,
                sender=actor,
                body=f"Live coaching session completed ({mins} min). Scratchpad notes saved to order timeline.",
            )
    except Exception:
        logger.exception("Failed to emit chat message for live session completion")

    return session

# ---------------------------------------------------------------------------
# Sprint 5: Direct 1:1 Instant Session & Consultation Speed-Booking (Feature 1)
# ---------------------------------------------------------------------------


@transaction.atomic
def book_direct_session(
    student,
    *,
    expert_slug: str,
    duration_minutes: int = 30,
    topic_title: str = "1:1 Live Consultation",
    notes: str = "",
    scheduled_at: datetime | None = None,
) -> tuple[Order, LiveSession]:
    """Feature 1: Direct 1:1 consultation speed-booking.

    Atomically creates:
    1. Matched ServiceRequest
    2. Active funded Order (ORD-...) with paid_at set
    3. Succeeded Payment record
    4. Balanced Double-Entry Ledger rows (charge = 15% commission + 85% expert_credit)
    5. Scheduled LiveSession WebRTC room
    """
    from django.utils import timezone as tz

    from apps.core.exceptions import DomainError, NotFoundError
    from apps.experts.models import ExpertProfile
    from apps.payments.config import commission_split
    from apps.payments.models import LedgerEntry, Payment
    from apps.service_requests.models import ServiceRequest

    profile = ExpertProfile.objects.filter(slug=expert_slug).first()
    if profile is None or not profile.is_public:
        raise NotFoundError("Specialist not found or unavailable.", code="not_found")
    if profile.user_id == student.id:
        raise DomainError("You cannot book a consultation with your own account.", code="self_dealing")

    duration = 60 if int(duration_minutes) == 60 else 30
    price_minor = profile.session_60m_price if duration == 60 else profile.session_30m_price
    if not price_minor or price_minor < 500:
        price_minor = 8000 if duration == 60 else 4500

    title = (topic_title or f"1:1 Coaching ({duration} min)").strip()[:120]
    desc = notes.strip() or f"Direct 1:1 speed-booked coaching session with {profile.display_name} ({duration} min)."

    if scheduled_at is None:
        scheduled_at = tz.now() + timedelta(hours=2)
    elif tz.is_naive(scheduled_at):
        scheduled_at = tz.make_aware(scheduled_at)

    first_subject = profile.subjects.first()

    # 1. Matched ServiceRequest
    request = ServiceRequest.objects.create(
        student=student,
        mode=ServiceRequest.Mode.OPEN,
        category=ServiceRequest.Category.TUTORING,
        title=title,
        description=desc,
        subject=first_subject,
        pricing_type=ServiceRequest.PricingType.FIXED,
        budget_min=price_minor,
        budget_max=price_minor,
        currency="USD",
        status=ServiceRequest.Status.MATCHED,
        integrity_attested_at=tz.now(),
    )

    # 2. Active funded Order
    commission, net = commission_split(price_minor)
    order = Order.objects.create(
        number=_next_number(),
        request=request,
        student=student,
        expert_id=profile.user_id,
        expert_name=profile.display_name,
        expert_slug=profile.slug,
        source=Order.Source.OPEN_BID,
        amount=price_minor,
        currency="USD",
        commission_amount=commission,
        expert_amount=net,
        status=Order.Status.ACTIVE,
        accepted_at=tz.now(),
        paid_at=tz.now(),
    )

    # 3. Payment record (Succeeded)
    ref = f"speed-book-{uuid.uuid4().hex[:12]}"
    Payment.objects.create(
        order=order,
        gateway=Payment.Gateway.MANUAL,
        provider_reference=ref,
        amount_minor=price_minor,
        currency="USD",
        status=Payment.Status.SUCCEEDED,
        paid_at=tz.now(),
    )

    # 4. Double-Entry Ledger rows: charge = commission + expert_credit
    LedgerEntry.objects.create(
        entry_type=LedgerEntry.EntryType.CHARGE,
        amount_minor=price_minor,
        currency="USD",
        order=order,
        user=student,
        description=f"Speed-booking charge: {title[:80]}",
        provider_object_id=ref,
    )
    LedgerEntry.objects.create(
        entry_type=LedgerEntry.EntryType.COMMISSION,
        amount_minor=commission,
        currency="USD",
        order=order,
        description=f"Platform commission for speed-booking {order.number}",
        provider_object_id=ref,
    )
    LedgerEntry.objects.create(
        entry_type=LedgerEntry.EntryType.EXPERT_CREDIT,
        amount_minor=net,
        currency="USD",
        order=order,
        user=profile.user,
        description=f"Expert credit for speed-booking {order.number}",
        provider_object_id=ref,
    )

    # 5. Scheduled LiveSession
    live_session = LiveSession.objects.create(
        order=order,
        scheduled_at=scheduled_at,
        status=LiveSession.Status.SCHEDULED,
        created_by=student,
        scratchpad_content=f"# Live 1:1 Coaching: {title}\n\n**Specialist:** {profile.display_name}\n**Student:** {student.name or student.email}\n**Duration:** {duration} minutes\n**Notes:** {desc}\n",
    )

    _record_event(
        order,
        OrderEvent.EventType.CREATED,
        actor=student,
        data={"source": "speed_booking", "amount": price_minor},
    )
    _record_event(
        order,
        OrderEvent.EventType.PAYMENT_CONFIRMED,
        actor=student,
        via="instant_escrow",
    )
    _record_event(
        order,
        "live_session_scheduled",
        actor=student,
        session_id=str(live_session.pk),
        scheduled_at=scheduled_at.isoformat(),
    )
    audit_log(student, action="order.speed_booked", obj=order, detail={"order": order.number, "amount": price_minor})

    return order, live_session


# ---------------------------------------------------------------------------
# Sprint 5: Student Knowledge Vault & Printable Official Invoices (Feature 2)
# ---------------------------------------------------------------------------


def get_student_vault(user) -> dict:
    from apps.experts.models import KnowledgePurchase
    from apps.orders.models import Order

    # 1. Products purchased by this student
    purchases = (
        KnowledgePurchase.objects.filter(buyer=user)
        .select_related("product", "product__expert", "product__subject", "product__file")
        .order_by("-created_at")
    )
    products_data = []
    for p in purchases:
        prod = p.product
        products_data.append({
            "purchase_id": p.id,
            "product_id": prod.id,
            "title": prod.title,
            "summary": prod.summary,
            "description": prod.description,
            "product_type": prod.product_type,
            "price_display": f"${prod.price_minor / 100:.2f}",
            "amount_minor": p.amount_minor,
            "expert_name": prod.expert.display_name,
            "expert_slug": prod.expert.slug,
            "subject_name": prod.subject.name if prod.subject else None,
            "purchased_at": p.created_at.isoformat(),
            "download_count": p.download_count,
            "has_file": prod.file_id is not None,
            "file_name": prod.file.original_name if prod.file else None,
            "resource_content": (
                prod.description
                or f"Full access granted for {prod.title}. Includes downloadable templates and specialist walkthrough notes."
            ),
        })

    # 2. Completed / Delivered orders and live sessions
    orders = (
        Order.objects.filter(student=user)
        .exclude(status=Order.Status.CANCELLED)
        .prefetch_related("live_sessions", "deliveries", "deliveries__attachments")
        .order_by("-created_at")
    )
    deliveries_data = []
    for o in orders:
        sessions = [
            {
                "id": s.id,
                "status": s.status,
                "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
                "duration_seconds": s.duration_seconds,
                "scratchpad_content": s.scratchpad_content,
            }
            for s in o.live_sessions.all()
        ]
        order_deliveries = [
            {
                "id": str(d.id),
                "revision_number": d.revision_number,
                "summary": d.summary,
                "submitted_at": d.submitted_at.isoformat() if d.submitted_at else None,
                "attachments": [
                    {"id": str(a.id), "name": a.original_name, "size": a.size}
                    for a in d.attachments.all()
                ],
            }
            for d in o.deliveries.all()
        ]
        if sessions or order_deliveries:
            deliveries_data.append({
                "order_id": str(o.pk),
                "order_number": o.number,
                "status": o.status,
                "expert_name": o.expert_name,
                "expert_slug": o.expert_slug,
                "request_title": o.request.title if o.request else "Direct Consultation",
                "sessions": sessions,
                "deliveries": order_deliveries,
            })

    # 3. Itemized Tax Invoices / Receipts
    invoices = []
    for p in purchases:
        inv_num = f"INV-CAT-{p.id:05d}"
        commission = round(p.amount_minor * 0.15)
        expert_net = p.amount_minor - commission
        invoices.append({
            "invoice_number": inv_num,
            "type": "catalog_purchase",
            "title": p.product.title,
            "buyer_name": user.name or user.email,
            "specialist_name": p.product.expert.display_name,
            "gross_amount_display": f"${p.amount_minor / 100:.2f}",
            "gross_amount_minor": p.amount_minor,
            "platform_fee_display": f"${commission / 100:.2f}",
            "specialist_net_display": f"${expert_net / 100:.2f}",
            "currency": p.currency,
            "date": p.created_at.isoformat(),
            "ledger_ref": p.ledger_ref or f"CAT-{p.id}",
            "status": "Paid & Settled",
        })

    paid_orders = Order.objects.filter(student=user, paid_at__isnull=False).order_by("-created_at")
    for o in paid_orders:
        inv_num = f"INV-{o.number}"
        invoices.append({
            "invoice_number": inv_num,
            "type": "consultation_order",
            "title": o.request.title if o.request else f"Consultation with {o.expert_name}",
            "buyer_name": user.name or user.email,
            "specialist_name": o.expert_name,
            "gross_amount_display": f"${o.amount / 100:.2f}",
            "gross_amount_minor": o.amount,
            "platform_fee_display": f"${o.commission_amount / 100:.2f}",
            "specialist_net_display": f"${o.expert_amount / 100:.2f}",
            "currency": o.currency,
            "date": (o.paid_at or o.created_at).isoformat(),
            "ledger_ref": f"ORD-{o.number}",
            "status": "Escrow Funded" if o.status != "completed" else "Completed & Released",
        })

    return {
        "products": products_data,
        "deliveries": deliveries_data,
        "invoices": invoices,
        "total_unlocked_resources": len(products_data) + len(deliveries_data),
    }
