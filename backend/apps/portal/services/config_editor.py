"""PlatformConfig editor (Phase 10) — the ONLY write path for platform
configuration. Values validated server-side against the documented bounds;
every change writes an audit row with before/after. Admin-only (support has
no config rights — user-roles matrix)."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import FieldDoesNotExist
from django.db import transaction

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError
from apps.core.models import PlatformConfig

# Field specs: (python type, inclusive min, inclusive max, label)
FIELD_SPECS: dict[str, tuple[type, Decimal | int, Decimal | int, str]] = {
    "open_commission_rate": (
        Decimal,
        Decimal("0"),
        Decimal("0.50"),
        "Open-marketplace commission rate (BR-17)",
    ),
    "managed_commission_rate": (
        Decimal,
        Decimal("0"),
        Decimal("0.50"),
        "Managed-service commission rate",
    ),
    "min_offer_minor": (int, 100, 100_000_000, "Binding offer floor, minor units (BR-18)"),
    "payout_min_minor": (int, 100, 100_000_000, "Payout roll-forward floor, minor units (BR-30)"),
    "dispute_window_days": (int, 1, 30, "Dispute window after completion, days (BR-40)"),
}

MUTABLE_FIELDS = tuple(FIELD_SPECS)


def config_payload() -> dict:
    config = PlatformConfig.load()
    return {
        "open_commission_rate": str(config.open_commission_rate),
        "managed_commission_rate": str(config.managed_commission_rate),
        "min_offer_minor": config.min_offer_minor,
        "payout_min_minor": config.payout_min_minor,
        "dispute_window_days": config.dispute_window_days,
        "default_currency": config.default_currency,  # immutable (ledger currency contract)
        "updated_at": config.updated_at.isoformat(),
        "mutable_fields": list(MUTABLE_FIELDS),
    }


def _coerce(name: str, raw) -> Decimal | int:
    spec_type, low, high, label = FIELD_SPECS[name]
    try:
        value = spec_type(raw) if not isinstance(raw, spec_type) else raw
    except (TypeError, ValueError, ArithmeticError):
        raise DomainError(f"{label}: invalid value.", code="validation_error") from None
    if value < low or value > high:
        raise DomainError(f"{label} must be between {low} and {high}.", code="validation_error")
    return value


@transaction.atomic
def update_config(actor, changes: dict) -> dict:
    """Validate + apply whitelisted config changes; audit before/after."""
    unknown = set(changes) - set(MUTABLE_FIELDS)
    if unknown:
        raise DomainError(
            f"Unknown or immutable configuration fields: {', '.join(sorted(unknown))}.",
            code="validation_error",
        )
    config = PlatformConfig.load()
    before: dict = {}
    after: dict = {}
    for name, raw in changes.items():
        value = _coerce(name, raw)
        current = getattr(config, name)
        if isinstance(current, Decimal):
            value = value.quantize(Decimal("0.0001")) if spec_type_is_decimal(name) else value
        if current == value:
            continue  # idempotent no-op
        before[name] = str(current)
        after[name] = str(value)
        setattr(config, name, value)
    if before:
        config.save(update_fields=[*after.keys(), "updated_at"])
        audit_log(
            actor,
            action="platform.config_updated",
            obj=config,
            detail={"before": before, "after": after},
        )
    return config_payload()


def spec_type_is_decimal(name: str) -> bool:
    try:
        return FIELD_SPECS[name][0] is Decimal
    except (KeyError, FieldDoesNotExist):
        return False
