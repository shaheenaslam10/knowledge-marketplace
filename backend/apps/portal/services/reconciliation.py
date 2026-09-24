"""Financial reconciliation (Phase 10) — READ-ONLY consistency surfaces.

Reuses the ledger identity (`payments.services.ledger_check` per-order rule)
and payment/payout tables. Nothing here mutates money; repairs remain
Django-admin service actions (documented in admin-journey.md)."""

from __future__ import annotations

from django.db.models import Count, Sum

from apps.payments.models import LedgerEntry, Payment, Payout, Refund, WebhookEvent
from apps.payments.services import ledger_check


def _ledger_identity() -> list[dict]:
    result = ledger_check()
    return [
        {
            "check": "ledger_identity",
            "severity": "high",
            "order_id": str(order_id),
            "detail": {"charge_plus_refund": lhs, "allocations": rhs},
        }
        for item in result["violations"]
        for order_id, lhs, rhs in [
            (item["order_id"], item["charge_plus_refund"], item["allocations"])
        ]
    ]


def _refund_ledger_parity() -> list[dict]:
    """SUCCEEDED Refund rows per order must equal the (negative) REFUND ledger
    entries booked for that order."""
    refund_sums = {
        row["payment__order_id"]: int(row["total"] or 0)
        for row in Refund.objects.filter(status=Refund.Status.SUCCEEDED)
        .values("payment__order_id")
        .annotate(total=Sum("amount_minor"))
    }
    ledger_sums = {
        row["order_id"]: -int(row["total"] or 0)
        for row in LedgerEntry.objects.filter(entry_type=LedgerEntry.EntryType.REFUND)
        .values("order_id")
        .annotate(total=Sum("amount_minor"))
    }
    findings: list[dict] = []
    for order_id, refund_total in refund_sums.items():
        ledger_total = ledger_sums.get(order_id, 0)
        if refund_total != ledger_total:
            findings.append(
                {
                    "check": "refund_ledger_parity",
                    "severity": "high",
                    "order_id": str(order_id),
                    "detail": {"refund_rows": refund_total, "ledger_refund": ledger_total},
                }
            )
    return findings


def _payout_credit_parity() -> list[dict]:
    """Scheduled/in-transit payouts cannot exceed the unallocated expert credit."""
    credit = (
        LedgerEntry.objects.filter(entry_type="expert_credit").aggregate(total=Sum("amount_minor"))[
            "total"
        ]
        or 0
    )
    paid_out = (
        LedgerEntry.objects.filter(entry_type="payout").aggregate(total=Sum("amount_minor"))[
            "total"
        ]
        or 0
    )
    unsettled = (
        Payout.objects.filter(
            status__in=(Payout.Status.SCHEDULED, Payout.Status.IN_TRANSIT)
        ).aggregate(total=Sum("amount_minor"))["total"]
        or 0
    )
    findings: list[dict] = []
    if credit - paid_out - unsettled < 0:
        findings.append(
            {
                "check": "payout_credit_parity",
                "severity": "high",
                "detail": {
                    "expert_credit": credit,
                    "ledger_payouts": paid_out,
                    "unsettled_payouts": unsettled,
                },
            }
        )
    return findings


def _payment_ledger_coverage() -> list[dict]:
    """Every succeeded payment's order needs a charge ledger entry."""
    orders_with_charge = set(
        LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.CHARGE, order__isnull=False
        ).values_list("order_id", flat=True)
    )
    missing = Payment.objects.filter(status=Payment.Status.SUCCEEDED).exclude(
        order_id__in=orders_with_charge
    )
    return [
        {
            "check": "payment_ledger_coverage",
            "severity": "high",
            "payment_id": str(pk),
            "detail": {},
        }
        for pk in missing.values_list("pk", flat=True)
    ]


def _payment_refund_state() -> list[dict]:
    """`Payment.refunded_minor` must equal the sum of its Refund rows."""
    refund_sums = {
        row["payment_id"]: int(row["total"] or 0)
        for row in Refund.objects.values("payment_id").annotate(total=Sum("amount_minor"))
    }
    findings: list[dict] = []
    for payment in Payment.objects.filter(refunded_minor__gt=0).only("pk", "refunded_minor"):
        if refund_sums.get(payment.pk, 0) != payment.refunded_minor:
            findings.append(
                {
                    "check": "payment_refund_state",
                    "severity": "medium",
                    "payment_id": str(payment.pk),
                    "detail": {
                        "refunded_minor": payment.refunded_minor,
                        "refund_rows": refund_sums.get(payment.pk, 0),
                    },
                }
            )
    return findings


def _webhook_health() -> list[dict]:
    failed = WebhookEvent.objects.filter(status=WebhookEvent.Status.FAILED).count()
    if failed:
        return [
            {
                "check": "webhook_failures",
                "severity": "medium",
                "detail": {"failed_events": failed, "action": "replay from Django admin"},
            }
        ]
    return []


CHECKS = (
    _ledger_identity,
    _refund_ledger_parity,
    _payout_credit_parity,
    _payment_ledger_coverage,
    _payment_refund_state,
    _webhook_health,
)


def reconciliation_report() -> dict:
    findings: list[dict] = []
    for check in CHECKS:
        findings.extend(check())
    return {
        "generated_at": __import__("django.utils.timezone", fromlist=["now"]).now().isoformat(),
        "ok": not findings,
        "findings": findings,
        "summary": {
            "succeeded_payments": Payment.objects.filter(status=Payment.Status.SUCCEEDED).count(),
            "refund_count": Refund.objects.count(),
            "payout_counts": dict(Payout.objects.values_list("status").annotate(c=Count("pk"))),
            "failed_webhooks": WebhookEvent.objects.filter(
                status=WebhookEvent.Status.FAILED
            ).count(),
        },
    }
