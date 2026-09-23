"""Delivery + order timeline models (docs/workflows/order-lifecycle.md).

Delivery: expert's work submission (revision_number 0 = initial delivery).
OrderEvent: the persisted domain history — the timeline is BUILT FROM these
rows, never fabricated in the frontend (docs/process/roadmap-phases.md P6).
"""

from __future__ import annotations

import uuid as uuid_lib

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.orders.models import Order


class Delivery(TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted (awaiting review)"
        APPROVED = "approved", "Approved"
        REVISION_REQUESTED = "revision_requested", "Revision requested"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="deliveries")
    revision_number = models.PositiveSmallIntegerField(default=0)  # 0 = initial delivery
    summary = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED, db_index=True
    )
    attachments = models.ManyToManyField("files.Attachment", related_name="deliveries", blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_source = models.CharField(max_length=10, blank=True)  # student | auto | admin

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "revision_number"], name="uniq_delivery_revision_per_order"
            )
        ]
        ordering = ["revision_number"]

    def __str__(self) -> str:
        return f"delivery:{self.pk}:rev{self.revision_number}:{self.status}"


class OrderEvent(TimeStampedModel):
    """Append-only domain history for the order timeline (no frontend fabrication)."""

    class EventType(models.TextChoices):
        CREATED = "created", "Order created"
        PAYMENT_CONFIRMED = "payment_confirmed", "Payment confirmed"
        DELIVERED = "delivered", "Work delivered"
        REVISION_REQUESTED = "revision_requested", "Revision requested"
        REDELIVERED = "redelivered", "Revision delivered"
        APPROVED = "approved", "Delivery approved"
        AUTO_APPROVED = "auto_approved", "Auto-approved (72h elapsed)"
        COMPLETED = "completed", "Order completed"
        CANCELLED = "cancelled", "Order cancelled"
        DISPUTE_OPENED = "dispute_opened", "Dispute opened"
        # Administrative marker (jobs table, order-lifecycle.md) — dedupes the
        # hourly T-24h reminder; the workspace timeline renders it as a plain
        # "deadline reminder sent" row.
        DEADLINE_REMINDED = "deadline_reminded", "Deadline reminder sent"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=25, choices=EventType.choices, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_events",
    )
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"order-event:{self.order_id}:{self.event_type}"
