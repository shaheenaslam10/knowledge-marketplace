"""Public platform facts (Phase 12).

The marketplace charges commission (BR-17) and holds small balances back
(BR-30), but none of that was ever disclosed publicly -- `/pricing` is listed
in seo-ux.md and frontend.md yet never existed, and no endpoint exposed the
numbers. Hard-coding them into marketing copy would guarantee drift the first
time an operator edits PlatformConfig, so the page reads them from here.

Read-only, anonymous, and deliberately narrow: only values a prospective user
is entitled to know before signing up. No operational config leaks.
"""

from decimal import Decimal

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core import services
from apps.core.money import format_money, to_major


def _percent(rate: Decimal) -> str:
    """0.1500 -> '15' (trailing zeros trimmed, so 0.175 -> '17.5')."""
    pct = (rate * 100).quantize(Decimal("0.01")).normalize()
    return format(pct, "f")


class PublicPricingView(APIView):
    """`GET /api/v1/platform/pricing` — the commission facts, live."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    @extend_schema(
        operation_id="platform_pricing",
        description="Public pricing facts: commission rates and money floors.",
        responses={200: dict},
    )
    def get(self, request):
        currency = "USD"
        payload = {
            "currency": currency,
            "commission": {
                "open_bid": {
                    "rate": str(services.commission_rate_for("open_bid")),
                    "percent": _percent(services.commission_rate_for("open_bid")),
                    "label": "Open marketplace",
                    "description": (
                        "You post a request and experts bid. The platform fee is "
                        "deducted from the expert's earnings — students pay the "
                        "agreed price, never a surcharge."
                    ),
                },
                "managed": {
                    "rate": str(services.commission_rate_for("managed_pool")),
                    "percent": _percent(services.commission_rate_for("managed_pool")),
                    "label": "Managed service",
                    "description": (
                        "We triage your request, price it and match a vetted expert. "
                        "The higher fee covers that hands-on matching and support."
                    ),
                },
            },
            # `display` uses the project's canonical, locale-independent
            # formatter ("5.00 USD") rather than a float — the page renders it
            # verbatim, and a bare 5.0 would print as "5".
            "min_offer": {
                "minor": services.min_offer_minor(),
                "major": to_major(services.min_offer_minor(), currency),
                "display": format_money(services.min_offer_minor(), currency),
            },
            "payout_min": {
                "minor": services.payout_min_minor(),
                "major": to_major(services.payout_min_minor(), currency),
                "display": format_money(services.payout_min_minor(), currency),
            },
            "dispute_window_days": services.dispute_window_days(),
        }
        return Response(payload, status=status.HTTP_200_OK)
