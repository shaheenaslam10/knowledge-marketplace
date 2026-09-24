"""Payment services — money state changes live HERE only (views/admin/tasks
are thin callers; docs/workflows/payments.md).

All amounts are integer minor units (ADR-0009). Commission is NEVER
recomputed here: the order's booked snapshot (commission_amount /
expert_amount) is the immutable truth (BR-17/22).

Layering (ADR-0005 amendment): payments is a lower layer — orders are
referenced by string FKs and duck-typed instances; the order activation is
inverted through the `payment_confirmed` signal (received by apps.orders).
"""

from __future__ import annotations

import logging
import uuid
from typing import Protocol

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core import services as core_services
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.core.money import allocate
from apps.payments.config import commission_split
from apps.payments.gateway import get_gateway
from apps.payments.models import LedgerEntry, Payment, Payout, Refund, WebhookEvent
from apps.payments.signals import payment_confirmed

logger = logging.getLogger(__name__)

PAYOUT_MIN_MINOR = 1000  # BR-30 default (runtime value = core.PlatformConfig)


class OrderLike(Protocol):
    """Structural view of an order for type checkers — no upward import."""

    pk: int
    amount: int
    currency: str
    commission_amount: int
    expert_amount: int
    commission_rate: object
    status: str
    student_id: int
    number: str


class PaymentFailedError(DomainError):
    status_code = 402
    default_code = "payment_failed"
    default_message = "The payment attempt failed."


def _student_guard(user, order: OrderLike) -> None:
    if order.student_id != user.id:
        raise PermissionDeniedError("You can only pay for your own orders.")


def _ledger(**fields) -> LedgerEntry:
    return LedgerEntry.objects.create(**fields)


# --- lifecycle: create → confirm → (signal) → payout/refund --------------------


@transaction.atomic
def _create_payment_row(order: OrderLike, gateway_name: str) -> Payment:
    result = get_gateway(gateway_name).create_payment(
        order_id=str(order.pk), amount_minor=order.amount, currency=order.currency
    )
    result.validate()
    return Payment.objects.create(
        order=order,
        gateway=gateway_name,
        provider_reference=f"{gateway_name}-pay-{uuid.uuid4().hex[:12]}",
        amount_minor=order.amount,
        currency=order.currency,
        instructions=result.instructions or "",
    )


@transaction.atomic
def start_payment(order: OrderLike, *, actor) -> Payment:
    """Create (or re-arm after failure/cancellation) the order's payment.

    Amounts are ALWAYS taken from the booked order — the client cannot
    influence them. Idempotent: a pending payment returns as-is.
    """
    _student_guard(actor, order)
    if order.status != "awaiting_payment":
        raise DomainError("Only an order awaiting payment can be paid.", code="invalid_transition")
    gateway_name = get_gateway().name
    payment = Payment.objects.filter(order=order).first()
    if payment is None:
        payment = _create_payment_row(order, gateway_name)
    if payment.status == Payment.Status.SUCCEEDED:
        raise DomainError("This order is already paid.", code="duplicate_payment")
    if payment.status == Payment.Status.PENDING and payment.provider_reference:
        return payment  # idempotent re-entry
    # (re)arm a failed/canceled attempt with a fresh provider reference.
    payment.gateway = gateway_name
    payment.status = Payment.Status.PENDING
    payment.amount_minor = order.amount  # server-side truth, even on re-arm
    payment.currency = order.currency
    payment.failure_reason = ""
    payment.canceled_at = None
    payment.provider_reference = f"{gateway_name}-pay-{uuid.uuid4().hex[:12]}"
    payment.save(
        update_fields=[
            "gateway",
            "status",
            "amount_minor",
            "currency",
            "failure_reason",
            "canceled_at",
            "provider_reference",
            "updated_at",
        ]
    )
    audit_log(
        actor,
        action="payment.start",
        obj=payment,
        detail={"order": order.number, "gateway": gateway_name},
    )
    return payment


class _AttemptFailed(Exception):
    """Internal: the provider rejected the attempt (tx rolls back cleanly)."""


