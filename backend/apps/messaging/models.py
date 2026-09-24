"""Messaging — persistent, context-scoped chat (Phase 8, docs/workflows/messaging.md).

Threads live at every match stage: request-context (pre-order) and order-context.
Participants are server-enforced on connect AND on send; BR-34/35 govern policy.
WS consumers call the SAME services as REST — one business path, DB is the
source of truth, sockets are transport only.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Thread(TimeStampedModel):
    """One thread per context (created lazily on first message)."""

    class Context(models.TextChoices):
        REQUEST = "request", "Service request"
        ORDER = "order", "Order"
        DISPUTE = "dispute", "Dispute"  # reserved — Phase 9 creates these

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    context_type = models.CharField(max_length=12, choices=Context.choices, db_index=True)
    request = models.ForeignKey(
        "service_requests.ServiceRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="threads",
    )
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="threads"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="threads", blank=True
    )
    # denormalized for inbox ordering (maintained by messaging.services on send)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self) -> str:
        return f"thread:{self.context_type}:{self.pk.hex[:8]}"


class Message(TimeStampedModel):
    class BodyLimits:
        MAX_CHARS = 5000  # docs/workflows/messaging.md

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="messages"
    )
    body = models.TextField()  # plain text only (linkified client-side, never HTML)
    attachment = models.ForeignKey(
        "files.Attachment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
    )
    is_hidden = models.BooleanField(default=False)  # report-driven moderation flag

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["thread", "created_at"])]

    def __str__(self) -> str:
        return f"message:{self.sender_id}:{self.pk.hex[:8]}"


class MessageReceipt(models.Model):
    """Per-participant read cursor (drives unread counts) — docs/workflows/messaging.md.
    One row per (thread, user); `last_read_at` is a per-participant read_at."""

    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_receipts"
    )
    last_read_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["thread", "user"], name="uniq_receipt_thread_user"),
        ]

    def __str__(self) -> str:
        return f"receipt:{self.thread_id}:{self.user_id}"


class MessageReport(TimeStampedModel):
    """BR-34 report-driven moderation: participant reports an on-platform
    communication concern. Queue/dashboard = Phase 10; the row + audited
    staff view is the Phase 9 surface."""

    class Reason(models.TextChoices):
        OFF_PLATFORM = "off_platform", "Off-platform payment/contact"
        ABUSE = "abuse", "Abusive language"
        INTEGRITY = "integrity", "Academic integrity concern"
        SPAM = "spam", "Spam"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWED = "reviewed", "Reviewed"
        DISMISSED = "dismissed", "Dismissed"

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reports")
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="message_reports"
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="message_reports_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["message", "reported_by"],
                condition=models.Q(status="open"),
                name="one_open_report_per_message_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"report:{self.pk}:msg:{self.message_id}:{self.reason}"
