"""Pure payment-unit tests (no order coupling): commission split, ledger
append-only guard, earnings aggregation, webhook ingestion mechanics.
Order-integration coverage lives in apps/orders/tests/test_payment_integration.py."""

import json

import pytest
from django.test import Client

from apps.experts.tests.test_api import PASSWORD
from apps.payments import services
from apps.payments.config import commission_split
from apps.payments.gateway import (
    build_simulated_webhook,
)
from apps.payments.models import LedgerEntry, WebhookEvent

pytestmark = pytest.mark.django_db


class TestCommissionSplit:
    def test_deterministic_snapshots(self):
        assert commission_split(7000) == (1050, 5950)  # 15% open-bid default
        import decimal

        assert commission_split(7000, decimal.Decimal("0.2000")) == (1400, 5600)  # managed
        assert commission_split(999)[0] + commission_split(999)[1] == 999  # exact conservation


@pytest.mark.django_db
class TestLedgerAppendOnly:
    def test_entries_cannot_be_updated_or_deleted(self, django_user_model):
        user = django_user_model.objects.create_user(
            email="led@demo.local", password=PASSWORD, name="L"
        )
        entry = LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount_minor=100,
            currency="USD",
            user=user,
            description="seed entry",
        )
        entry.amount_minor = 1
        with pytest.raises(ValueError, match="append-only"):
            entry.save()
        with pytest.raises(ValueError, match="append-only"):
            entry.delete()

    def test_earnings_aggregate_over_user_entries(self, django_user_model):
        user = django_user_model.objects.create_user(
            email="led2@demo.local", password=PASSWORD, name="L2"
        )
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.EXPERT_CREDIT, amount_minor=5950, user=user
        )
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.EXPERT_CREDIT, amount_minor=1050, user=user
        )
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.PAYOUT, amount_minor=-3000, user=user
        )
        earnings = services.earnings_for(user)
        assert earnings == {
            "expert_credit_minor": 7000,
            "payout_minor": 3000,
            "outstanding_minor": 4000,
        }


class TestWebhookIngestMechanics:
    """Storage/idempotency mechanics that need no payment rows."""

    def _post(self, event_id, event_type="", data=None, headers=None, payload=None):
        if payload is None:
            payload, headers = build_simulated_webhook(
                event_id=event_id, event_type=event_type, data=data or {}
            )
        anon = Client()
        return anon.post(
            "/api/v1/payments/webhooks/manual",
            data=payload,
            content_type="application/json",
            headers=headers,
        )

    def test_unknown_event_type_stored_as_failed(self):
        response = self._post("evt-unknown", "payout.updated", {"x": 1})
        assert response.status_code == 200
        event = WebhookEvent.objects.get(event_id="evt-unknown")
        assert event.status == WebhookEvent.Status.FAILED
        assert "No handler" in event.error

    def test_duplicate_event_id_is_stored_once(self):
        self._post("evt-dup", "payout.updated")
        response = self._post("evt-dup", "payout.updated")
        assert response.status_code == 200
        assert WebhookEvent.objects.filter(event_id="evt-dup").count() == 1

    def test_unsigned_payload_rejected_and_not_stored(self):
        payload = json.dumps(
            {"event_id": "evt-evil", "type": "payment.succeeded", "data": {}}
        ).encode()
        response = self._post("evt-evil", headers={}, payload=payload)
        assert response.status_code == 400
        assert not WebhookEvent.objects.filter(event_id="evt-evil").exists()

    def test_garbage_signature_rejected(self):
        payload, _ = build_simulated_webhook(
            event_id="evt-sig", event_type="payment.succeeded", data={}
        )
        anon = Client()
        response = anon.post(
            "/api/v1/payments/webhooks/manual",
            data=payload,
            content_type="application/json",
            headers={"X-HM-Signature": "deadbeef"},
        )
        assert response.status_code == 400

    def test_unknown_provider_404(self):
        payload, headers = build_simulated_webhook(
            event_id="evt-p", event_type="payment.succeeded", data={}
        )
        anon = Client()
        response = anon.post(
            "/api/v1/payments/webhooks/moonpay",
            data=payload,
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 404
