"""Notification delivery — django-q2 task (Phase 8, ADR-0002 rules apply:
idempotent, thin wrapper over the service layer, sync mode in tests)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def deliver_notification(notification_id: str) -> dict:
    """Realtime push (best-effort) + email (per category preference).
    Idempotent: re-execution re-sends at worst, never corrupts state."""
    from apps.notifications.models import Notification
    from apps.notifications.services import _push_realtime, email_enabled

    notification = Notification.objects.select_related("recipient").get(pk=notification_id)
    if notification.pushed_at is None:
        _push_realtime(notification)
        notification.refresh_from_db(fields=["pushed_at"])
    if notification.emailed_at is None and email_enabled(
        notification.recipient_id, notification.type
    ):
        send_mail(
            subject=f"{notification.title} — Hybrid Expert Marketplace",
            message="\n".join(
                part
                for part in (notification.body, notification.url and f"Open: {notification.url}")
                if part
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.recipient.email],
            fail_silently=False,
        )
        Notification.objects.filter(pk=notification.pk).update(emailed_at=timezone.now())
    logger.info("notification delivered id=%s type=%s", notification_id, notification.type)
    return {"delivered": True}
