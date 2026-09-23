"""Money configuration — platform commission (BR-17).

Module constants until the payments phase introduces the PlatformConfig
singleton (docs/architecture/database.md); nothing here is env-configurable
so the split stays intentional and test-visible.
"""

from __future__ import annotations

from decimal import Decimal

OPEN_COMMISSION_RATE = Decimal("0.1500")  # open-marketplace fee (BR-17)
MANAGED_COMMISSION_RATE = Decimal("0.2000")  # managed service fee (managed-service workflow)
COMMISSION_RATE = OPEN_COMMISSION_RATE  # backwards-compatible alias (open market default)
MIN_OFFER_MINOR = 500  # BR-18: binding floor (equals $5.00 for 2-decimal currencies)

_SOURCES = {
    "open_bid": OPEN_COMMISSION_RATE,
    "managed_pool": MANAGED_COMMISSION_RATE,
    "managed_direct": MANAGED_COMMISSION_RATE,
}


def rate_for_source(source: str) -> Decimal:
    """Commission rate snapshotted onto the order, by acquisition source."""
    try:
        return _SOURCES[source]
    except KeyError:
        raise ValueError(f"Unknown order source: {source}") from None


def commission_split(amount_minor: int, rate: Decimal = COMMISSION_RATE) -> tuple[int, int]:
    """Return (commission_minor, expert_net_minor); expert keeps the remainder."""
    commission = int(
        (Decimal(amount_minor) * rate).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
    )
    return commission, amount_minor - commission
