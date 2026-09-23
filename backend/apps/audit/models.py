"""Audit sidecar — Append-only record of sensitive actions (BR-42).

A sidecar service (docs/architecture/backend.md): domain apps WRITE events via
``audit.services.log``; nothing in this app imports domain apps. Rows are
immutable (no update/delete anywhere) and carry no secrets — callers put
non-sensitive before/after detail in ``detail`` only.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class AuditEvent(TimeStampedModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
        help_text="Null = system/background action.",
    )
    action = models.CharField(max_length=100, db_index=True)
    object_type = models.CharField(max_length=100)
    object_id = models.CharField(max_length=64, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["actor", "-created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.action} {self.object_type}#{self.object_id}"
