"""PaymentGateway — the provider-agnostic money seam (ADR-0005).

Rules (owner mandate, Phase 0 review; amended Phase 7):
- Business logic must NEVER depend on a specific payment provider. Everything
  goes through this interface; adapters live beside it.
- "Escrow" is a product term, not an implementation claim: funds are held by
  the *provider* (e.g., on the platform account balance of the active gateway)
  until supported transfers/refunds move them. We do not build custom escrow.
- Selecting a provider is an *environment* decision (PAYMENT_GATEWAY), never a
  hard-coded one.
- Phase 7: ManualGateway is the fully functional development/test provider and
  operator-confirmed fallback (pay → confirm → payout → refund + simulated
  signed webhooks). StripeGateway is a registered, NON-functional seam: it
  raises GatewayNotConfigured until credentials exist AND the activation
  checklist (docs/workflows/payments.md) is verified. The `stripe` SDK is
  deliberately not a dependency — nothing here imports it.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from django.conf import settings

logger = logging.getLogger(__name__)


class GatewayError(Exception):
    """Base class for gateway-seam failures."""


class GatewayNotConfigured(GatewayError):
    """The selected gateway cannot operate with the current settings."""


class InvalidWebhookSignature(GatewayError):
    """Webhook payload failed the gateway's signature verification."""


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
class GatewayConfirmation:
    """Result of a provider-side payment confirmation attempt."""

    reference: str
    status: str  # "succeeded" | "failed"
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class GatewayRef:
    """Reference to a provider-side money movement (payment/refund/transfer)."""

    kind: str  # "payment" | "refund" | "transfer" | "reversal"
    reference: str
    status: str  # provider status vocabulary, mirrored into payments models
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class VerifiedWebhook:
    """A webhook payload that the gateway attests authentic + intact."""

    event_id: str
    event_type: str  # normalized: "payment.succeeded", "payment.failed", "refund.succeeded"
    data: dict = field(default_factory=dict)


@runtime_checkable
class PaymentGateway(Protocol):
    """The ONLY money-movement contract business code may talk to."""

    name: str

    def create_payment(
        self, *, order_id: str, amount_minor: int, currency: str, reference: str | None = None
    ) -> PaymentCreationResult: ...

    def confirm_payment(
        self, *, provider_reference: str, amount_minor: int
    ) -> GatewayConfirmation: ...

    def get_payment_status(self, *, provider_reference: str) -> str: ...

    def refund(self, *, payment_reference: str, amount_minor: int, reason: str) -> GatewayRef: ...

    def transfer(
        self,
        *,
        destination_account: str,
        amount_minor: int,
        currency: str,
        source_reference: str | None = None,
    ) -> GatewayRef: ...

    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> VerifiedWebhook: ...


