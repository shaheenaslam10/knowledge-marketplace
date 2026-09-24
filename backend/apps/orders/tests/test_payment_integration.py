"""Phase 7 payment<->order integration tests — live in the ORDERS layer
because they exercise both apps together (orders may import payments;
never the reverse, ADR-0005 amendment). Pure payment-unit tests stay in
apps/payments/tests."""

import json

import pytest
from django.test import Client, override_settings

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.orders.models import Order, OrderEvent
from apps.payments import services
from apps.payments.config import commission_split
from apps.payments.gateway import (
    GatewayNotConfigured,
    build_simulated_webhook,
    get_gateway,
)
from apps.payments.models import LedgerEntry, Payment, Payout, Refund, WebhookEvent
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


# --- fixtures --------------------------------------------------------------------


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="pay-s@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        email="pay-a@demo.local", password=PASSWORD, name="A", is_staff=True
    )


@pytest.fixture
def awaiting_order(student, django_user_model):
    """An open_bid order in awaiting_payment, built through the one factory."""
    from apps.orders import services as order_services

    subject = ensure_term(kind="subject", name="PaySub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Payment flow",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    request_services.mark_matched(req)  # selection already happened upstream
    expert = make_expert(django_user_model, "pay-e@demo.local", "Pay Expert")
    order = order_services.create_order_for_request(
        req, expert=expert, amount=7000, currency="USD", source=Order.Source.OPEN_BID
    )
    return order, expert


@pytest.fixture
def paid_order(student, admin, awaiting_order):
    order, expert = awaiting_order
    payment = services.confirm_order_payment(order, actor=admin, source="admin")
    order.refresh_from_db()
    return order, expert, payment


# --- payment creation -------------------------------------------------------------


class TestPaymentCreation:
    def test_student_creates_pending_payment_with_instructions(self, student, awaiting_order):
        order, _expert = awaiting_order
        payment = services.start_payment(order, actor=student)
        assert payment.status == Payment.Status.PENDING
        assert payment.amount_minor == order.amount == 7000  # server-side amount
        assert payment.gateway == "manual"
        assert payment.instructions  # manual rails show instructions
        assert "client_secret" not in json.dumps(payment.instructions)

    def test_start_payment_is_idempotent(self, student, awaiting_order):
        order, _ = awaiting_order
        first = services.start_payment(order, actor=student)
        second = services.start_payment(order, actor=student)
        assert first.pk == second.pk and second.provider_reference == first.provider_reference

    def test_non_owner_cannot_start_payment(self, student, django_user_model, awaiting_order):
        order, _ = awaiting_order
        stranger = django_user_model.objects.create_user(
            email="pay-x@demo.local", password=PASSWORD, name="X"
        )
        with pytest.raises(PermissionDeniedError):
            services.start_payment(order, actor=stranger)

    def test_client_cannot_influence_amount(self, client, student, awaiting_order):
        order, _ = awaiting_order
        api_login(client, student)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/pay",
            data=json.dumps({"amount_minor": 1, "amount": 0.01}),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["payment"]["amount_minor"] == 7000  # booked amount only
        assert Payment.objects.filter(order=order).get().amount_minor == 7000


# --- confirmation & order integration ---------------------------------------------


class TestConfirmation:
    def test_confirm_activates_order_and_writes_ledger(self, student, admin, awaiting_order):
        order, _expert = awaiting_order
        payment = services.confirm_order_payment(order, actor=admin, source="admin")
        order.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED and payment.paid_at is not None
        assert order.status == Order.Status.ACTIVE and order.paid_at is not None
        assert order.request.status == "in_progress"
        assert order.events.filter(event_type=OrderEvent.EventType.PAYMENT_CONFIRMED).exists()
        types = set(LedgerEntry.objects.filter(order=order).values_list("entry_type", flat=True))
        assert types == {"charge", "commission", "expert_credit"}

    def test_wrong_amount_rejected(self, student, admin, awaiting_order):
        order, _ = awaiting_order
        payment = services.start_payment(order, actor=student)
        Payment.objects.filter(pk=payment.pk).update(amount_minor=999)
        with pytest.raises(DomainError, match="does not match"):
            services.confirm_payment(payment, actor=admin)
        order.refresh_from_db()
        assert order.status == Order.Status.AWAITING_PAYMENT

    def test_cancelled_order_cannot_be_confirmed(self, student, admin, awaiting_order):
        order, _ = awaiting_order
        services.start_payment(order, actor=student)
        from apps.orders import services as order_services

        order_services.cancel(order, actor=student, reason="changed mind pre-payment")
        payment = Payment.objects.get(order=order)
        assert payment.status == Payment.Status.CANCELED  # cancellation voids the attempt
        with pytest.raises(DomainError):
            services.confirm_order_payment(order, actor=admin)

    def test_duplicate_confirmation_rejected(self, admin, paid_order):
        order, _expert, payment = paid_order
        with pytest.raises(DomainError, match="already confirmed"):
            services.confirm_payment(payment, actor=admin)
        assert LedgerEntry.objects.filter(order=order, entry_type="charge").count() == 1

    def test_order_cannot_be_activated_twice(self, admin, paid_order):
        order, _expert, _payment = paid_order
        with pytest.raises(DomainError, match="already confirmed"):
            services.confirm_order_payment(order, actor=admin)

    def test_confirm_payment_failure_path_keeps_order_pending(self, student, admin, awaiting_order):
        order, _ = awaiting_order
        payment = services.start_payment(order, actor=student)
        Payment.objects.filter(pk=payment.pk).update(provider_reference="fail-manual-pay-x")
        from apps.payments.services import PaymentFailedError

        with pytest.raises(PaymentFailedError):
            services.confirm_payment(payment, actor=admin)
        payment.refresh_from_db()
        assert payment.status == Payment.Status.FAILED
        order.refresh_from_db()
        assert order.status == Order.Status.AWAITING_PAYMENT
        # retry re-arms the same row with a fresh reference
        rearmed = services.start_payment(order, actor=student)
        assert rearmed.status == Payment.Status.PENDING
        assert rearmed.provider_reference != "fail-manual-pay-x"

    def test_system_actor_can_confirm_via_service(self, student, awaiting_order):
        order, _ = awaiting_order
        services.start_payment(order, actor=student)
        # source is the operator/webhook path — authorization is downstream of
        # the payment rails, not the student role: dev endpoint is env-gated.
        # Here the admin-rails operator confirm requires a staff actor only at
        # the API layer; the service itself allows system actors (actor=None).
        order2 = services.confirm_order_payment(order, actor=None, source="system")
        assert order2 is not None


class TestCommissionAndLedger:
    def test_commission_snapshot_is_used_not_recomputed(self, admin, paid_order):
        order, _expert, _payment = paid_order
        charge, commission, credit = (
            LedgerEntry.objects.filter(order=order, entry_type="charge").first().amount_minor,
            LedgerEntry.objects.filter(order=order, entry_type="commission").first().amount_minor,
            LedgerEntry.objects.filter(order=order, entry_type="expert_credit")
            .first()
            .amount_minor,
        )
        assert commission == order.commission_amount
        assert credit == order.expert_amount
        assert charge == commission + credit  # BR-32 identity on a fresh charge

    def test_commission_split_deterministic(self):
        assert commission_split(7000) == (1050, 5950)  # 15% open-bid
        assert commission_split(7000, __import__("decimal").Decimal("0.2000")) == (1400, 5600)

    def test_ledger_entries_are_append_only(self, admin, paid_order):
        entry = LedgerEntry.objects.first()
        assert entry is not None
        entry.amount_minor = 1
        with pytest.raises(ValueError, match="append-only"):
            entry.save()
        with pytest.raises(ValueError, match="append-only"):
            entry.delete()

    def test_ledger_check_passes_on_clean_data_and_detects_tampering(self, admin, paid_order):
        summary = services.ledger_check()
        assert summary["violations"] == []
        order = paid_order[0]
        assert LedgerEntry.objects.filter(order=order, entry_type="commission").exists()
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.CHARGE,
            amount_minor=123,  # unbalanced extra charge
            currency="USD",
            order=order,
        )
        summary = services.ledger_check()
        assert summary["violations"] and summary["violations"][0]["order_id"] == order.id


