"""Order tasks — job wrappers (Phase 6) + pre-Phase-8 email shim.

Notification delivery moved to the Phase 8 funnel (apps.notifications);
`send_order_event_email` remains only so old queued tasks drain cleanly.
django-q2 job wrappers wrap the idempotent services (schedules are ops
setup via the admin, docs/workflows/order-lifecycle.md).
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def auto_approve_deliveries() -> int:
    """BR-24 — approve delivered orders past the 72h auto-approval timer.
    Schedule: every 15 min (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.auto_approve_due()


def awaiting_payment_sweeper() -> int:
    """BR-23 — cancel orders unpaid for more than 72h.
    Schedule: hourly (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.sweep_unpaid()


def deadline_reminder() -> int:
    """T-24h expert warning (deduped by the persisted deadline_reminded event).
    Schedule: hourly (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.deadline_reminder()


def send_order_event_email(order_id: str, event: str, extra_email: int | None = None) -> dict:
    """Backward-compatible shim: queued tasks from before the Phase 8 funnel
    land here and are translated into notifications (idempotent)."""
    from apps.orders.models import Order
    from apps.orders.services import _EVENT_COPY, _notify

    order = Order.objects.filter(pk=order_id).first()
    if order is None or event not in _EVENT_COPY:
        return {"sent": False}
    _notify(order, event)
    return {"sent": True}


def overdue_flagging() -> int:
    """Daily — flag orders overdue >24h past deadline for admin/student action
    (BR-26, order-lifecycle.md jobs table)."""
    from apps.orders import services

    return services.flag_overdue()
