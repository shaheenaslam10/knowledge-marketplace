"""Review domain models (Phase 9, BR-37..39 — docs/workflows/reviews.md)."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Review(TimeStampedModel):
    """One student review per completed order (1-1), with a single immutable
    expert reply. Hidden reviews stop counting toward public aggregates."""

    class Status(models.TextChoices):
        PUBLISHED = "published", "Published"
        HIDDEN = "hidden", "Hidden (moderation)"

    order = models.OneToOneField("orders.Order", on_delete=models.PROTECT, related_name="review")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reviews_written"
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField()  # 1..5
    sub_quality = models.PositiveSmallIntegerField(null=True, blank=True)
    sub_communication = models.PositiveSmallIntegerField(null=True, blank=True)
    sub_timeliness = models.PositiveSmallIntegerField(null=True, blank=True)
    body = models.TextField()
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PUBLISHED, db_index=True
    )
    expert_reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    expert_rating_of_student = models.PositiveSmallIntegerField(null=True, blank=True)  # private
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["expert", "status", "-created_at"])]

    def __str__(self) -> str:
        return f"review:{self.pk}:order:{self.order_id}:{self.rating}"
