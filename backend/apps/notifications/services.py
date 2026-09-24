"""Notification services — the single funnel (docs/workflows/notifications.md).

Domain services call `notify()`; delivery (realtime push + email) happens in
the django-q2 task so request paths stay fast and retries are automatic.
Emails are plain text; no secrets/credentials ever enter payloads or logs.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import CATEGORY_FOR_TYPE, Notification, NotificationPreference

logger = logging.getLogger(__name__)


def email_enabled(recipient_id: int, ntype: str) -> bool:
    category = CATEGORY_FOR_TYPE.get(ntype, NotificationPreference.Category.ORDERS)
    if category == NotificationPreference.Category.ACCOUNT:
        return True  # security email is never muted
    pref = NotificationPreference.objects.filter(user_id=recipient_id, category=category).first()
    return pref.email_enabled if pref else True


def _push_realtime(notification: Notification) -> None:
    """Realtime push to the recipient's personal channel group (toast/badge).
    Best-effort: an unavailable channel layer must never fail delivery — the
    DB row + email remain the guaranteed channels (WS is a hint, never the
    source of truth)."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"user_{notification.recipient_id}",
            {
                "type": "notification.push",
                "id": str(notification.pk),
                "ntype": notification.type,
                "title": notification.title,
                "body": notification.body,
                "url": notification.url,
                "created_at": notification.created_at.isoformat(),
            },
        )
        Notification.objects.filter(pk=notification.pk).update(pushed_at=timezone.now())
    except Exception:
        logger.warning("notification realtime push failed id=%s", notification.pk, exc_info=True)


@transaction.atomic
def notify(
    recipient, ntype: str, *, title: str, body: str = "", url: str = "", context: dict | None = None
) -> Notification:
    """Create the inbox row + enqueue delivery. Safe to call from any service
    layer (orders/bidding/assignments/messaging/payments all sit above this
    app in the layer graph)."""
    if recipient is None:
        raise ValueError("notify() requires a recipient (user or user id).")
    recipient_id = getattr(recipient, "id", recipient)
    notification = Notification.objects.create(
        recipient_id=recipient_id,
        type=ntype,
        title=title[:200],
        body=(body or "")[:500],
        url=(url or "")[:300],
        context=context or {},
    )
    from django_q.tasks import async_task

    async_task(
        "apps.notifications.tasks.deliver_notification",
        str(notification.pk),
        task_name="notifications.deliver",
    )
    return notification


def notify_many(recipients, ntype: str, **kwargs) -> int:
    count = 0
    for recipient in recipients:
        if recipient is not None:
            notify(recipient, ntype, **kwargs)
            count += 1
    return count


def unread_count(user) -> int:
    return Notification.objects.filter(recipient=user, read_at__isnull=True).count()


def preferences_for(user) -> list[dict]:
    prefs = {p.category: p.email_enabled for p in NotificationPreference.objects.filter(user=user)}
    return [
        {"category": category, "label": label, "email_enabled": prefs.get(category, True)}
        for category, label in NotificationPreference.Category.choices
        if category != NotificationPreference.Category.ACCOUNT  # security email is not mutable
    ]


@transaction.atomic
def set_preference(user, category: str, *, email_enabled: bool) -> NotificationPreference:
    if category == NotificationPreference.Category.ACCOUNT:
        from apps.core.exceptions import DomainError

        raise DomainError("Security email cannot be disabled.", code="validation_error")
    valid = {c for c, _ in NotificationPreference.Category.choices}
    if category not in valid:
        from apps.core.exceptions import DomainError

        raise DomainError("Unknown notification category.", code="validation_error")
    pref, _created = NotificationPreference.objects.update_or_create(
        user=user, category=category, defaults={"email_enabled": email_enabled}
    )
    return pref
