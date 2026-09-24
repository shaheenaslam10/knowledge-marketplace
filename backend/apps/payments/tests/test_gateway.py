"""Gateway seam tests: registry, provider-agnostic contract, manual fallback."""

import pytest
from django.test import override_settings

from apps.payments.gateway import (
    GatewayRef,
    ManualGateway,
    PaymentCreationResult,
    UnknownGatewayError,
    get_gateway,
)


class TestRegistry:
    def test_default_gateway_is_manual(self, settings):
        settings.PAYMENT_GATEWAY = "manual"
        gateway = get_gateway()
        assert gateway.name == "manual"

    @override_settings(PAYMENT_GATEWAY="does-not-exist")
    def test_unknown_gateway_raises_actionable_error(self):
        with pytest.raises(UnknownGatewayError) as excinfo:
            get_gateway()
        assert "manual" in str(excinfo.value)  # error lists registered gateways

    def test_explicit_override_beats_settings(self, settings):
        settings.PAYMENT_GATEWAY = "manual"
        assert get_gateway("manual").name == "manual"


class TestManualGateway:
    def test_create_payment_returns_instructions_not_secrets(self):
        result = get_gateway("manual").create_payment(
            order_id="ord-1", amount_minor=5000, currency="USD"
        )
        assert isinstance(result, PaymentCreationResult)
        result.validate()  # instructions present
        assert result.client_secret is None
        assert result.metadata["amount_minor"] == 5000
        assert result.metadata["currency"] == "USD"

    def test_money_ops_simulate_deterministically(self):
        """Phase 7: the manual gateway simulates the full money lifecycle
        locally (dev/test provider — docs/workflows/payments.md)."""
        gateway = get_gateway("manual")
        confirmation = gateway.confirm_payment(
            provider_reference="manual-pay-ab12", amount_minor=5000
        )
        assert confirmation.status == "succeeded" and confirmation.raw["simulated"] is True
        refund = gateway.refund(
            payment_reference="manual-pay-ab12", amount_minor=100, reason="mutual"
        )
        assert refund.kind == "refund" and refund.status == "succeeded" and refund.reference
        transfer = gateway.transfer(
            destination_account="expert:1", amount_minor=400, currency="USD"
        )
        assert transfer.kind == "transfer" and transfer.status == "succeeded" and transfer.reference
        assert gateway.get_payment_status(provider_reference="manual-pay-ab12") == "pending"

    def test_confirm_failure_scenario_is_deterministic(self):
        """References prefixed with `fail` fail on confirm — the documented
        failure-path test hook."""
        gateway = get_gateway("manual")
        confirmation = gateway.confirm_payment(
            provider_reference="fail-manual-pay-x", amount_minor=1
        )
        assert confirmation.status == "failed"

    def test_verify_webhook_hmac_and_rejection(self):
        from apps.payments.gateway import InvalidWebhookSignature, build_simulated_webhook

        gateway = get_gateway("manual")
        payload, headers = build_simulated_webhook(
            event_id="evt_1",
            event_type="payment.succeeded",
            data={"payment_reference": "manual-pay-ab12"},
        )
        verified = gateway.verify_webhook(payload=payload, headers=headers)
        assert (
            verified.event_id == "evt_1" and verified.data["payment_reference"] == "manual-pay-ab12"
        )
        with pytest.raises(InvalidWebhookSignature):
            gateway.verify_webhook(payload=payload, headers={"X-HM-Signature": "deadbeef"})
        with pytest.raises(InvalidWebhookSignature):
            gateway.verify_webhook(payload=b"not json", headers=headers)


class TestProviderAgnosticContract:
    """Any future adapter (e.g. Stripe, once credentials exist) must satisfy the same protocol."""

    def test_manual_gateway_satisfies_protocol(self):
        from apps.payments.gateway import PaymentGateway

        assert isinstance(ManualGateway(), PaymentGateway)

    def test_custom_adapter_satisfies_protocol(self):
        from dataclasses import dataclass as dc

        from apps.payments.gateway import PaymentGateway

        @dc
        class FakeAdapter:
            name = "fake"

            def create_payment(self, *, order_id, amount_minor, currency, reference=None):
                return PaymentCreationResult(gateway=self.name, client_secret="cs_test")

            def refund(self, *, payment_reference, amount_minor, reason) -> GatewayRef:
                return GatewayRef(kind="refund", reference="re_1", status="succeeded")

            def transfer(
                self, *, destination_account, amount_minor, currency, source_reference=None
            ):
                return GatewayRef(kind="transfer", reference="tr_1", status="paid")

            def confirm_payment(self, *, provider_reference, amount_minor):
                from apps.payments.gateway import GatewayConfirmation

                return GatewayConfirmation(reference=provider_reference, status="succeeded")

            def get_payment_status(self, *, provider_reference):
                return "succeeded"

            def verify_webhook(self, *, payload, headers):
                from apps.payments.gateway import VerifiedWebhook

                return VerifiedWebhook(event_id="evt", event_type="payment.succeeded")

        gateway = FakeAdapter()
        assert isinstance(gateway, PaymentGateway)
        assert (
            gateway.create_payment(order_id="o", amount_minor=1, currency="USD").client_secret
            == "cs_test"
        )

    def test_payment_result_requires_payload(self):
        with pytest.raises(ValueError):
            PaymentCreationResult(gateway="x").validate()
