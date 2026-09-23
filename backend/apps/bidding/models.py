"""Offers — one per expert per request, editable while pending (BR-15..18)."""

import uuid as uuid_lib

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Offer(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    request = models.ForeignKey(
        "service_requests.ServiceRequest", on_delete=models.PROTECT, related_name="offers"
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="offers"
    )
    amount = models.BigIntegerField()  # minor units
    currency = models.CharField(max_length=3, default="USD")
    timeline_text = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    response_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request", "expert"], name="uniq_offer_per_expert_per_request"
            )
        ]
        indexes = [
            models.Index(fields=["request", "status"]),
            models.Index(fields=["expert", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"offer:{self.pk}:{self.status}"
