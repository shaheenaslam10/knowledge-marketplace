"""Phase 12: `manage.py ops_report` — the internal monitoring surface.

observability.md has promised this command since Phase 0. These tests pin the
contract the cron job and the deploy smoke depend on: clean exits 0, a real
problem exits 1, and --json stays parseable.
"""

from __future__ import annotations

import json
from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.payments.models import LedgerEntry, WebhookEvent
from apps.portal.tests.test_portal import _paid_completed_order

pytestmark = pytest.mark.django_db


def run_command(*args) -> tuple[str, int]:
    out = StringIO()
    try:
        call_command("ops_report", *args, stdout=out)
        return out.getvalue(), 0
    except SystemExit as exc:
        return out.getvalue(), int(exc.code or 0)


class TestCleanSystem:
    def test_reports_all_clear_and_exits_zero(self):
        output, code = run_command()
        assert code == 0
        assert "all clear" in output
        assert "orders.overdue" in output
        assert "tasks.failed" in output

    def test_json_output_is_parseable(self):
        output, code = run_command("--json")
        assert code == 0
        payload = json.loads(output)
        assert payload["status"] == "ok"
        assert payload["window_hours"] == 24
        names = {s["name"] for s in payload["signals"]}
        assert {
            "finance.reconciliation_findings",
            "webhooks.failed",
            "payouts.failed",
            "payouts.stuck_in_transit",
            "orders.overdue",
            "orders.open_disputes",
            "tasks.failed",
            "tasks.schedules_overdue",
        } <= names
        assert all(s["alert"] is False for s in payload["signals"])

    def test_window_is_configurable(self):
        output, _ = run_command("--json", "--hours", "72")
        assert json.loads(output)["window_hours"] == 72


class TestDegradedSystem:
    def test_failed_webhook_alerts_and_exits_one(self):
        WebhookEvent.objects.create(
            provider="manual", event_id="evt_1", type="payment.failed", status="failed"
        )
        output, code = run_command()
        assert code == 1
        assert "ALERT" in output
        assert "need attention" in output

    def test_failed_webhook_flagged_in_json(self):
        WebhookEvent.objects.create(
            provider="manual", event_id="evt_2", type="payment.failed", status="failed"
        )
        output, code = run_command("--json")
        assert code == 1
        payload = json.loads(output)
        assert payload["status"] == "alert"
        signal = next(s for s in payload["signals"] if s["name"] == "webhooks.failed")
        assert signal["alert"] is True
        assert signal["value"] == 1

    def test_a_real_completed_order_keeps_the_ledger_balanced(self, django_user_model):
        """Guard against false positives: a genuine paid+completed order must
        not trip the reconciliation signal."""
        _paid_completed_order(django_user_model)
        output, code = run_command("--json")
        payload = json.loads(output)
        finding = next(
            s for s in payload["signals"] if s["name"] == "finance.reconciliation_findings"
        )
        assert finding["alert"] is False, finding
        assert code == 0

    def test_broken_ledger_identity_alerts(self, django_user_model):
        """BR-33: charge + refund must equal commission + expert_credit + fee.

        An unallocated charge on a real order breaks the identity — exactly the
        condition the nightly report exists to catch before anyone notices via
        the bank statement.
        """
        _, _, order = _paid_completed_order(django_user_model)
        LedgerEntry.objects.create(
            order=order,
            user=order.student,
            entry_type=LedgerEntry.EntryType.CHARGE,
            amount_minor=5000,
            currency=order.currency,
        )
        output, code = run_command("--json")
        assert code == 1
        payload = json.loads(output)
        finding = next(
            s for s in payload["signals"] if s["name"] == "finance.reconciliation_findings"
        )
        assert finding["alert"] is True
        assert finding["high_severity"] >= 1


class TestSignalCollection:
    def test_stale_payout_uses_the_lookback_window(self):
        from apps.payments.models import Payout
        from apps.portal.management.commands.ops_report import collect_signals

        signals = {s.name: s for s in collect_signals(window_hours=24)}
        assert signals["payouts.stuck_in_transit"].value == 0
        assert Payout.objects.count() == 0

    def test_overdue_schedule_signals_a_dead_worker(self):
        from django_q.models import Schedule

        from apps.portal.management.commands.ops_report import collect_signals

        Schedule.objects.create(
            func="apps.core.tasks.smoke_task",
            next_run=timezone.now() - timedelta(hours=5),
        )
        signals = {s.name: s for s in collect_signals()}
        assert signals["tasks.schedules_overdue"].value == 1
        assert signals["tasks.schedules_overdue"].alert is True
