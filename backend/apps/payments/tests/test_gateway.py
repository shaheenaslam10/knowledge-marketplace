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

    def test_money_ops_not_implemented_yet(self):
        gateway = get_gateway("manual")
        with pytest.raises(NotImplementedError):
            gateway.refund(payment_reference="x", amount_minor=1, reason="test")
        with pytest.raises(NotImplementedError):
            gateway.transfer(destination_account="acct", amount_minor=1, currency="USD")


class TestProviderAgnosticContract:
    """Any future adapter (e.g. Stripe in Phase 8) must satisfy the same protocol."""

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

        gateway = FakeAdapter()
        assert isinstance(gateway, PaymentGateway)
        assert (
            gateway.create_payment(order_id="o", amount_minor=1, currency="USD").client_secret
            == "cs_test"
        )

    def test_payment_result_requires_payload(self):
        with pytest.raises(ValueError):
            PaymentCreationResult(gateway="x").validate()
