"""Audit service — the ONLY way audit rows are written (docs/architecture/backend.md)."""

from __future__ import annotations

import logging

from apps.audit.models import AuditEvent
from apps.core.middleware import get_request_id

logger = logging.getLogger(__name__)


def log(
    actor,
    *,
    action: str,
    obj=None,
    object_type: str = "",
    object_id: str = "",
    detail: dict | None = None,
    request=None,
) -> AuditEvent:
    """Append one audit event. Intentionally raises on failure: callers run
    inside a transaction, so a business transition and its audit row commit or
    roll back together (BR-13: all actions are recorded).
    ``detail`` must contain non-sensitive data only (no tokens/credentials)."""
    if obj is not None:
        object_type = object_type or obj.__class__.__name__
        object_id = object_id or str(getattr(obj, "pk", ""))
    try:
        event = AuditEvent.objects.create(
            actor=actor
            if (actor is not None and getattr(actor, "is_authenticated", False))
            else None,
            action=action,
            object_type=object_type,
            object_id=object_id,
            detail=detail or {},
            request_id=get_request_id(),
        )
        logger.info(
            "audit %s %s#%s actor=%s", action, object_type, object_id, getattr(actor, "pk", None)
        )
        return event
    except Exception:  # pragma: no cover - defensive: audit must not break flows
        logger.exception("audit write failed for action=%s", action)
        raise
