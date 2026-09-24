"""Dispute domain models (Phase 9, BR-40/41 — docs/workflows/disputes.md)."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Dispute(TimeStampedModel):
    """One dispute per order (1-1). State machine lives in services.py; the
    payout freeze rides the denormalized `Order.has_open_dispute` flag."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under review"
        AWAITING_RESPONSE = "awaiting_response", "Awaiting response"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Reason(models.TextChoices):
        QUALITY_BELOW_EXPECTATIONS = "quality_below_expectations", "Quality below expectations"
        EXPERT_UNRESPONSIVE = "expert_unresponsive", "Expert unresponsive"
        DEADLINE_MISSED = "deadline_missed", "Deadline missed"
        SCOPE_DISAGREEMENT = "scope_disagreement", "Scope disagreement"
        PAYMENT_ISSUE = "payment_issue", "Payment issue"
        INTEGRITY_CONCERN = "integrity_concern", "Academic integrity concern"
        OTHER = "other", "Other"

    class Outcome(models.TextChoices):
        REFUND_STUDENT_FULL = "refund_student_full", "Full refund to student"
        REFUND_STUDENT_PARTIAL = "refund_student_partial", "Partial refund to student"
        RELEASE_EXPERT = "release_expert", "Release to expert"
        SPLIT = "split", "Split student/expert"
        NO_FAULT_CLOSE = "no_fault_close", "No fault — resume order"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField("orders.Order", on_delete=models.PROTECT, related_name="dispute")
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="disputes_opened"
    )
    reason = models.CharField(max_length=40, choices=Reason.choices)
    description = models.TextField()
    prior_order_status = models.CharField(max_length=30)  # restored by no_fault_close
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    outcome = models.CharField(max_length=30, choices=Outcome.choices, blank=True)
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="disputes_resolved",
        null=True,
        blank=True,
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    evidence = models.ManyToManyField(
        "files.Attachment", related_name="dispute_evidence", blank=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"dispute:{self.pk}:order:{self.order_id}:{self.status}"