def confirm_payment(payment: Payment, *, actor=None, source: str = "operator") -> Payment:
    """The ONE confirmation path — operator action (manual rails), dev/test
    confirm, or webhook ingestion all land here.

    Success writes payment + ledger + the `payment_confirmed` signal (order
    activation) in ONE transaction. A failed attempt rolls that transaction
    back completely, then records `Payment.FAILED` in its own transaction so
    the student sees the failure reason and can retry (BR-23 failure mode).
    """
    try:
        return _confirm_payment_atomic(payment.pk, actor=actor, source=source)
    except _AttemptFailed as exc:
        _mark_payment_failed(payment.pk, reason=str(exc))
        raise PaymentFailedError(
            "The payment attempt failed — you can retry from the order page."
        ) from exc


@transaction.atomic
def _mark_payment_failed(payment_pk: int, *, reason: str) -> None:
    updated = Payment.objects.filter(
        pk=payment_pk,
        status__in=[
            Payment.Status.PENDING,
            Payment.Status.REQUIRES_ACTION,
            Payment.Status.PROCESSING,
        ],
    ).update(status=Payment.Status.FAILED, failure_reason=reason[:255], updated_at=timezone.now())
    if updated:
        payment = Payment.objects.get(pk=payment_pk)
        audit_log(None, action="payment.failed", obj=payment, detail={"reason": reason[:255]})
        from apps.notifications.services import notify

        notify(
            payment.order.student_id,
            "payment_failed",
            title="Payment failed",
            body="Your payment attempt failed — you can retry from the order page.",
            url=f"/orders/{payment.order_id}",
            context={"payment_id": str(payment.pk)},
        )


@transaction.atomic
def _confirm_payment_atomic(payment_pk: int, *, actor=None, source: str) -> Payment:
    """Lock order first, then the payment row (matches the cancellation
    path's lock order: order → payment) and re-validate everything under
    lock: status, amount parity with the booked order, currency."""
    payment = Payment.objects.select_related("order").get(pk=payment_pk)
    # Lock the order row WITHOUT importing apps.orders (ADR-0005 amendment):
    # the related model comes from the FK definition itself.
    order_model = Payment._meta.get_field("order").related_model
    order = order_model.objects.select_for_update().get(pk=payment.order_id)
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == Payment.Status.SUCCEEDED:
        raise DomainError("This payment is already confirmed.", code="duplicate_payment")
    if payment.status in (Payment.Status.CANCELED, Payment.Status.REFUNDED):
        raise DomainError("This payment was canceled or refunded.", code="invalid_transition")
    if order.status != "awaiting_payment":
        raise DomainError(
            "Only an order awaiting payment can be confirmed.", code="invalid_transition"
        )
    if payment.amount_minor != order.amount or payment.currency != order.currency:
        raise DomainError("Payment amount does not match the booked order.", code="amount_mismatch")
    if not payment.provider_reference:
        raise DomainError("Payment has no provider reference.", code="validation_error")

    gateway = get_gateway(payment.gateway)
    confirmation = gateway.confirm_payment(
        provider_reference=payment.provider_reference, amount_minor=payment.amount_minor
    )
    if confirmation.status != "succeeded":
        raise _AttemptFailed(
            "Provider reported failure (simulated)"
            if gateway.name == "manual"
            else "Provider reported failure"
        )

    payment.status = Payment.Status.SUCCEEDED
    payment.paid_at = timezone.now()
    payment.provider_reference = confirmation.reference or payment.provider_reference
    payment.save(update_fields=["status", "paid_at", "provider_reference", "updated_at"])

    commission, expert_net = (
        commission_split(payment.amount_minor, order.commission_rate)
        if order.commission_amount == 0
        else (order.commission_amount, order.expert_amount)
    )
    _ledger(
        entry_type=LedgerEntry.EntryType.CHARGE,
        amount_minor=payment.amount_minor,
        currency=payment.currency,
        order=order,
        user_id=order.student_id,
        description=f"Charge for order {order.number} ({gateway.name})",
        provider_object_id=payment.provider_reference or "",
    )
    _ledger(
        entry_type=LedgerEntry.EntryType.COMMISSION,
        amount_minor=commission,
        currency=payment.currency,
        order=order,
        description=f"Platform commission for order {order.number}",
    )
    _ledger(
        entry_type=LedgerEntry.EntryType.EXPERT_CREDIT,
        amount_minor=expert_net,
        currency=payment.currency,
        order=order,
        user_id=order.expert_id,
        description=f"Expert credit for order {order.number}",
    )
    audit_log(
        actor, action="payment.confirm", obj=payment, detail={"source": source, "ledgered": True}
    )

    payment_confirmed.send(sender=Payment, payment=payment, source=source)
    return payment


