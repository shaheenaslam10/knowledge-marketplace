"""Service requests — a student's brief for expert help (docs/workflows/open-marketplace.md).

Integrity framing (BR-10/BR-14): categories describe legitimate tutoring /
coaching / feedback help. The domain never models "do this work for me".
"""

import uuid as uuid_lib

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class ServiceRequest(TimeStampedModel):
    class Mode(models.TextChoices):
        OPEN = "open", "Open marketplace"
        MANAGED = "managed", "Managed service"

    class Category(models.TextChoices):
        # Integrity-relevant help types (BR-10: teacher-not-ghostwriter).
        TUTORING = "tutoring", "1:1 tutoring sessions"
        CONCEPT_COACHING = "concept_coaching", "Concept coaching"
        PROBLEM_WALKTHROUGH = "problem_walkthrough", "Guided problem walkthrough"
        WRITING_FEEDBACK = "writing_feedback", "Writing feedback & coaching"
        CODE_REVIEW = "code_review", "Code review & mentoring"
        EXAM_PREP = "exam_prep", "Exam preparation"
        MENTORSHIP = "mentorship", "Ongoing mentorship"
        OTHER = "other", "Other legitimate help"

    class PricingType(models.TextChoices):
        FIXED = "fixed", "Fixed price"
        HOURLY = "hourly", "Hourly rate"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Receiving offers"
        MATCHED = "matched", "Expert selected"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected (managed review)"
        IN_REVIEW = "in_review", "In review (managed)"
        POOLED = "pooled", "Sent to expert pool (managed)"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="service_requests"
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.OPEN, db_index=True)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.TUTORING)
    title = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(
        "taxonomy.TaxonomyTerm",
        on_delete=models.PROTECT,
        related_name="service_requests",
        null=True,
        blank=True,
    )
    skills = models.ManyToManyField(
        "taxonomy.TaxonomyTerm", related_name="skill_requests", blank=True
    )
    pricing_type = models.CharField(
        max_length=10, choices=PricingType.choices, default=PricingType.FIXED
    )
    budget_min = models.BigIntegerField(null=True, blank=True)  # minor units
    budget_max = models.BigIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    deadline = models.DateField(null=True, blank=True)
    preferred_schedule = models.CharField(max_length=300, blank=True)
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    # BR-10 attestation at publish.
    integrity_attested_at = models.DateTimeField(null=True, blank=True)
    integrity_policy_version = models.CharField(max_length=20, blank=True)
    # Managed-service fields (Phase 6+; columns now so both paths share one model).
    quote_amount = models.BigIntegerField(null=True, blank=True)
    review_notes = models.CharField(max_length=500, blank=True)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_requests",
    )
    # Counters / lifecycle bookkeeping.
    offer_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    reopened_at = models.DateTimeField(null=True, blank=True)  # BR-08: reopen once
    closed_reason = models.CharField(max_length=200, blank=True)
    attachments = models.ManyToManyField(
        "files.Attachment", related_name="service_requests", blank=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["student", "-created_at"]),
            models.Index(fields=["mode", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"request:{self.pk}:{self.status}"

    @property
    def is_open_for_offers(self) -> bool:
        return (
            self.status == self.Status.OPEN
            and self.mode == self.Mode.OPEN
            and (self.expires_at is None or self.expires_at > timezone.now())
        )
