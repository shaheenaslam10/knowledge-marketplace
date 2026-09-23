"""Managed-service assignments (docs/workflows/managed-service.md).

Two routing artifacts, both converging into the ONE Order pipeline (ADR-0015):
- PoolInvitation: owner broadcasts a managed request to a selected pool of
  eligible experts; FIRST accept wins (row-locked) and creates the order at
  the platform-set quote (`request.quote_amount`, BR-22).
- DirectAssignment: owner proposes a specific expert/price/scope; the expert
  accepts (creating the order at the quoted price) or declines (BR-21).
"""

import uuid as uuid_lib

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class PoolInvitation(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    request = models.ForeignKey(
        "service_requests.ServiceRequest", on_delete=models.PROTECT, related_name="pool_invitations"
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pool_invitations"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    # Expert's expected amount where applicable — ADVISORY only; the order is
    # created at the platform quote (docs/workflows/managed-service.md).
    expected_amount = models.BigIntegerField(null=True, blank=True)
    decline_reason = models.CharField(max_length=200, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="pool_invitations_sent",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request", "expert"], name="uniq_pool_invitation_per_expert"
            )
        ]
        indexes = [
            models.Index(fields=["expert", "status"]),
            models.Index(fields=["request", "status"]),
        ]

    def __str__(self) -> str:
        return f"pool-invite:{self.pk}:{self.status}"


class DirectAssignment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"
        SUPERSEDED = "superseded", "Superseded (reassigned)"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    request = models.ForeignKey(
        "service_requests.ServiceRequest",
        on_delete=models.PROTECT,
        related_name="direct_assignments",
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="direct_assignments"
    )
    expert_name = models.CharField(max_length=150)  # snapshot for admin listing (ADR-0001 style)
    amount = models.BigIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    deadline = models.DateField(null=True, blank=True)
    scope_note = models.CharField(max_length=500, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    decline_reason = models.CharField(max_length=200, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    decided_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="direct_assignments_made",
    )

    class Meta:
        indexes = [
            models.Index(fields=["expert", "status"]),
            models.Index(fields=["request", "status"]),
        ]

    def __str__(self) -> str:
        return f"direct-assign:{self.pk}:{self.status}"
