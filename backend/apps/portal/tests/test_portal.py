"""Phase 10 portal suite — staff authorization, KPI math vs constructed
fixtures, moderation queue actions, config editor safety, reconciliation
detection, users overview. The frontend is never the authorization layer."""

from decimal import Decimal

import pytest
from django.test import Client

from apps.audit.models import AuditEvent
from apps.core.models import PlatformConfig
from apps.disputes.models import Dispute
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.messaging import services as messaging
from apps.messaging.models import MessageReport
from apps.orders import services as order_services
from apps.payments.services import confirm_order_payment, schedule_payout, start_payment
from apps.portal.services.config_editor import update_config
from apps.portal.services.reconciliation import reconciliation_report
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


def _staff(django_user_model, group="admin"):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Group

    user = get_user_model().objects.create_user(
        email=f"ops-{group}-{get_user_model().objects.count()}@demo.local",
        password=PASSWORD,
        name="Ops",
        is_staff=True,
    )
    user.groups.add(Group.objects.get_or_create(name=group)[0])
    return user


def _student(django_user_model):
    return django_user_model.objects.create_user(
        email=f"stu-{django_user_model.objects.count()}@demo.local", password=PASSWORD, name="S"
    )


def _paid_completed_order(django_user_model, *, complete=True):
    student = _student(django_user_model)
    expert = make_expert(
        django_user_model, f"exp-{django_user_model.objects.count()}@demo.local", "E"
    )
    subject = ensure_term(kind="subject", name=f"OpsSub{django_user_model.objects.count()}")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "T",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    request_services.mark_matched(request)
    order = order_services.create_order_for_request(
        request,
        expert=expert,
        amount=10000,
        currency="USD",
        source=order_services.Order.Source.OPEN_BID,
    )
    order = type(order).objects.get(pk=order.pk)
    start_payment(order, actor=student)
    admin = django_user_model.objects.filter(is_staff=True).first() or _staff(django_user_model)
    confirm_order_payment(order, actor=admin)
    order = type(order).objects.get(pk=order.pk)
    if complete:
        order_services.submit_delivery(
            order, expert=expert, summary="Delivered in full, on time, as agreed."
        )
        order_services.approve_delivery(order, actor=student)
        order = type(order).objects.get(pk=order.pk)
    return student, expert, order


class TestPortalAuthorization:
    """Staff-only surface: anon 401, students 403, support reads OK,
    config writes admin-only."""

    def test_anon_and_students_denied(self, django_user_model):
        client = Client()
        assert client.get("/api/v1/ops/kpis").status_code == 401
        student = _student(django_user_model)
        api_login(client, student)
        for path in (
            "/api/v1/ops/kpis",
            "/api/v1/ops/reports",
            "/api/v1/ops/disputes",
            "/api/v1/ops/audit",
            "/api/v1/ops/config",
            "/api/v1/ops/reconciliation",
            "/api/v1/ops/users",
        ):
            assert client.get(path).status_code == 403, path

    def test_support_can_read_but_not_write_config(self, django_user_model):
        support = _staff(django_user_model, group="support")
        client = Client()
        api_login(client, support)
        assert client.get("/api/v1/ops/kpis?range=7d").status_code == 200
        assert client.get("/api/v1/ops/config").status_code == 200
        response = client.put(
            "/api/v1/ops/config",
            data='{"dispute_window_days": 10}',
            content_type="application/json",
        )
        assert response.status_code == 403
        config = PlatformConfig.load()
        config.refresh_from_db()
        assert config.dispute_window_days == 7

    def test_admin_updates_config_and_it_is_audited(self, django_user_model):
        admin = _staff(django_user_model, group="admin")
        client = Client()
        api_login(client, admin)
        response = client.put(
            "/api/v1/ops/config",
            data='{"dispute_window_days": 10, "open_commission_rate": 0.18}',
            content_type="application/json",
        )
        assert response.status_code == 200, response.json()
        assert response.json()["dispute_window_days"] == 10
        config = PlatformConfig.load()
        assert config.dispute_window_days == 10
        assert config.open_commission_rate == Decimal("0.1800")
        assert AuditEvent.objects.filter(action="platform.config_updated").exists()

    def test_config_validation_and_immutable_fields(self, django_user_model):
        admin = _staff(django_user_model, group="admin")
        with pytest.raises(Exception, match="between"):
            update_config(admin, {"dispute_window_days": 400})
        with pytest.raises(Exception, match="immutable"):
            update_config(admin, {"default_currency": "EUR"})
        with pytest.raises(Exception, match="invalid value"):
            update_config(admin, {"min_offer_minor": "not-a-number"})
        assert PlatformConfig.load().dispute_window_days == 7

    def test_config_change_updates_domain_behavior(self, django_user_model):
        # BR-40 window flows through PlatformConfig (documented in the KPI/config docs)
        admin = _staff(django_user_model, group="admin")
        update_config(admin, {"dispute_window_days": 10})
        from apps.core import services as core_services

        assert core_services.dispute_window_days() == 10