def confirm_order_payment(order, *, actor=None, source: str = "admin") -> Payment:
    """Operator flow: ensure a payment row exists, then confirm it. Only
    meaningful on manual rails — a provider-rails payment must be confirmed
    by its provider (webhook), never by a local button."""
    if get_gateway().name != "manual":
        raise DomainError(
            "Operator confirmation is only available on manual rails; provider payments confirm via webhooks.",
            code="feature_disabled",
        )
    payment = Payment.objects.filter(order=order).first()
    if payment is None:
        payment = _create_payment_row(order, get_gateway().name)
    elif payment.status == Payment.Status.SUCCEEDED:
        raise DomainError("This payment is already confirmed.", code="duplicate_payment")
    return confirm_payment(payment, actor=actor, source=source)


@transaction.atomic
def void_payment_for_order(order, *, actor=None) -> int:
    """Order cancellation (BR-26) closes any open payment attempt."""
    updated = Payment.objects.filter(
        order=order,
        status__in=[
            Payment.Status.PENDING,
            Payment.Status.REQUIRES_ACTION,
            Payment.Status.PROCESSING,
        ],
    ).update(status=Payment.Status.CANCELED, canceled_at=timezone.now(), updated_at=timezone.now())
    if updated:
        audit_log(actor, action="payment.void", obj=order, detail={"voided": updated})
    return updated


# --- refunds (BR-26..28; dispute-specific policies are Phase 9) -----------------


@transaction.atomic
def issue_refund(
    payment: Payment, *, amount_minor: int, reason: str, note: str = "", initiated_by=None
) -> Refund:
    """Staff-only. Full or partial, validated against the refundable balance,
    with proportional commission/expert-credit reversal so the ledger identity
    `charge + refund == commission + expert_credit + fee` keeps holding.
    Post-payout refunds may drive expert_credit negative — the shortfall is an
    admin-recovery item (Phase 9 automates clawbacks)."""
    if initiated_by is None or not getattr(initiated_by, "is_staff", False):
        raise PermissionDeniedError("Only support can issue refunds (BR-26..28).")
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status not in (Payment.Status.SUCCEEDED, Payment.Status.PARTIALLY_REFUNDED):
        raise DomainError("Only a succeeded payment can be refunded.", code="invalid_transition")
    refundable = payment.amount_minor - payment.refunded_minor
    if amount_minor <= 0 or amount_minor > refundable:
        raise DomainError(
            f"Refund must be between 1 and {refundable} minor units.", code="validation_error"
        )
    if reason not in Refund.Reason.values:
        raise DomainError("Unknown refund reason.", code="validation_error")

    order = payment.order
    charge_commission = order.commission_amount
    charge_credit = order.expert_amount
    reversed_commission, reversed_credit = allocate(
        amount_minor, [max(charge_commission, 0), max(charge_credit, 0)]
    )
    gateway = get_gateway(payment.gateway)
    gateway_ref = gateway.refund(
        payment_reference=payment.provider_reference or "", amount_minor=amount_minor, reason=reason
    )
    refund = Refund.objects.create(
        payment=payment,
        amount_minor=amount_minor,
        currency=payment.currency,
        reason=reason,
        note=note[:255],
        status=Refund.Status.SUCCEEDED,
        provider_reference=gateway_ref.reference,
        initiated_by=initiated_by,
        processed_at=timezone.now(),
    )
    _ledger(
        entry_type=LedgerEntry.EntryType.REFUND,
        amount_minor=-amount_minor,
        currency=payment.currency,
        order=order,
        user_id=order.student_id,
        description=f"Refund for order {order.number} ({reason})",
        provider_object_id=gateway_ref.reference,
    )
    if reversed_credit:
        _ledger(
            entry_type=LedgerEntry.EntryType.EXPERT_CREDIT,
            amount_minor=-reversed_credit,
            currency=payment.currency,
            order=order,
            user_id=order.expert_id,
            description=f"Expert credit reversal (refund) for order {order.number}",
        )
    if reversed_commission:
        _ledger(
            entry_type=LedgerEntry.EntryType.COMMISSION,
            amount_minor=-reversed_commission,
            currency=payment.currency,
            order=order,
            description=f"Commission reversal (refund) for order {order.number}",
        )
    payment.refunded_minor += amount_minor
    payment.status = (
        Payment.Status.REFUNDED
        if payment.refunded_minor >= payment.amount_minor
        else Payment.Status.PARTIALLY_REFUNDED
    )
    payment.save(update_fields=["refunded_minor", "status", "updated_at"])
    audit_log(
        initiated_by,
        action="payment.refund",
        obj=payment,
        detail={"amount_minor": amount_minor, "reason": reason},
    )
    return refund


