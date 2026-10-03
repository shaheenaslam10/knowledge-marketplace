"""Operational health report (docs/architecture/observability.md).

The monitoring design says uptime is watched externally on `/healthz`, while the
*internal* signals — stuck webhooks, failed tasks, failed payouts, overdue
orders, ledger sanity — are surfaced by `manage.py ops_report` on a schedule.
The command was documented from Phase 0 and never built; Phase 12 closes that
gap, because a production deployment with no way to ask "is anything wedged?"
is not operable.

It deliberately does **not** reimplement financial consistency: that is
`portal.services.reconciliation.reconciliation_report()`, which already encodes
the ledger identity (BR-33), refund/payout parity and webhook health. This
command reuses it and adds the runtime signals it does not cover (task queue,
order deadlines).

Lives in `apps.portal` — the operations layer — because `apps.core` is
forbidden from importing `apps.payments` (import-linter shared-kernel contract).

Usage:
    python manage.py ops_report              # human-readable
    python manage.py ops_report --json       # machine-readable (cron -> alert)
    python manage.py ops_report --hours 24   # lookback for "recent failures"

Exit status is 0 when clean and 1 when any signal is in the alert state, so
cron and CI can branch on it without parsing output.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone


@dataclass
class Signal:
    name: str
    value: int
    alert: bool
    detail: str = ""
    extra: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "value": self.value,
            "alert": self.alert,
            "detail": self.detail,
            **self.extra,
        }


def collect_signals(window_hours: int = 24) -> list[Signal]:
    """Gather every operational signal. Pure read — safe to run anywhere."""
    since = timezone.now() - timedelta(hours=window_hours)
    return [
        *_financial_signals(),
        *_payout_signals(since),
        *_order_signals(),
        *_task_signals(since),
    ]


def _financial_signals() -> list[Signal]:
    """Reuses the Phase 10 reconciliation surface — one definition of correct."""
    from apps.portal.services.reconciliation import reconciliation_report

    report = reconciliation_report()
    findings = report["findings"]
    high = [f for f in findings if f.get("severity") == "high"]
    summary = report["summary"]
    return [
        Signal(
            "finance.reconciliation_findings",
            len(findings),
            bool(high),
            "ledger identity / refund / payout parity (BR-33)",
            extra={"high_severity": len(high)},
        ),
        Signal(
            "webhooks.failed",
            int(summary.get("failed_webhooks", 0)),
            int(summary.get("failed_webhooks", 0)) > 0,
            "replay or investigate",
        ),
    ]


def _payout_signals(since) -> list[Signal]:
    from apps.payments.models import Payout

    failed = Payout.objects.filter(status=Payout.Status.FAILED).count()
    stuck = Payout.objects.filter(status=Payout.Status.IN_TRANSIT, created_at__lt=since).count()
    return [
        Signal("payouts.failed", failed, failed > 0, "expert not paid"),
        Signal("payouts.stuck_in_transit", stuck, stuck > 0, "in transit past the window"),
    ]


def _order_signals() -> list[Signal]:
    from apps.orders.models import Order
    from apps.orders.services import OVERDUE_FLAG_GRACE_HOURS

    cutoff = timezone.now() - timedelta(hours=OVERDUE_FLAG_GRACE_HOURS)
    overdue = Order.objects.filter(
        status__in=[Order.Status.ACTIVE, Order.Status.REVISION_REQUESTED],
        delivery_due_at__lt=cutoff,
    ).count()
    awaiting = Order.objects.filter(status=Order.Status.AWAITING_PAYMENT).count()
    disputed = Order.objects.filter(has_open_dispute=True).count()
    return [
        Signal("orders.overdue", overdue, overdue > 0, "past deadline + grace, not delivered"),
        # Business-as-usual counts: reported for context, never alerting.
        Signal("orders.awaiting_payment", awaiting, False),
        Signal("orders.open_disputes", disputed, False, "payouts frozen while open"),
    ]


def _task_signals(since) -> list[Signal]:
    """django-q2 health. The broker is the ORM, so this is an ordinary query."""
    from django_q.models import Failure, Schedule

    recent_failures = Failure.objects.filter(started__gte=since).count()
    # A schedule whose next_run is an hour in the past means nothing is draining
    # the queue — the single clearest "the worker is down" signal available.
    overdue_schedules = Schedule.objects.filter(
        next_run__lt=timezone.now() - timedelta(hours=1)
    ).count()
    return [
        Signal("tasks.failed", recent_failures, recent_failures > 0, "see django-q Failures"),
        Signal(
            "tasks.schedules_overdue",
            overdue_schedules,
            overdue_schedules > 0,
            "qcluster may be down",
        ),
    ]


class Command(BaseCommand):
    help = "Operational health report: webhooks, payouts, orders, tasks, ledger sanity."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", dest="as_json", help="JSON output.")
        parser.add_argument(
            "--hours", type=int, default=24, help="Lookback window in hours (default 24)."
        )

    def handle(self, *args, **options):
        window_hours = options["hours"]
        signals = collect_signals(window_hours)
        degraded = [s for s in signals if s.alert]

        if options["as_json"]:
            self.stdout.write(
                json.dumps(
                    {
                        "generated_at": timezone.now().isoformat(),
                        "window_hours": window_hours,
                        "status": "alert" if degraded else "ok",
                        "signals": [s.as_dict() for s in signals],
                    },
                    indent=2,
                )
            )
        else:
            self.stdout.write(f"Ops report — last {window_hours}h")
            self.stdout.write("=" * 62)
            for signal in signals:
                marker = "ALERT" if signal.alert else "ok   "
                line = f"[{marker}] {signal.name:<32} {signal.value}"
                if signal.detail:
                    line += f"  — {signal.detail}"
                self.stdout.write(line)
            self.stdout.write("=" * 62)
            self.stdout.write(
                self.style.ERROR(f"{len(degraded)} signal(s) need attention")
                if degraded
                else self.style.SUCCESS("all clear")
            )

        if degraded:
            raise SystemExit(1)