class TestKpiMath:
    def test_kpis_match_constructed_fixtures(self, django_user_model):
        from django.utils import timezone

        from apps.portal.services.analytics import kpis_for_range

        student, _expert, order = _paid_completed_order(django_user_model)
        # one dispute with full refund outcome → exercises financial + quality
        admin = _staff(django_user_model, group="admin")
        dispute = Dispute.objects.filter(order=order).first() or None
        if dispute is None:
            from apps.disputes import services as disputes

            dispute = disputes.open_dispute(
                order,
                actor=student,
                reason="quality_below_expectations",
                description="The delivered work misses two of the three agreed sections.",
            )
            disputes.take_case(dispute, actor=admin)
            disputes.resolve(
                dispute,
                actor=admin,
                outcome="refund_student_full",
                resolution_notes="Full refund after reviewing the delivered files.",
            )
        # second clean completed order (the disputed one ends cancelled — BR-41 map)
        _s2, _e2, clean_order = _paid_completed_order(django_user_model)
        assert clean_order.status == "completed"
        now = timezone.now()
        kpis = kpis_for_range(now - timezone.timedelta(days=1), now)
        assert kpis["marketplace"]["total_requests"] >= 2
        assert kpis["marketplace"]["completed_orders"] >= 1
        assert kpis["marketplace"]["cancelled_orders"] >= 1
        assert kpis["financial"]["gmv_minor"] >= 10000
        assert kpis["financial"]["refunds_minor"] >= 10000
        assert kpis["quality"]["dispute_count"] >= 1
        assert kpis["quality"]["dispute_outcomes"].get("refund_student_full", 0) >= 1
        assert kpis["trend"]["orders"]
        # rate guards divide-by-zero on empty DB ranges
        empty = kpis_for_range(
            now - timezone.timedelta(days=400), now - timezone.timedelta(days=390)
        )
        assert empty["marketplace"]["request_to_match_rate"] is None
        assert empty["financial"]["take_rate"] is None


