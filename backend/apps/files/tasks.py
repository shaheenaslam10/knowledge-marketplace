"""Files tasks — django-q2 job wrappers (schedules are ops setup via the
admin, docs/workflows/files.md retention section)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def retention_cleanup() -> dict:
    """Daily — purge expired briefs (30d after cancellation/expiry) and
    ended-order files (12 months), honouring legal_hold (BR-36)."""
    from apps.files import services

    return services.retention_cleanup()
