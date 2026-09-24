"""Orders — the unified pipeline anchor created at selection (ADR-0015).

Phase 4 only ever creates rows in `awaiting_payment` (see services.py);
payment/delivery/completion transitions arrive with the payments phase.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.payments.config import COMMISSION_RATE


class Order(TimeStampedModel):
    class Source(models.TextChoices):
        OPEN_BID = "open_bid", "Open marketplace offer"
        MANAGED_POOL = "managed_pool", "Managed — expert pool invitation"
        MANAGED_DIRECT = "managed_direct", "Managed — direct assignment"

    class Status(models.TextChoices):
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
        ACTIVE = "active", "Active"
        DELIVERED = "delivered", "Delivered"
        REVISION_REQUESTED = "revision_requested", "Revision requested"
        COMPLETED = "completed", "Completed"
        DISPUTED = "disputed", "Disputed"
        CANCELLED = "cancelled", "Cancelled"

    number = models.CharField(max_length=30, unique=True, editable=False)
    request = models.ForeignKey(
        "service_requests.ServiceRequest", on_delete=models.PROTECT, related_name="orders"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="student_orders"
    )
    # Expert by id + snapshot, per the lateral-reference rule (ADR-0001).
    expert_id = models.BigIntegerField()
    expert_name = models.CharField(max_length=150)
    expert_slug = models.SlugField(max_length=180, blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, db_index=True)
    offer_id = models.UUIDField(null=True, blank=True)
    amount = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=COMMISSION_RATE)
    commission_amount = models.BigIntegerField(default=0)
    expert_amount = models.BigIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AWAITING_PAYMENT, db_index=True
    )
    deadline = models.DateField(null=True, blank=True)
    revisions_allowed = models.PositiveSmallIntegerField(default=2)
    revisions_used = models.PositiveSmallIntegerField(default=0)
    accepted_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    has_open_dispute = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_orders",
    )
    cancellation_reason = models.CharField(max_length=200, blank=True)
    auto_approve_at = models.DateTimeField(null=True, blank=True)
    delivery_due_at = models.DateTimeField(null=True, blank=True)
    attachments = models.ManyToManyField("files.Attachment", related_name="orders", blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["student", "-created_at"]),
            models.Index(fields=["expert_id", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"order:{self.number}:{self.status}"


def _next_number() -> str:
    return f"ORD-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


class DeadlineProposal(TimeStampedModel):
    """Late-delivery path (order-lifecycle.md): either party proposes a new
    deadline; the counterpart accepts/declines. One pending proposal per order."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="deadline_proposal")
    proposed_by_id = models.BigIntegerField()
    proposed_due_at = models.DateTimeField()
    note = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)


# Delivery + OrderEvent live in delivery.py (imported here so app loading,
# migrations and `from apps.orders.models import X` all see them).
from apps.orders.delivery import Delivery, OrderEvent  # noqa: E402,F401
