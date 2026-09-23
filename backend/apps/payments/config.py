"""Money configuration — platform commission (BR-17).

Module constants until the payments phase introduces the PlatformConfig
singleton (docs/architecture/database.md); nothing here is env-configurable
so the split stays intentional and test-visible.
"""

from __future__ import annotations

from decimal import Decimal

COMMISSION_RATE = Decimal("0.1500")  # 15% platform fee, snapshot into every Order
MIN_OFFER_MINOR = 500  # BR-18: binding floor (equals $5.00 for 2-decimal currencies)


def commission_split(amount_minor: int, rate: Decimal = COMMISSION_RATE) -> tuple[int, int]:
    """Return (commission_minor, expert_net_minor); expert keeps the remainder."""
    commission = int(
        (Decimal(amount_minor) * rate).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
    )
    return commission, amount_minor - commission
