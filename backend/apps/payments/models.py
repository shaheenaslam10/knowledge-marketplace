"""Payments domain models — the financial audit trail (BR-32, ADR-0005/0009).

Minimum correct model set (documented choice, docs/workflows/payments.md):
Payment (1-1 with order, the transaction of record), Refund, Payout,
LedgerEntry (append-only), WebhookEvent (idempotent ingestion). No
PaymentAttempt/PaymentTransaction tables — failure/retry history lives in
Payment.status + failure_reason + audit + webhook events.

Cross-app references to orders are **string FKs**: apps.payments is a lower
layer (ADR-0005 amendment) so it never imports apps.orders in Python, while
the DB-level FK keeps a payment attached to the wrong order impossible.

All amounts are integer minor units (ADR-0009). Never floats.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.payments.config import COMMISSION_RATE


class Payment(TimeStampedModel):
    class Gateway(models.TextChoices):
        MANUAL = "manual", "Manual (operator-confirmed / dev simulation)"
        STRIPE = "stripe", "Stripe"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REQUIRES_ACTION = "requires_action", "Requires action"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"
        REFUNDED = "refunded", "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially refunded"

    order = models.OneToOneField("orders.Order", on_delete=models.PROTECT, related_name="payment")
    gateway = models.CharField(max_length=20, choices=Gateway.choices)
    provider_reference = models.CharField(max_length=120, unique=True, null=True, blank=True)
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    failure_reason = models.CharField(max_length=255, blank=True)
    instructions = models.TextField(
        blank=True
    )  # static payment instructions snapshot (manual mode)
    refunded_minor = models.BigIntegerField(default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self) -> str:
        return f"payment:{self.order_id}:{self.gateway}:{self.status}"


class Refund(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending provider"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    class Reason(models.TextChoices):
        EXPERT_FAULT = "expert_fault", "Expert-fault cancellation (full refund)"
        PLATFORM_FAULT = "platform_fault", "Platform fault"
        MUTUAL = "mutual", "Mutual agreement"
        ADMIN_DECISION = "admin_decision", "Admin decision (student-fault / partial)"
        DISPUTE_RESOLUTION = "dispute_resolution", "Dispute resolution"

    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    reason = models.CharField(max_length=30, choices=Reason.choices)
    note = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    provider_reference = models.CharField(max_length=120, blank=True)
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refunds_initiated",
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"refund:{self.payment_id}:{self.amount_minor}:{self.status}"


class Payout(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_TRANSIT = "in_transit", "In transit"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REVERSED = "reversed", "Reversed"

    order = models.ForeignKey("orders.Order", on_delete=models.PROTECT, related_name="payouts")
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payouts"
    )
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.SCHEDULED, db_index=True
    )
    provider_reference = models.CharField(max_length=120, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["expert", "-created_at"]), models.Index(fields=["status"])]

    def __str__(self) -> str:
        return f"payout:{self.order_id}:{self.expert_id}:{self.status}"


class LedgerEntry(models.Model):
    """Append-only financial source of truth (BR-32).

    Identity enforced per order (nightly payments.ledger_check):
    charge + refund == commission + expert_credit + fee  (signed minor units).
    """

    class EntryType(models.TextChoices):
        CHARGE = "charge", "Student charge (money in)"
        COMMISSION = "commission", "Platform commission"
        EXPERT_CREDIT = "expert_credit", "Expert credit (payable)"
        REFUND = "refund", "Refund to student (money out)"
        PAYOUT = "payout", "Payout to expert (money out)"
        FEE = "fee", "Provider fee"
        ADJUSTMENT = "adjustment", "Manual adjustment"

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    entry_type = models.CharField(max_length=15, choices=EntryType.choices, db_index=True)
    amount_minor = models.BigIntegerField()  # signed
    currency = models.CharField(max_length=3, default="USD")
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ledger_entries",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries",
    )
    description = models.CharField(max_length=255, blank=True)
    provider_object_id = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["order", "entry_type"]),
            models.Index(fields=["user", "entry_type"]),
        ]

    def __str__(self) -> str:
        return f"ledger:{self.entry_type}:{self.amount_minor}:{self.currency}"

    def save(self, *args, **kwargs):  # append-only guard
        if not self._state.adding:
            raise ValueError("LedgerEntry is append-only: existing entries can never be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # append-only guard
        raise ValueError("LedgerEntry is append-only: entries can never be deleted.")


class WebhookEvent(models.Model):
    """Provider webhook ingestion record — idempotency + audit (BR-33)."""

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    provider = models.CharField(max_length=20)
    event_id = models.CharField(max_length=190, unique=True)
    type = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.RECEIVED, db_index=True
    )
    error = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"webhook:{self.provider}:{self.event_id}:{self.status}"


# Commission snapshot source kept importable for migrations/defaults (BR-17).
COMMISSION_RATE_DEFAULT = COMMISSION_RATE
