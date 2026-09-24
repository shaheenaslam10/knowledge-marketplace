"""Core services — PlatformConfig access for domain layers.

Platform money/operational configuration (database.md §payments, built Phase
10): the singleton row is seeded from these defaults via a data migration.
Domain code (payments/orders/bidding/disputes) reads through these helpers;
mutations live in `apps.portal.services` (validated + audited) — domain
layers never write config. Values here are the canonical defaults (BR-17/18,
BR-30, BR-40 as shipped through Phase 9).
"""

from __future__ import annotations

from decimal import Decimal

from apps.core.models import PlatformConfig

# Canonical defaults — mirrored by the model field defaults above and the
# data migration that seeds the singleton row.
DEFAULT_OPEN_COMMISSION_RATE = Decimal("0.1500")  # BR-17
DEFAULT_MANAGED_COMMISSION_RATE = Decimal("0.2000")
DEFAULT_MIN_OFFER_MINOR = 500  # BR-18 binding floor ($5.00, 2-decimal currencies)
DEFAULT_PAYOUT_MIN_MINOR = 1000  # BR-30 roll-forward floor ($10.00)
DEFAULT_DISPUTE_WINDOW_DAYS = 7  # BR-40


def commission_rate_for(source: str) -> Decimal:
    """BR-17 rate by order source — PlatformConfig-backed."""
    config = PlatformConfig.load()
    if source == "open_bid":
        return config.open_commission_rate
    if source in ("managed_pool", "managed_direct"):
        return config.managed_commission_rate
    raise ValueError(f"Unknown order source: {source}")


def min_offer_minor() -> int:
    """BR-18 binding offer floor (PlatformConfig-backed)."""
    return PlatformConfig.load().min_offer_minor


def payout_min_minor() -> int:
    """BR-30 payout roll-forward floor (PlatformConfig-backed)."""
    return PlatformConfig.load().payout_min_minor


def dispute_window_days() -> int:
    """BR-40 dispute window in days (PlatformConfig-backed)."""
    return PlatformConfig.load().dispute_window_days
