"""Shared abstract base models (core = shared kernel, imports no domain apps)."""

from django.db import models


class TimeStampedModel(models.Model):
    """created_at/updated_at audit timestamps (docs/architecture/database.md)."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
