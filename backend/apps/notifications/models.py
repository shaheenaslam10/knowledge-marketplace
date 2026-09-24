"""Notifications — in-app inbox + realtime + email fan-out (Phase 8,
docs/workflows/notifications.md).

Every notification is ONE row (source of truth); delivery happens in a
django-q2 task: realtime push to the `user_{id}` channel group + email unless
the category preference opts out. Email addresses are never logged; payloads
are minimal (id/type/title/url) — clients fetch detail on click.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """In-app inbox record — the source of truth for every notification."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=40, db_index=True)  # catalog id, e.g. order_delivered
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500, blank=True)
    url = models.CharField(max_length=300, blank=True)  # app path — client navigates on click
    context = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)
    pushed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "read_at"]),
        ]

    def __str__(self) -> str:
        return f"notification:{self.recipient_id}:{self.type}"


class NotificationPreference(models.Model):
    """Per user/category email toggle. `in_app` is always on by design;
    only email can be muted (docs/workflows/notifications.md). Absent row =
    default (email on)."""

    class Category(models.TextChoices):
        ACCOUNT = "account", "Account & security"  # always emailed (security)
        MARKETPLACE = "marketplace", "Offers & requests"
        ASSIGNMENTS = "assignments", "Invitations & assignments"
        ORDERS = "orders", "Orders & deliveries"
        MESSAGES = "messages", "Messages"
        PAYMENTS = "payments", "Payments & payouts"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences"
    )
    category = models.CharField(max_length=15, choices=Category.choices)
    email_enabled = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "category"], name="uniq_pref_user_category"),
        ]

    def __str__(self) -> str:
        return f"pref:{self.user_id}:{self.category}:{self.email_enabled}"


CATEGORY_FOR_TYPE: dict[str, str] = {
    "request_new_offer": "marketplace",
    "request_new_matching": "marketplace",
    "offer_accepted": "marketplace",
    "invitation_new": "assignments",
    "assignment_new": "assignments",
    "order_paid_activated": "orders",
    "order_delivered": "orders",
    "order_revision_requested": "orders",
    "order_approved_completed": "orders",
    "order_cancelled": "orders",
    "order_deadline_warning": "orders",
    "order_auto_approve_warning": "orders",
    "message_new": "messages",
    "payment_failed": "payments",
    "payout_scheduled": "payments",
    "payout_paid": "payments",
    "payout_failed": "payments",
}


def unsubscribe_token(user_id: int, category: str) -> str:
    from django.core import signing

    return signing.dumps({"u": user_id, "c": category}, salt="notifications.unsubscribe")


def resolve_unsubscribe_token(token: str) -> tuple[int, str] | None:
    from django.core import signing

    try:
        data = signing.loads(token, salt="notifications.unsubscribe", max_age=60 * 60 * 24 * 60)
    except signing.BadSignature:
        return None
    return int(data["u"]), str(data["c"])