# --- webhooks ---------------------------------------------------------------------


class TestWebhooks:
    def _post_event(self, client_anon, event_id, event_type, data):
        payload, headers = build_simulated_webhook(
            event_id=event_id, event_type=event_type, data=data
        )
        return client_anon.post(
            "/api/v1/payments/webhooks/manual",
            data=payload,
            content_type="application/json",
            headers=headers,
        )

    def test_signed_event_confirms_payment_end_to_end(self, client, awaiting_order, admin):
        order, _ = awaiting_order
        payment = services.start_payment(order, actor=order.student)

        anon = Client()
        response = self._post_event(
            anon, "evt-1", "payment.succeeded", {"payment_reference": payment.provider_reference}
        )
        assert response.status_code == 200 and response.json()["processed"] is True
        order.refresh_from_db()
        assert order.status == Order.Status.ACTIVE
        assert WebhookEvent.objects.get(event_id="evt-1").status == WebhookEvent.Status.PROCESSED

    def test_replayed_event_is_idempotent_noop(self, client, awaiting_order):
        order, _ = awaiting_order
        payment = services.start_payment(order, actor=order.student)

        anon = Client()
        first = self._post_event(
            anon,
            "evt-replay",
            "payment.succeeded",
            {"payment_reference": payment.provider_reference},
        )
        second = self._post_event(
            anon,
            "evt-replay",
            "payment.succeeded",
            {"payment_reference": payment.provider_reference},
        )
        assert first.status_code == 200 and second.status_code == 200
        assert second.json()["processed"] is False  # duplicate-event protection
        assert LedgerEntry.objects.filter(order=order, entry_type="charge").count() == 1

    def test_unsigned_payload_rejected_before_storage(self, awaiting_order):

        order, _ = awaiting_order
        payment = services.start_payment(order, actor=order.student)
        anon = Client()
        payload = json.dumps(
            {"event_id": "evt-evil", "type": "payment.succeeded", "data": {}}
        ).encode()
        response = anon.post(
            "/api/v1/payments/webhooks/manual",
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 400
        assert not WebhookEvent.objects.filter(event_id="evt-evil").exists()
        payment.refresh_from_db()
        assert payment.status == Payment.Status.PENDING

    def test_unknown_reference_fails_event_not_payment(self, awaiting_order):

        anon = Client()
        response = self._post_event(
            anon, "evt-404", "payment.succeeded", {"payment_reference": "ghost"}
        )
        assert response.status_code == 200
        event = WebhookEvent.objects.get(event_id="evt-404")
        assert event.status == WebhookEvent.Status.FAILED

    def test_admin_replay_redelivers_stored_event(self, admin, awaiting_order):
        order, _ = awaiting_order
        payment = services.start_payment(order, actor=order.student)
        from apps.payments import webhooks

        payload, headers = build_simulated_webhook(
            event_id="evt-r",
            event_type="payment.succeeded",
            data={"payment_reference": payment.provider_reference},
        )
        event, _ = webhooks.ingest(provider="manual", payload=payload, headers=headers)
        event.status = WebhookEvent.Status.FAILED  # simulate a processing failure
        event.save(update_fields=["status"])
        replayed = webhooks.redeliver(event)
        assert replayed.status == WebhookEvent.Status.PROCESSED
        order.refresh_from_db()
        assert order.status == Order.Status.ACTIVE


# --- refunds ----------------------------------------------------------------------


class TestRefunds:
    def test_staff_full_refund_reverses_ledger(self, admin, paid_order):
        order, _expert, payment = paid_order
        refund = services.issue_refund(
            payment,
            amount_minor=payment.amount_minor,
            reason=Refund.Reason.EXPERT_FAULT,
            initiated_by=admin,
        )
        assert refund.status == Refund.Status.SUCCEEDED and refund.provider_reference
        payment.refresh_from_db()
        assert payment.status == Payment.Status.REFUNDED and payment.refunded_minor == 7000
        types = set(LedgerEntry.objects.filter(order=order).values_list("entry_type", flat=True))
        assert "refund" in types
        summary = services.ledger_check()
        assert summary["violations"] == []  # identity survives the refund

    def test_partial_refund_and_cap(self, admin, paid_order):
        _order, _expert, payment = paid_order
        services.issue_refund(
            payment, amount_minor=2000, reason=Refund.Reason.MUTUAL, initiated_by=admin
        )
        payment.refresh_from_db()
        assert payment.status == Payment.Status.PARTIALLY_REFUNDED
        with pytest.raises(DomainError):
            services.issue_refund(
                payment, amount_minor=6000, reason=Refund.Reason.MUTUAL, initiated_by=admin
            )

    def test_non_staff_cannot_refund(self, student, admin, paid_order):
        _order, _expert, payment = paid_order
        with pytest.raises(PermissionDeniedError):
            services.issue_refund(
                payment, amount_minor=100, reason=Refund.Reason.MUTUAL, initiated_by=student
            )

    def test_refund_unknown_reason_rejected(self, admin, paid_order):
        _order, _expert, payment = paid_order
        with pytest.raises(DomainError):
            services.issue_refund(payment, amount_minor=100, reason="because", initiated_by=admin)


# --- payouts ----------------------------------------------------------------------


class TestPayouts:
    def test_completion_schedules_payout_and_settlement_writes_ledger(
        self, student, admin, paid_order
    ):
        order, expert, _payment = paid_order
        from apps.orders import services as order_services

        order_services.submit_delivery(
            order, expert=expert, summary="Delivery for payout flow, done."
        )
        order = order_services.approve_delivery(order, actor=order.student, source="student")
        payout = Payout.objects.get(order=order)
        assert payout.status == Payout.Status.SCHEDULED
        assert payout.amount_minor == order.expert_amount
        with pytest.raises(PermissionDeniedError):
            services.settle_payout(payout, actor=order.student)
        services.settle_payout(payout, actor=admin)
        payout.refresh_from_db()
        assert payout.status == Payout.Status.PAID and payout.provider_reference.startswith(
            "manual-po-"
        )
        assert LedgerEntry.objects.filter(
            order=order, entry_type="payout", amount_minor=-payout.amount_minor
        ).exists()
        assert services.remaining_payable(order) == 0

    def test_duplicate_settlement_rejected(self, student, admin, paid_order):
        order, expert, _payment = paid_order
        from apps.orders import services as order_services

        order_services.submit_delivery(
            order, expert=expert, summary="Delivery for duplicate payout test."
        )
        order_services.approve_delivery(order, actor=order.student, source="student")
        payout = Payout.objects.get(order=order)
        services.settle_payout(payout, actor=admin)
        with pytest.raises(DomainError, match="already settled"):
            services.settle_payout(payout, actor=admin)

    def test_below_floor_payout_rolls_forward(self, student, admin, awaiting_order):
        order, expert = awaiting_order
        services.confirm_order_payment(order, actor=admin)
        # shrink the expert credit below the $10 floor to simulate a tiny order
        LedgerEntry.objects.filter(order=order, entry_type="expert_credit").update(amount_minor=900)
        from apps.orders import services as order_services

        order_services.submit_delivery(
            order, expert=expert, summary="Tiny order below the payout floor."
        )
        order = order_services.approve_delivery(order, actor=order.student, source="student")
        assert services.schedule_payout(order) is None
        assert not Payout.objects.filter(order=order).exists()

    def test_sweeper_is_idempotent(self, student, admin, paid_order):
        order, expert, _payment = paid_order
        from apps.orders import services as order_services

        order_services.submit_delivery(
            order, expert=expert, summary="Sweeper idempotency delivery."
        )
        order = order_services.approve_delivery(order, actor=order.student, source="student")
        assert services.payout_sweeper() == 0  # approve_delivery already scheduled it
        Payout.objects.filter(order=order).delete()
        assert services.payout_sweeper() == 1
        assert services.payout_sweeper() == 0  # second run creates nothing


# --- earnings (expert financial view foundation) -----------------------------------


class TestEarnings:
    def test_earnings_aggregate_from_ledger(self, admin, paid_order):
        order, expert, _payment = paid_order
        earnings = services.earnings_for(expert)
        assert earnings["expert_credit_minor"] == order.expert_amount
        assert earnings["outstanding_minor"] == order.expert_amount

    def test_earnings_api(self, client, student, admin, paid_order, django_user_model):
        order, expert, _payment = paid_order
        api_login(client, expert)
        response = client.get("/api/v1/me/earnings")
        assert response.status_code == 200
        body = response.json()
        assert body["expert_credit_minor"] == order.expert_amount
        assert body["outstanding_display"] == order.expert_amount / 100

    def test_payouts_api_scoped_to_owner(
        self, client, student, admin, paid_order, django_user_model
    ):
        order, expert, _payment = paid_order
        from apps.orders import services as order_services

        order_services.submit_delivery(
            order, expert=expert, summary="Delivery for payouts API test."
        )
        order_services.approve_delivery(order, actor=order.student, source="student")
        services.settle_payout(Payout.objects.get(order=order), actor=admin)
        api_login(client, expert)
        response = client.get("/api/v1/me/payouts")
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 1 and results[0]["status"] == "paid"
        stranger = django_user_model.objects.create_user(
            email="pay-z@demo.local", password=PASSWORD, name="Z"
        )
        api_login(client, stranger)
        response = client.get("/api/v1/me/payouts")
        assert response.json()["results"] == []


# --- payment API + dev confirm gating ----------------------------------------------


class TestPaymentAPI:
    def test_pay_returns_instructions_and_payment(self, client, student, awaiting_order):
        order, _ = awaiting_order
        api_login(client, student)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/pay", data="{}", content_type="application/json"
        )
        assert response.status_code == 200
        body = response.json()
        assert body["payment"]["status"] == "pending"
        assert body["payment"]["simulated"] is True  # clearly labeled as simulated
        assert body["payment"]["instructions"]
        assert "provider_reference" not in body["payment"] or body["payment"].get("instructions")

    def test_pay_rejected_for_stranger(self, client, student, django_user_model, awaiting_order):
        order, _ = awaiting_order
        stranger = django_user_model.objects.create_user(
            email="pay-s2@demo.local", password=PASSWORD, name="S2"
        )
        api_login(client, stranger)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/pay", data="{}", content_type="application/json"
        )
        assert response.status_code == 403

    def test_dev_confirm_disabled_by_default_in_tests(self, client, student, awaiting_order):
        order, _ = awaiting_order
        services.start_payment(order, actor=student)
        api_login(client, student)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/payment/confirm",
            data="{}",
            content_type="application/json",
        )
        assert response.status_code == 403
        order.refresh_from_db()
        assert order.status == Order.Status.AWAITING_PAYMENT

    @override_settings(PAYMENT_DEV_SELF_CONFIRM=True)
    def test_dev_confirm_activates_order(self, client, student, awaiting_order):
        order, _ = awaiting_order
        services.start_payment(order, actor=student)
        api_login(client, student)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/payment/confirm",
            data="{}",
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"
        order.refresh_from_db()
        assert order.status == Order.Status.ACTIVE

    @override_settings(PAYMENT_GATEWAY="stripe")
    def test_stripe_seam_is_registered_but_not_functional(self, settings):
        gateway = get_gateway()
        assert gateway.name == "stripe"
        with pytest.raises(GatewayNotConfigured, match="activation checklist"):
            gateway.create_payment(order_id="o1", amount_minor=1, currency="USD")

    def test_order_detail_embeds_payment_block(self, client, student, admin, paid_order):
        order, _expert, _payment = paid_order
        api_login(client, student)
        response = client.get(f"/api/v1/me/orders/{order.pk}")
        assert response.status_code == 200
        body = response.json()
        assert body["payment"]["status"] == "succeeded"
        assert body["payment"]["amount_display"] == 70.0
