"""Money configuration — platform commission (BR-17).

Since Phase 10 the values live in the `core.PlatformConfig` singleton
(seeded from the historical module constants; mutable only through the
audited portal config service). The functions below keep their signatures —
callers (bidding/assignments/orders) do not change.
"""

from __future__ import annotations

from decimal import Decimal

from apps.core.services import (
    DEFAULT_MANAGED_COMMISSION_RATE,
    DEFAULT_MIN_OFFER_MINOR,
    DEFAULT_OPEN_COMMISSION_RATE,
    commission_rate_for,
    min_offer_minor,
)

OPEN_COMMISSION_RATE = DEFAULT_OPEN_COMMISSION_RATE  # backwards-compatible alias
MANAGED_COMMISSION_RATE = DEFAULT_MANAGED_COMMISSION_RATE
COMMISSION_RATE = OPEN_COMMISSION_RATE  # backwards-compatible alias (open market default)
MIN_OFFER_MINOR = DEFAULT_MIN_OFFER_MINOR  # BR-18 (defaults; runtime value = PlatformConfig)

_SOURCES = {
    "open_bid": OPEN_COMMISSION_RATE,
    "managed_pool": MANAGED_COMMISSION_RATE,
    "managed_direct": MANAGED_COMMISSION_RATE,
}


def rate_for_source(source: str) -> Decimal:
    """Commission rate snapshotted onto the order, by acquisition source.

    Reads the PlatformConfig singleton (constants above = seeded defaults).
    """
    return commission_rate_for(source)


def min_offer() -> int:
    """Runtime BR-18 floor (PlatformConfig-backed)."""
    return min_offer_minor()


def commission_split(amount_minor: int, rate: Decimal = COMMISSION_RATE) -> tuple[int, int]:
    """Return (commission_minor, expert_net_minor); expert keeps the remainder."""
    commission = int(
        (Decimal(amount_minor) * rate).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
    )
    return commission, amount_minor - commission
