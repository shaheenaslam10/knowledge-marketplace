"""Payments background jobs — thin wrappers over services (django-q2).

Task catalog (docs/architecture/background-jobs.md):
- payments.payout_sweeper  — hourly: schedule payouts for completed,
  dispute-free orders lacking one (BR-30). Settlement is never automatic.
- payments.ledger_check_task — nightly: verify the ledger identity
  charge + refund == commission + expert_credit + fee per order (BR-32).
Schedules are ops setup via the Django admin (django-q2 Scheduled tasks).
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def payout_sweeper() -> int:
    from apps.payments import services

    created = services.payout_sweeper()
    logger.info("payments.payout_sweeper scheduled=%s", created)
    return created


def ledger_check_task() -> dict:
    from apps.payments import services

    summary = services.ledger_check()
    if summary["violations"]:
        logger.error("payments.ledger_check violations=%s", summary["violations"])
    return summary