class ManualGateway:
    """Development/test provider and operator-confirmed fallback (ADR-0005).

    Simulates the complete payment lifecycle locally with deterministic
    references and HMAC-signed simulated webhook events — no external
    credentials, no network calls. **Never a production card rails
    substitute:** every record it produces is labeled gateway "manual", and
    in a real manual-mode deployment confirmations/payouts mean "an operator
    verified an external bank/wallet transfer", not a card transaction.

    Scenario control is deterministic and documented:
    - a payment whose provider_reference starts with ``fail`` fails on confirm
      (failure-path testing);
    - anything else confirms successfully on the operator/student action.
    """

    name = "manual"
    SIMULATED_FAILURE_PREFIX = "fail"

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
                "simulated": True,
            },
        )

    def confirm_payment(self, *, provider_reference: str, amount_minor: int) -> GatewayConfirmation:
        if provider_reference.startswith(self.SIMULATED_FAILURE_PREFIX):
            return GatewayConfirmation(
                reference=provider_reference, status="failed", raw={"simulated": True}
            )
        return GatewayConfirmation(
            reference=provider_reference, status="succeeded", raw={"simulated": True}
        )

    def get_payment_status(self, *, provider_reference: str) -> str:
        # Manual payments are operator-confirmed: nothing succeeds provider-side
        # until the confirm action runs, so the provider-side status stays pending.
        return "pending"

    def refund(self, *, payment_reference, amount_minor, reason) -> GatewayRef:
        reference = f"manual-re-{uuid.uuid4().hex[:12]}"
        logger.info(
            "manual gateway SIMULATED refund ref=%s payment=%s amount_minor=%s (dev/test operator flow)",
            reference,
            payment_reference,
            amount_minor,
        )
        return GatewayRef(
            kind="refund", reference=reference, status="succeeded", raw={"simulated": True}
        )

    def transfer(
        self, *, destination_account, amount_minor, currency, source_reference=None
    ) -> GatewayRef:
        reference = f"manual-po-{uuid.uuid4().hex[:12]}"
        logger.info(
            "manual gateway SIMULATED payout ref=%s destination=%s amount_minor=%s (dev/test operator flow)",
            reference,
            destination_account,
            amount_minor,
        )
        return GatewayRef(
            kind="transfer", reference=reference, status="succeeded", raw={"simulated": True}
        )

    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> VerifiedWebhook:
        """HMAC-SHA256 verification of a *simulated* event.

        Local/test events are built by `build_simulated_webhook` with
        MANUAL_WEBHOOK_SECRET. Production manual mode has no webhooks —
        confirmation is the operator action — so an invalid signature here is
        always an error worth rejecting.
        """
        secret = str(getattr(settings, "MANUAL_WEBHOOK_SECRET", "dev-only-webhook-secret")).encode()
        expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
        provided = headers.get("X-HM-Signature") or headers.get("x-hm-signature") or ""
        if not hmac.compare_digest(expected, provided):
            raise InvalidWebhookSignature("Simulated webhook signature mismatch.")
        try:
            body = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise InvalidWebhookSignature("Simulated webhook payload is not JSON.") from exc
        event_id = str(body.get("event_id") or "")
        event_type = str(body.get("type") or "")
        if not event_id or not event_type:
            raise InvalidWebhookSignature("Simulated webhook needs event_id and type.")
        return VerifiedWebhook(
            event_id=event_id, event_type=event_type, data=body.get("data") or {}
        )


class StripeGateway:
    """Future adapter seam — registered, NOT functional (ADR-0005 amendment).

    Exists so the registry, wiring and tests prove the provider-agnostic
    contract today. Selecting it raises a configuration error listing exactly
    what is missing. Implementation (SDK, PaymentIntents, Connect transfers,
    webhook parsing) lands only when credentials exist AND the activation
    checklist in docs/workflows/payments.md has been verified by the owner.
    """

    name = "stripe"
    REQUIRED_SETTINGS = ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_API_COUNTRY")

    def _not_ready(self) -> GatewayNotConfigured:
        missing = [name for name in self.REQUIRED_SETTINGS if not getattr(settings, name, None)]
        return GatewayNotConfigured(
            "StripeGateway is a prepared seam, not an active provider: Stripe credentials are not "
            f"configured (missing: {', '.join(missing) or 'none'}). Set them only after the "
            "activation checklist in docs/workflows/payments.md (jurisdiction, entity, KYC, "
            "currencies, fees, webhooks) has been verified."
        )

    def create_payment(self, *, order_id, amount_minor, currency, reference=None):
        raise self._not_ready()

    def confirm_payment(self, *, provider_reference: str, amount_minor: int) -> GatewayConfirmation:
        raise self._not_ready()

    def get_payment_status(self, *, provider_reference: str) -> str:
        raise self._not_ready()

    def refund(self, *, payment_reference, amount_minor, reason) -> GatewayRef:
        raise self._not_ready()

    def transfer(
        self, *, destination_account, amount_minor, currency, source_reference=None
    ) -> GatewayRef:
        raise self._not_ready()

    def verify_webhook(self, *, payload: bytes, headers: Mapping[str, str]) -> VerifiedWebhook:
        raise self._not_ready()


_GATEWAY_REGISTRY: dict[str, type] = {
    ManualGateway.name: ManualGateway,
    StripeGateway.name: StripeGateway,  # seam only — raises until configured
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


def build_simulated_webhook(
    *, event_id: str, event_type: str, data: dict
) -> tuple[bytes, dict[str, str]]:
    """Build a deterministic, correctly-signed simulated webhook for the
    manual gateway (local dev + tests). NOT part of the PaymentGateway port —
    this helper exists so the webhook path is exercised end-to-end without
    real provider traffic."""
    payload = json.dumps(
        {"event_id": event_id, "type": event_type, "data": data}, separators=(",", ":")
    ).encode()
    secret = str(getattr(settings, "MANUAL_WEBHOOK_SECRET", "dev-only-webhook-secret")).encode()
    signature = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return payload, {"Content-Type": "application/json", "X-HM-Signature": signature}
