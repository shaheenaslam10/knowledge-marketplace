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

import uuid
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.files.models import Attachment
from apps.orders.delivery import Delivery, OrderEvent
from apps.orders.models import Order
from apps.payments import services as payments_services
from apps.service_requests import services as request_services

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
    ("disputed", "completed"): "resolve_release",  # executed by the Phase 9 resolution service
    ("disputed", "cancelled"): "resolve_refund",
}


def _record_event(order: Order, event_type: str, *, actor=None, **data: Any) -> OrderEvent:
    return OrderEvent.objects.create(order=order, event_type=event_type, actor=actor, data=data)


@transaction.atomic
def transition(order: Order, to_status: str, *, actor=None, event_type: str | None = None) -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    action = TRANSITIONS.get((order.status, to_status))
    if action is None:
        raise DomainError(
            f"Cannot move an order from '{order.status}' to '{to_status}'.",
            code="invalid_transition",
        )
    order.status = to_status
    order.save(update_fields=["status", "updated_at"])
    _record_event(order, event_type or to_status, actor=actor)
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