class TestModerationQueue:
    def _reported_message(self, django_user_model):
        student, expert, order = _paid_completed_order(django_user_model)
        thread = messaging.get_or_create_thread(
            context_type="order", context=type(order).objects.get(pk=order.pk), actor=student
        )
        message = messaging.send_message(
            thread, sender=expert, body="Pay me outside the platform instead."
        )
        return messaging.report_message(message, actor=student, reason="off_platform"), expert

    def test_report_review_dismiss_and_hide(self, django_user_model):
        support = _staff(django_user_model, group="support")
        report, _expert = self._reported_message(django_user_model)

        from apps.portal.services.moderation import ReportAction, review_report

        reviewed = review_report(
            report, actor=support, action=ReportAction.CONFIRM_HIDE, note="Off-platform demand"
        )
        reviewed.refresh_from_db()
        assert reviewed.status == MessageReport.Status.REVIEWED
        assert reviewed.reviewed_by_id == support.pk
        assert reviewed.message.is_hidden is True
        assert AuditEvent.objects.filter(action="moderation.report_confirm_hide").exists()
        assert AuditEvent.objects.filter(action="moderation.message_hidden").exists()

        # acting again fails loudly (idempotency contract: no silent double-close)
        from apps.core.exceptions import DomainError

        with pytest.raises(DomainError, match="already reviewed"):
            review_report(reviewed, actor=support, action=ReportAction.DISMISS)

        report2, _ = self._reported_message(django_user_model)
        dismissed = review_report(report2, actor=support, action=ReportAction.DISMISS)
        dismissed.refresh_from_db()
        assert dismissed.status == MessageReport.Status.DISMISSED
        assert dismissed.message.is_hidden is False

    def test_report_queue_api_filters(self, django_user_model):
        support = _staff(django_user_model, group="support")
        self._reported_message(django_user_model)
        client = Client()
        api_login(client, support)
        body = client.get("/api/v1/ops/reports?status=open&reason=off_platform").json()
        assert body["total"] >= 1
        assert body["results"][0]["message"]["is_hidden"] is False
        assert client.get("/api/v1/ops/reports?reason=spam").json()["total"] == 0

    def test_review_endpoint_round_trip(self, django_user_model):
        support = _staff(django_user_model, group="support")
        report, _ = self._reported_message(django_user_model)
        client = Client()
        api_login(client, support)
        response = client.post(
            f"/api/v1/ops/reports/{report.pk}/review",
            data='{"action": "confirm_hide", "note": "Off-platform payment demand"}',
            content_type="application/json",
        )
        assert response.status_code == 200 and response.json()["status"] == "reviewed"


class TestDisputeQueueAndReconciliation:
    def test_dispute_queue_lists_and_links_admin(self, django_user_model):
        student, _expert, order = _paid_completed_order(django_user_model)
        from apps.disputes import services as disputes

        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="deadline_missed",
            description="The delivery arrived two days after the agreed deadline.",
        )
        support = _staff(django_user_model, group="support")
        client = Client()
        api_login(client, support)
        body = client.get("/api/v1/ops/disputes?status=open").json()
        row = next(row for row in body["results"] if row["id"] == str(dispute.pk))
        assert row["amount"] == 10000 and row["order_number"] == order.number
        assert row["admin_url"].endswith(f"/disputes/dispute/{dispute.pk}/change/")

    def test_reconciliation_detects_payout_overcommit(self, django_user_model):
        _student, _expert, order = _paid_completed_order(django_user_model)
        schedule_payout(order)
        # surgery (test-only): overcommit a payout past the credit balance
        from apps.payments.models import Payout

        payout_row = Payout.objects.get(order=order)
        Payout.objects.filter(pk=payout_row.pk).update(
            amount_minor=payout_row.amount_minor + 500_000
        )
        report = reconciliation_report()
        assert report["ok"] is False
        assert any(f["check"] == "payout_credit_parity" for f in report["findings"])

    def test_reconciliation_clean_after_straight_funnel(self, django_user_model):
        _student, _expert, order = _paid_completed_order(django_user_model)
        schedule_payout(order)
        report = reconciliation_report()
        assert report["ok"] is True, report["findings"]


class TestUsersOverviewAndAudit:
    def test_users_overview_expert_filter(self, django_user_model):
        _student, expert, _order = _paid_completed_order(django_user_model)
        from apps.portal.services.users_overview import users_overview

        body = users_overview(role="expert", query="E")
        assert any(row["email"] == expert.email for row in body["results"])
        assert all(row["expert"] is not None for row in body["results"])

    def test_audit_viewer_filters(self, django_user_model):
        admin = _staff(django_user_model, group="admin")
        update_config(admin, {"dispute_window_days": 9})
        client = Client()
        api_login(client, admin)
        body = client.get("/api/v1/ops/audit?action=config").json()
        assert body["total"] >= 1
        assert body["results"][0]["action"] == "platform.config_updated"
        assert client.get("/api/v1/ops/audit?action=nonexistent-action-xyz").json()["total"] == 0