# --- payouts (BR-30) ------------------------------------------------------------


def expert_credit_balance(order) -> int:
    return int(
        LedgerEntry.objects.filter(
            order=order, entry_type=LedgerEntry.EntryType.EXPERT_CREDIT
        ).aggregate(total=models_sum("amount_minor"))["total"]
        or 0
    )


def models_sum(field: str):
    from django.db.models import Sum

    return Sum(field)


@transaction.atomic
def schedule_payout(order, *, now=None):
    """Create the (single) payout for a completed order from its remaining
    expert-credit balance. Idempotent; below the BR-30 floor it rolls forward
    (returns None)."""
    if order.status != "completed":
        raise DomainError(
            "Payouts schedule for completed orders only (BR-30).", code="invalid_transition"
        )
    if Payout.objects.filter(order=order).exists():
        return Payout.objects.filter(order=order).first()
    if order.has_open_dispute:
        logger.info("payout rolled forward order=%s dispute open (BR-40 freeze)", order.number)
        return None
    amount = expert_credit_balance(order)
    if amount < core_services.payout_min_minor():
        logger.info(
            "payout rolled forward order=%s amount_minor=%s below floor", order.number, amount
        )
        return None
    return Payout.objects.create(
        order=order, expert_id=order.expert_id, amount_minor=amount, currency=order.currency
    )


@transaction.atomic
def settle_payout(payout: Payout, *, actor=None) -> Payout:
    """Staff-only settlement (manual rails: 'operator executed the external
    transfer'; provider rails: the sweeper/gateway transfer). Writes the
    payout ledger entry."""
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only staff can settle payouts.")
    payout = Payout.objects.select_for_update().get(pk=payout.pk)
    if payout.status == Payout.Status.PAID:
        raise DomainError("This payout is already settled.", code="duplicate_payout")
    if payout.status not in (
        Payout.Status.SCHEDULED,
        Payout.Status.FAILED,
        Payout.Status.IN_TRANSIT,
    ):
        raise DomainError("Payout is not settleable.", code="invalid_transition")
    # BR-40 freeze: re-read the order under lock (same lock open_dispute takes)
    order = type(payout.order).objects.select_for_update().get(pk=payout.order_id)
    if order.has_open_dispute:
        raise DomainError("This payout is frozen by an open dispute (BR-40).", code="payout_frozen")
    gateway = get_gateway()
    gateway_ref = gateway.transfer(
        destination_account=f"expert:{payout.expert_id}",
        amount_minor=payout.amount_minor,
        currency=payout.currency,
        source_reference=payout.provider_reference or None,
    )
    payout.status = Payout.Status.PAID
    payout.provider_reference = gateway_ref.reference
    payout.failure_reason = ""
    payout.settled_at = timezone.now()
    payout.save(
        update_fields=["status", "provider_reference", "failure_reason", "settled_at", "updated_at"]
    )
    _ledger(
        entry_type=LedgerEntry.EntryType.PAYOUT,
        amount_minor=-payout.amount_minor,
        currency=payout.currency,
        order=payout.order,
        user_id=payout.expert_id,
        description=f"Payout for order {payout.order.number}",
        provider_object_id=gateway_ref.reference,
    )
    audit_log(
        actor, action="payout.settle", obj=payout, detail={"amount_minor": payout.amount_minor}
    )
    from apps.notifications.services import notify

    notify(
        payout.expert_id,
        "payout_paid",
        title="Payout sent",
        body="Your earnings payout has been sent.",
        url="/orders",
        context={"payout_id": str(payout.pk)},
    )
    return payout


