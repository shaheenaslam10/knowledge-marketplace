"""Files service layer — validation, storage, and the ONLY access gate.

Rules implemented from docs/workflows/files.md:
- upload = direct-to-backend multipart; server validates purpose, size,
  extension AND content-type sniffing (never the client header)
- filenames sanitized; stored under uploads/{purpose}/{yyyy}/{uuid}.{ext}
- sha256 recorded; per-uploader dedupe on (sha256, size)
- grant_download() is the only file-access decision point
- local dev: 5-minute signed token → streaming FileResponse view
- no HTML/SVG serving; Content-Disposition set; nosniff on responses
"""

from __future__ import annotations

import hashlib
import logging
import uuid as uuid_lib
from dataclasses import dataclass

from django.core import signing
from django.core.files.base import File
from django.db import transaction

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.files.models import Attachment

logger = logging.getLogger(__name__)

DOWNLOAD_SALT = "files.download"
DOWNLOAD_TOKEN_TTL_SECONDS = 5 * 60  # 5 minutes (docs/workflows/files.md)


@dataclass(frozen=True)
class PurposeRule:
    max_bytes: int
    extensions: frozenset[str]
    magic: tuple[tuple[bytes, str], ...]  # (signature, content_type)
    access: str


MB = 1024 * 1024

# Allowlists per docs/workflows/files.md (Phase 3 purposes only). Others land
# with their phases. Sniffing covers every allowed type — pure Python (the
# python-magic C dependency is deliberately avoided for CI portability).
PURPOSE_RULES: dict[str, PurposeRule] = {
    Attachment.Purpose.CREDENTIAL: PurposeRule(
        max_bytes=10 * MB,
        extensions=frozenset({"pdf", "png", "jpg", "jpeg"}),
        magic=(
            (b"%PDF", "application/pdf"),
            (b"\x89PNG\r\n\x1a\n", "image/png"),
            (b"\xff\xd8\xff", "image/jpeg"),
        ),
        access=Attachment.Access.PRIVATE,
    ),
    Attachment.Purpose.REQUEST_BRIEF: PurposeRule(
        max_bytes=10 * MB,
        extensions=frozenset({"pdf", "png", "jpg", "jpeg"}),
        magic=(
            (b"%PDF", "application/pdf"),
            (b"\x89PNG\r\n\x1a\n", "image/png"),
            (b"\xff\xd8\xff", "image/jpeg"),
        ),
        access=Attachment.Access.PRIVATE,  # participants granted via grant_download (Phase 4)
    ),
    Attachment.Purpose.AVATAR: PurposeRule(
        max_bytes=2 * MB,
        extensions=frozenset({"png", "jpg", "jpeg", "webp"}),
        magic=(
            (b"\x89PNG\r\n\x1a\n", "image/png"),
            (b"\xff\xd8\xff", "image/jpeg"),
            (b"RIFF", "image/webp"),  # RIFF....WEBP — WEBP verified at offset 8
        ),
        access=Attachment.Access.PUBLIC,
    ),
}


def _sanitize_filename(name: str) -> str:
    keep = "".join(ch if ch.isalnum() or ch in {".", "-", "_"} else "_" for ch in name)
    name = keep.strip("._")[:200] or "file"
    return name


def _sniff(head: bytes, rule: PurposeRule) -> str:
    """Return the sniffed content type or raise — never trust the client header."""
    for signature, content_type in rule.magic:
        if head.startswith(signature):
            if content_type == "image/webp":
                if head[8:12] == b"WEBP":
                    return content_type
                continue
            return content_type
    raise DomainError(
        "File content does not match an allowed type.",
        code="file_type_rejected",
    )


@transaction.atomic
def store_upload(uploader, *, purpose: str, uploaded_file) -> tuple[Attachment, bool]:
    """Validate + persist one upload. Returns (attachment, created).

    Dedupe: same uploader re-uploading identical bytes reuses the row.
    """
    rule = PURPOSE_RULES.get(purpose)
    if rule is None:
        raise DomainError("Unsupported upload purpose.", code="purpose_not_allowed")
    if uploaded_file is None:
        raise DomainError("No file provided.", code="file_missing")

    name = _sanitize_filename(uploaded_file.name or "file")
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in rule.extensions:
        raise DomainError(
            f"Allowed file types for this purpose: {', '.join(sorted(rule.extensions))}.",
            code="file_type_rejected",
        )

    hasher = hashlib.sha256()
    chunks, size = [], 0
    for chunk in uploaded_file.chunks():
        size += len(chunk)
        if size > rule.max_bytes:
            raise DomainError(
                f"File exceeds the {rule.max_bytes // MB} MB limit for this purpose.",
                code="file_too_large",
            )
        hasher.update(chunk)
        chunks.append(chunk)
    if size == 0:
        raise DomainError("Empty files are not allowed.", code="file_empty")
    digest = hasher.hexdigest()
    content_type = _sniff(chunks[0][:16], rule)

    # Dedupe is scoped per purpose: identical bytes for a different purpose
    # (e.g. credential vs request_brief) must create their own access row.
    existing = Attachment.objects.filter(
        uploader=uploader, purpose=purpose, sha256=digest, size=size
    ).first()
    if existing:
        return existing, False

    attachment = Attachment(
        uploader=uploader,
        purpose=purpose,
        access=rule.access,
        original_name=name,
        content_type=content_type,
        size=size,
        sha256=digest,
    )
    uploaded_file.seek(0)
    attachment.file.save(f"{uuid_lib.uuid4()}.{ext}", File(uploaded_file), save=False)
    attachment.save()
    logger.info("attachment stored id=%s purpose=%s size=%s", attachment.id, purpose, size)
    return attachment, True


def grant_download(user, attachment: Attachment) -> bool:
    """THE file-access decision point (docs/architecture/backend.md).

    Public attachments (avatars) are readable by anyone; private attachments
    only by the uploader or authorized staff (reviewers/admins).
    """
    if attachment.access == Attachment.Access.PUBLIC:
        return True
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if user.pk == attachment.uploader_id or user.is_staff:
        return True
    # Request briefs: the selected (accepted) expert keeps participant access;
    # browsing experts see metadata only — no signed URLs (docs/workflows/files.md).
    if attachment.purpose == Attachment.Purpose.REQUEST_BRIEF:
        return attachment.service_requests.filter(
            offers__expert_id=user.pk, offers__status="accepted"
        ).exists()
    return False


def issue_download_token(attachment: Attachment) -> str:
    return signing.dumps({"aid": str(attachment.id)}, salt=DOWNLOAD_SALT)


def download_url(request, attachment: Attachment) -> str:
    """Local/dev streaming URL with a 5-minute signed token (R2 presigned URLs
    arrive with the storage adapter in Phase 10 — same caller contract)."""
    token = issue_download_token(attachment)
    path = f"/api/v1/files/{attachment.id}/download"
    return request.build_absolute_uri(f"{path}?token={token}")


def resolve_download_token(attachment_id: str, token: str | None) -> None:
    """Validate a signed download token or raise 403."""
    try:
        data = signing.loads(token or "", salt=DOWNLOAD_SALT, max_age=DOWNLOAD_TOKEN_TTL_SECONDS)
        if data.get("aid") != str(attachment_id):
            raise signing.BadSignature
    except signing.BadSignature:
        raise PermissionDeniedError("This download link is invalid or has expired.") from None
