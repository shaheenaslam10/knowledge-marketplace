"""Webhook ingestion — provider-neutral, idempotent, retry-safe (BR-33).

Flow: POST /api/v1/payments/webhooks/<provider> → gateway.verify_webhook
(signature attestation) → WebhookEvent row (unique event_id = replay
protection) → normalized handler dispatch → status processed/failed.

Local development uses `gateway.build_simulated_webhook` to produce
correctly-signed manual-gateway events — the SAME ingestion path real
providers will hit. Unverified payloads never reach a handler.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError
from apps.payments import services as payment_services
from apps.payments.gateway import GatewayError, get_gateway
from apps.payments.models import Payment, Refund, WebhookEvent

logger = logging.getLogger(__name__)

Handler = Callable[[WebhookEvent, dict], None]


def _handle_payment_succeeded(event: WebhookEvent, data: dict) -> None:
    reference = data.get("payment_reference") or ""
    payment = Payment.objects.filter(provider_reference=reference).first()
    if payment is None:
        raise ValueError(f"Unknown payment reference {reference!r}")
    if payment.status == Payment.Status.SUCCEEDED:
        return  # idempotent: provider replay after we already confirmed
    payment_services.confirm_payment(payment, source=f"webhook:{event.provider}")


def _handle_payment_failed(event: WebhookEvent, data: dict) -> None:
    reference = data.get("payment_reference") or ""
    payment = Payment.objects.filter(provider_reference=reference).first()
    if payment is None or payment.status in (Payment.Status.SUCCEEDED, Payment.Status.CANCELED):
        return
    payment.status = Payment.Status.FAILED
    payment.failure_reason = str(data.get("reason") or "Provider reported failure")[:255]
    payment.save(update_fields=["status", "failure_reason", "updated_at"])


def _handle_refund_succeeded(event: WebhookEvent, data: dict) -> None:
    reference = data.get("refund_reference") or ""
    refund = Refund.objects.filter(provider_reference=reference).first()
    if refund is None or refund.status == Refund.Status.SUCCEEDED:
        return
    refund.status = Refund.Status.SUCCEEDED
    refund.processed_at = timezone.now()
    refund.save(update_fields=["status", "processed_at", "updated_at"])


_HANDLERS: dict[str, Handler] = {
    "payment.succeeded": _handle_payment_succeeded,
    "payment.failed": _handle_payment_failed,
    "refund.succeeded": _handle_refund_succeeded,
}


def register_handler(event_type: str, handler: Handler) -> None:
    """Extension seam for future provider event types (tests use it too)."""
    _HANDLERS[event_type] = handler


@transaction.atomic
def redeliver(event: WebhookEvent) -> WebhookEvent:
    """Re-run processing for a stored event (admin replay action).

    Safe because the stored payload was signature-verified at first receipt;
    handlers remain idempotent so a redelivery cannot double-apply.
    """
    data = (event.payload or {}).get("data", {})
    handler = _HANDLERS.get(event.type)
    if handler is None:
        event.status = WebhookEvent.Status.FAILED
        event.error = f"No handler for event type {event.type!r}"
        event.save(update_fields=["status", "error"])
        return event
    try:
        handler(event, data)
    except (ValueError, GatewayError, DomainError) as exc:
        event.status = WebhookEvent.Status.FAILED
        event.error = str(exc)[:2000]
        event.save(update_fields=["status", "error"])
        return event
    event.status = WebhookEvent.Status.PROCESSED
    event.error = ""
    event.processed_at = timezone.now()
    event.save(update_fields=["status", "error", "processed_at"])
    return event


@transaction.atomic
def ingest(*, provider: str, payload: bytes, headers) -> tuple[WebhookEvent, bool]:
    """Verify → store → dispatch. Returns (event, processed_now).

    - invalid signature: raises InvalidWebhookSignature (caller → 400); the
      payload is never stored as a processed event.
    - replay of an already-processed event_id: no-op returning the stored row.
    - handler failure: status=failed + error persisted (admin replay action).
    """
    gateway = get_gateway(provider)
    verified = gateway.verify_webhook(payload=payload, headers=headers)
    event, created = WebhookEvent.objects.get_or_create(
        provider=gateway.name,
        event_id=verified.event_id,
        defaults={"type": verified.event_type, "payload": {"data": verified.data}},
    )
    if not created and event.status == WebhookEvent.Status.PROCESSED:
        return event, False  # duplicate-event protection
    handler = _HANDLERS.get(verified.event_type)
    if handler is None:
        event.status = WebhookEvent.Status.FAILED
        event.error = f"No handler for event type {verified.event_type!r}"
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "error", "processed_at"])
        return event, True
    try:
        handler(event, verified.data)
    except (ValueError, GatewayError, DomainError) as exc:
        event.status = WebhookEvent.Status.FAILED
        event.error = str(exc)[:2000]
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "error", "processed_at"])
        logger.warning("webhook %s processing failed: %s", verified.event_id, exc)
        return event, True
    event.status = WebhookEvent.Status.PROCESSED
    event.processed_at = timezone.now()
    event.error = ""
    event.save(update_fields=["status", "error", "processed_at"])
    audit_log(
        None, action="payment.webhook_processed", obj=event, detail={"type": verified.event_type}
    )
    return event, True
