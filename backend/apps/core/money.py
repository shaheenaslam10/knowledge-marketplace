"""Money utilities — integer minor units + ISO currency (ADR-0009).

All monetary amounts in this platform are integer minor units (cents for USD).
Floats are forbidden anywhere money is involved. Zero-decimal currencies have
exponent 0 (displayed without fraction digits).
"""

from __future__ import annotations

ZERO_DECIMAL_CURRENCIES = {
    "JPY",
    "KRW",
    "VND",
    "CLP",
    "ISK",
    "XOF",
    "XAF",
    "BIF",
    "DJF",
    "GNF",
    "KMF",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VUV",
}
DEFAULT_CURRENCY = "USD"


def exponent_for(currency: str) -> int:
    return 0 if currency.upper() in ZERO_DECIMAL_CURRENCIES else 2


def to_major(amount_minor: int, currency: str = DEFAULT_CURRENCY) -> float:
    return amount_minor / (10 ** exponent_for(currency))


def format_money(amount_minor: int, currency: str = DEFAULT_CURRENCY) -> str:
    """Locale-independent display form: ``12.34 USD`` / ``500 JPY``."""
    currency = currency.upper()
    exp = exponent_for(currency)
    sign = "-" if amount_minor < 0 else ""
    amount = abs(amount_minor)
    if exp == 0:
        return f"{sign}{amount} {currency}"
    major, frac = divmod(amount, 10**exp)
    return f"{sign}{major:,}.{frac:0{exp}d} {currency}"


def allocate(total_minor: int, weights: list[int]) -> list[int]:
    """Split ``total_minor`` proportionally to ``weights`` with largest-remainder
    rounding so the parts always sum exactly to the total (commission splits,
    partial refunds). All weights must be >= 0 and at least one > 0.
    """
    if not weights:
        raise ValueError("weights must be non-empty")
    if total_minor < 0:
        raise ValueError("total must be >= 0")
    if any(w < 0 for w in weights) or sum(weights) <= 0:
        raise ValueError("weights must be >= 0 and sum > 0")

    total_weight = sum(weights)
    raw = [total_minor * w / total_weight for w in weights]
    floors = [int(r // 1) for r in raw]
    remainder = total_minor - sum(floors)
    # distribute leftover units to the largest fractional parts (stable order)
    order = sorted(range(len(weights)), key=lambda i: raw[i] - floors[i], reverse=True)
    for i in order[:remainder]:
        floors[i] += 1
    return floors
