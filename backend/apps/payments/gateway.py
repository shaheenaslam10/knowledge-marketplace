"""PaymentGateway — the provider-agnostic money seam (ADR-0005).

Rules (owner mandate, Phase 0 review):
- Business logic must NEVER depend on a specific payment provider. Everything
  goes through this interface; adapters live beside it.
- "Escrow" is a product term, not an implementation claim: funds are held by
  the *provider* (e.g., on the platform account balance of the active gateway)
  until supported transfers/refunds move them. We do not build custom escrow.
- Phase 1 ships the interface + registry + ManualGateway placeholder + a test
  FakeGateway. Real adapters (Stripe Connect, full manual flow) land in Phase 8
  per docs/workflows/payments.md — signatures may be extended there, but the
  abstraction itself is the contract and must remain provider-agnostic.
- Selecting a provider is an *environment* decision (PAYMENT_GATEWAY), never a
  hard-coded one.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PaymentCreationResult:
    """What an order-payment request needs in order to collect money.

    - provider flows: `client_secret` for a client-side widget (e.g. Stripe Elements)
    - manual flows: `instructions` text for the student + a `provider_reference` slot
    """

    gateway: str
    provider_reference: str | None = None
    client_secret: str | None = None
    instructions: str | None = None
    metadata: dict = field(default_factory=dict)

    def validate(self) -> None:
        if not (self.client_secret or self.instructions):
            raise ValueError("PaymentCreationResult needs client_secret or instructions")


@dataclass(frozen=True)
class GatewayRef:
    """Reference to a provider-side money movement (payment/refund/transfer)."""

    kind: str  # "payment" | "refund" | "transfer" | "reversal"
    reference: str
    status: str  # provider status vocabulary, mirrored into payments models in Phase 8
    raw: dict = field(default_factory=dict)


@runtime_checkable
class PaymentGateway(Protocol):
    """The ONLY money-movement contract business code may talk to."""

    name: str

    def create_payment(
        self, *, order_id: str, amount_minor: int, currency: str, reference: str | None = None
    ) -> PaymentCreationResult: ...

    def refund(self, *, payment_reference: str, amount_minor: int, reason: str) -> GatewayRef: ...

    def transfer(
        self,
        *,
        destination_account: str,
        amount_minor: int,
        currency: str,
        source_reference: str | None = None,
    ) -> GatewayRef: ...


class ManualGateway:
    """Fallback gateway: external transfer (bank/wallet), confirmed by an operator.

    Deliberately returns instructions instead of secrets; no network calls.
    Full workflow (reference submission, admin confirmation) is Phase 8 —
    docs/workflows/payments.md#manual-gateway-fallback.
    """

    name = "manual"

    def create_payment(
        self, *, order_id, amount_minor, currency, reference=None
    ) -> PaymentCreationResult:
        instructions = getattr(settings, "MANUAL_PAYMENT_INSTRUCTIONS", None) or (
            "Transfer the exact amount to the platform account; then submit the payment reference "
            "on the order page. An operator confirms receipt before work starts."
        )
        return PaymentCreationResult(
            gateway=self.name,
            provider_reference=reference,
            instructions=instructions,
            metadata={
                "order_id": str(order_id),
                "amount_minor": amount_minor,
                "currency": currency,
            },
        )

    def refund(self, *, payment_reference, amount_minor, reason) -> GatewayRef:
        # Phase 8: recorded as an operator-executed refund task (ledger parity with provider gateways).
        raise NotImplementedError("Manual refunds are operator workflows implemented in Phase 8.")

    def transfer(
        self, *, destination_account, amount_minor, currency, source_reference=None
    ) -> GatewayRef:
        raise NotImplementedError("Manual payouts are operator workflows implemented in Phase 8.")


_GATEWAY_REGISTRY: dict[str, type] = {
    ManualGateway.name: ManualGateway,
    # "stripe": registered in Phase 8 (StripeConnectGateway) — config stays provider-agnostic.
}


class UnknownGatewayError(Exception):
    pass


def get_gateway(name: str | None = None) -> PaymentGateway:
    """Resolve the active gateway from settings (or an explicit override for tests)."""
    key = (name or settings.PAYMENT_GATEWAY).strip().lower()
    try:
        cls = _GATEWAY_REGISTRY[key]
    except KeyError:
        raise UnknownGatewayError(
            f"PAYMENT_GATEWAY '{key}' is not available. Registered: {sorted(_GATEWAY_REGISTRY)}"
        ) from None
    logger.debug("payment gateway resolved: %s", key)
    return cls()  # type: ignore[return-value]
