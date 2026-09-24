"""KPI aggregation — server-side PostgreSQL queries only (docs/architecture/
observability.md §KPI dictionary). No warehouse, no precomputation; every
metric names its source table. Ranges are tz-aware UTC `[from, to)`."""

from __future__ import annotations

from datetime import UTC

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.core.models import PlatformConfig
from apps.disputes.models import Dispute
from apps.messaging.models import Message, MessageReport, Thread
from apps.notifications.models import Notification
from apps.orders.delivery import Delivery
from apps.orders.models import Order
from apps.payments.models import LedgerEntry, Payment, Payout, Refund
from apps.reviews.models import Review
from apps.service_requests.models import ServiceRequest

ENTRY_TYPES_MONEY = ("charge", "refund", "commission", "expert_credit", "fee")


def _range_bounds(date_from, date_to):
    """Normalize to aware UTC `[from, to)`; default to = now."""

    if timezone.is_naive(date_from):
        date_from = timezone.make_aware(date_from, UTC)
    if timezone.is_naive(date_to):
        date_to = timezone.make_aware(date_to, UTC)
    return date_from, date_to


def marketplace_kpis(date_from, date_to) -> dict:
    total = ServiceRequest.objects.filter(created_at__gte=date_from, created_at__lt=date_to).count()
    matched = ServiceRequest.objects.filter(
        created_at__gte=date_from, created_at__lt=date_to, status__in=("matched", "in_progress")
    ).count()
    completed = Order.objects.filter(
        created_at__gte=date_from, created_at__lt=date_to, status=Order.Status.COMPLETED
    ).count()
    cancelled = Order.objects.filter(
        created_at__gte=date_from, created_at__lt=date_to, status=Order.Status.CANCELLED
    ).count()
    active = Order.objects.filter(
        status__in=(Order.Status.ACTIVE, Order.Status.DELIVERED, Order.Status.REVISION_REQUESTED)
    ).count()
    return {
        "total_requests": total,
        "open_requests": ServiceRequest.objects.filter(status=ServiceRequest.Status.OPEN).count(),
        "matched_requests": matched,
        "completed_orders": completed,
        "cancelled_orders": cancelled,
        "active_orders": active,
        "request_to_match_rate": round(matched / total, 4) if total else None,
    }


def financial_kpis(date_from, date_to) -> dict:
    gmv = (
        Payment.objects.filter(
            paid_at__gte=date_from,
            paid_at__lt=date_to,
            status__in=(
                Payment.Status.SUCCEEDED,
                Payment.Status.REFUNDED,
                Payment.Status.PARTIALLY_REFUNDED,
            ),
        ).aggregate(total=Sum("amount_minor"))["total"]
        or 0
    )
    commission = (
        LedgerEntry.objects.filter(
            entry_type="commission", created_at__gte=date_from, created_at__lt=date_to
        ).aggregate(total=Sum("amount_minor"))["total"]
        or 0
    )
    refunds = (
        Refund.objects.filter(created_at__gte=date_from, created_at__lt=date_to).aggregate(
            total=Sum("amount_minor")
        )["total"]
        or 0
    )
    # Expert payable (ledger-source, query-time): expert_credit balance minus
    # ledger payouts minus still-unsettled scheduled amounts.
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
    payout_counts = dict(Payout.objects.values_list("status").annotate(c=Count("pk")))
    return {
        "gmv_minor": gmv,
        "commission_minor": commission,
        "expert_payable_minor": credit - paid_out - unsettled,
        "refunds_minor": refunds,
        "payouts": {status: payout_counts.get(status, 0) for status, _ in Payout.Status.choices},
        "take_rate": round(commission / gmv, 4) if gmv else None,
        "default_currency": PlatformConfig.load().default_currency,
    }


def quality_kpis(date_from, date_to) -> dict:
    reviews = Review.objects.filter(
        status=Review.Status.PUBLISHED, created_at__gte=date_from, created_at__lt=date_to
    )
    agg = reviews.aggregate(avg=Avg("rating"), count=Count("pk"))
    completed = Order.objects.filter(
        created_at__gte=date_from, created_at__lt=date_to, status=Order.Status.COMPLETED
    ).count()
    dispute_count = Dispute.objects.filter(
        created_at__gte=date_from, created_at__lt=date_to
    ).count()
    outcomes = dict(
        Dispute.objects.filter(
            resolved_at__isnull=False, created_at__gte=date_from, created_at__lt=date_to
        )
        .values_list("outcome")
        .annotate(c=Count("pk"))
    )
    deliveries = Delivery.objects.filter(created_at__gte=date_from, created_at__lt=date_to)
    delivery_count = deliveries.count()
    revisions = deliveries.filter(revision_number__gt=0).count()
    return {
        "avg_rating": round(agg["avg"], 2) if agg["avg"] is not None else None,
        "review_count": agg["count"],
        "dispute_count": dispute_count,
        "dispute_rate": round(dispute_count / completed, 4) if completed else None,
        "dispute_outcomes": {key: outcomes[key] for key in outcomes if key},
        "revision_rate": round(revisions / delivery_count, 4) if delivery_count else None,
    }


def communication_kpis(date_from, date_to) -> dict:
    return {
        "message_count": Message.objects.filter(
            created_at__gte=date_from, created_at__lt=date_to, is_hidden=False
        ).count(),
        "report_count": MessageReport.objects.filter(
            created_at__gte=date_from, created_at__lt=date_to
        ).count(),
        "open_reports": MessageReport.objects.filter(status=MessageReport.Status.OPEN).count(),
        "notifications_pushed": Notification.objects.filter(
            created_at__gte=date_from, created_at__lt=date_to, pushed_at__isnull=False
        ).count(),
        "notifications_emailed": Notification.objects.filter(
            created_at__gte=date_from, created_at__lt=date_to, emailed_at__isnull=False
        ).count(),
        "thread_count": Thread.objects.filter(
            created_at__gte=date_from, created_at__lt=date_to
        ).count(),
    }


def trend_series(date_from, date_to) -> dict:
    """Daily buckets (UTC) for the dashboard trend charts."""
    orders = (
        Order.objects.filter(created_at__gte=date_from, created_at__lt=date_to)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(c=Count("pk"))
    )
    gmv = (
        Payment.objects.filter(
            paid_at__gte=date_from,
            paid_at__lt=date_to,
            status__in=(
                Payment.Status.SUCCEEDED,
                Payment.Status.REFUNDED,
                Payment.Status.PARTIALLY_REFUNDED,
            ),
        )
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(total=Sum("amount_minor"))
    )
    disputes = (
        Dispute.objects.filter(created_at__gte=date_from, created_at__lt=date_to)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(c=Count("pk"))
    )
    return {
        "orders": {str(row["day"]): row["c"] for row in orders},
        "gmv_minor": {str(row["day"]): int(row["total"] or 0) for row in gmv},
        "disputes": {str(row["day"]): row["c"] for row in disputes},
    }


def kpis_for_range(date_from, date_to) -> dict:
    date_from, date_to = _range_bounds(date_from, date_to)
    return {
        "range": {"from": date_from.isoformat(), "to": date_to.isoformat(), "tz": "UTC"},
        "marketplace": marketplace_kpis(date_from, date_to),
        "financial": financial_kpis(date_from, date_to),
        "quality": quality_kpis(date_from, date_to),
        "communication": communication_kpis(date_from, date_to),
        "trend": trend_series(date_from, date_to),
    }