@transaction.atomic
def mark_payout_failed(payout: Payout, *, actor=None, reason: str) -> Payout:
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only staff can fail payouts.")
    payout = Payout.objects.select_for_update().get(pk=payout.pk)
    if payout.status == Payout.Status.PAID:
        raise DomainError("A paid payout cannot be marked failed.", code="invalid_transition")
    payout.status = Payout.Status.FAILED
    payout.failure_reason = reason[:255]
    payout.save(update_fields=["status", "failure_reason", "updated_at"])
    audit_log(actor, action="payout.fail", obj=payout, detail={"reason": reason[:255]})
    return payout


def payout_sweeper(now=None) -> int:
    """Hourly job: schedule payouts for completed, dispute-free orders that
    have none yet (BR-30). Settlement stays an explicit operator/gateway
    action — never an automatic sweep."""
    created = 0
    paid_payments = (
        Payment.objects.filter(status=Payment.Status.SUCCEEDED, order__status="completed")
        .select_related("order")
        .exclude(order_id__in=Payout.objects.values("order_id"))
        .exclude(order__has_open_dispute=True)
    )
    for payment in paid_payments:
        if schedule_payout(payment.order) is not None:
            created += 1
    return created


# --- ledger integrity (BR-32) ----------------------------------------------------


def ledger_check() -> dict:
    """Nightly invariant check: for every order with entries,
    charge + refund == commission + expert_credit + fee. Returns a summary;
    violations are logged (ops alert surface)."""
    violations: list[dict] = []
    order_ids = (
        LedgerEntry.objects.filter(order__isnull=False)
        .values_list("order_id", flat=True)
        .distinct()
    )
    checked = 0
    for order_id in order_ids:
        sums = (
            LedgerEntry.objects.filter(order_id=order_id)
            .values("entry_type")
            .annotate(total=models_sum("amount_minor"))
        )
        totals = {row["entry_type"]: int(row["total"] or 0) for row in sums}
        lhs = totals.get("charge", 0) + totals.get("refund", 0)
        rhs = totals.get("commission", 0) + totals.get("expert_credit", 0) + totals.get("fee", 0)
        checked += 1
        if lhs != rhs:
            violations.append({"order_id": order_id, "charge_plus_refund": lhs, "allocations": rhs})
    if violations:
        logger.error("ledger identity violations: %s", violations)
    return {"orders_checked": checked, "violations": violations}


def earnings_for(user) -> dict:
    """Expert earnings foundation — a query over ledger entries, never a
    denormalized balance (BR-32)."""
    totals = (
        LedgerEntry.objects.filter(user=user)
        .values("entry_type")
        .annotate(total=models_sum("amount_minor"))
    )
    by_type = {row["entry_type"]: int(row["total"] or 0) for row in totals}
    credit = by_type.get("expert_credit", 0)
    paid_out = -by_type.get("payout", 0)
    return {
        "expert_credit_minor": credit,
        "payout_minor": paid_out,
        "outstanding_minor": credit - paid_out,
    }


def remaining_payable(order) -> int:
    """Remaining payable balance to the expert for an order (payout entries
    are negative, so the payable balance is credit + payouts)."""
    payouts = (
        LedgerEntry.objects.filter(order=order, entry_type=LedgerEntry.EntryType.PAYOUT).aggregate(
            total=models_sum("amount_minor")
        )["total"]
        or 0
    )
    return expert_credit_balance(order) + int(payouts)


def webhook_events_reprocessable() -> list[WebhookEvent]:
    return list(WebhookEvent.objects.filter(status=WebhookEvent.Status.FAILED))
