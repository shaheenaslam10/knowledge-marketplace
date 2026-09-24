"""Payments API — webhook ingestion (public, signature-verified) + expert
financial views (earnings, payouts). Order-scoped pay/confirm actions live in
the orders API (higher layer owns the orchestration)."""

from __future__ import annotations

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import DomainError, NotFoundError
from apps.core.money import to_major
from apps.payments import webhooks
from apps.payments.gateway import GatewayError, InvalidWebhookSignature, UnknownGatewayError
from apps.payments.models import Payout


class WebhookIngestView(APIView):
    """POST /api/v1/payments/webhooks/<provider>/ — public endpoint.

    Authenticity is the gateway's job: an invalid signature raises 400 before
    anything is stored/processed. Replayed event IDs are idempotent no-ops.
    """

    permission_classes = [AllowAny]

    def post(self, request, provider: str):
        payload = request.body
        headers = {k.lower(): v for k, v in request.headers.items()}
        try:
            _event, processed = webhooks.ingest(provider=provider, payload=payload, headers=headers)
        except InvalidWebhookSignature as exc:
            raise DomainError(str(exc), code="invalid_webhook_signature", status_code=400) from exc
        except UnknownGatewayError as exc:
            raise NotFoundError(f"Unknown payment provider {provider!r}.") from exc
        except GatewayError as exc:
            raise DomainError(str(exc), code="webhook_error", status_code=400) from exc
        return Response({"received": True, "processed": processed})


def _payout_meta(payout: Payout) -> dict:
    return {
        "id": str(payout.id),
        "order_number": payout.order.number,
        "amount_display": to_major(payout.amount_minor, payout.currency),
        "currency": payout.currency,
        "status": payout.status,
        "created_at": payout.created_at,
        "settled_at": payout.settled_at,
        "failure_reason": payout.failure_reason,
    }


class MyEarningsView(APIView):
    """GET /api/v1/me/earnings — ledger-derived expert earnings (BR-32)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.payments import services

        earnings = services.earnings_for(request.user)
        return Response(
            {
                **earnings,
                "expert_credit_display": to_major(earnings["expert_credit_minor"]),
                "payout_display": to_major(earnings["payout_minor"]),
                "outstanding_display": to_major(earnings["outstanding_minor"]),
                "currency": "USD",
            }
        )


class MyPayoutListView(APIView):
    """GET /api/v1/me/payouts — the expert's payout history."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        payouts = (
            Payout.objects.filter(expert=request.user)
            .select_related("order")
            .order_by("-created_at")[:50]
        )
        return Response({"results": [_payout_meta(p) for p in payouts]})
