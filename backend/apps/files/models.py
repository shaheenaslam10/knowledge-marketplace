"""Files sidecar — Attachment metadata + secure access (docs/workflows/files.md).

A shared Attachment table referenced by owner models via explicit FKs (ADR:
explicit > magic). Bytes live in the configured storage (local FileSystemStorage
in dev/CI — var/media/, R2 in prod later; same rows either way).

Phase 3 purposes: `credential` (expert applications, private) and `avatar`
(public-read). Other purposes arrive with their phases.
"""

from __future__ import annotations

import uuid as uuid_lib

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


def attachment_storage_path(instance, filename: str) -> str:
    """`uploads/{purpose}/{yyyy}/{uuid}.{ext}` — no user-controlled path segments
    and no user data in keys (docs/workflows/files.md)."""
    from django.utils import timezone

    ext = (instance.original_name.rsplit(".", 1)[-1] or "bin").lower()
    year = timezone.now().strftime("%Y")
    return f"uploads/{instance.purpose}/{year}/{uuid_lib.uuid4()}.{ext}"


class Attachment(TimeStampedModel):
    class Purpose(models.TextChoices):
        CREDENTIAL = "credential", "Credential (expert application)"
        AVATAR = "avatar", "Avatar"
        REQUEST_BRIEF = "request_brief", "Request brief attachment"

    class Access(models.TextChoices):
        """`private` = uploader + authorized parties only (grant_download gates
        every request); `public` = readable by anyone (avatars only)."""

        PRIVATE = "private", "Private"
        PUBLIC = "public", "Public read"

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="attachments",
    )
    purpose = models.CharField(max_length=30, choices=Purpose.choices, db_index=True)
    access = models.CharField(max_length=20, choices=Access.choices, default=Access.PRIVATE)
    file = models.FileField(upload_to=attachment_storage_path, max_length=300)
    original_name = models.CharField(max_length=254)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["uploader", "sha256"]),
            models.Index(fields=["purpose", "-created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.purpose}:{self.original_name}"
