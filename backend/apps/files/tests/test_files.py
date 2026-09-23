"""Files sidecar: upload validation, sniffing, dedupe, and the access gate."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.audit.models import AuditEvent
from apps.core.exceptions import DomainError
from apps.files.models import Attachment
from apps.files.services import (
    PURPOSE_RULES,
    download_url,
    grant_download,
    resolve_download_token,
    store_upload,
)

pytestmark = pytest.mark.django_db

PASSWORD = "long-pass-123"


def api_login(client, user):
    """DRF here authenticates via JWT cookies (SessionAuthentication is off),
    so tests log in through the API like real browsers."""

    response = client.post(
        "/api/v1/auth/token",
        {"email": user.email, "password": PASSWORD},
        content_type="application/json",
    )
    assert response.status_code == 200
    return client


PNG = SimpleUploadedFile("cert.png", b"\x89PNG\r\n\x1a\n" + b"x" * 32, content_type="image/png")
FAKE_PNG = SimpleUploadedFile(
    "evil.png", b"<script>alert(1)</script>", content_type="image/png"
)  # HTML in disguise


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        email="uploader@demo.local", password=PASSWORD, name="U"
    )


def test_store_upload_sniffs_content_not_header(user):
    attachment, created = store_upload(user, purpose="credential", uploaded_file=PNG)
    assert created and attachment.access == Attachment.Access.PRIVATE
    assert attachment.content_type == "image/png"
    with pytest.raises(DomainError) as err:
        store_upload(user, purpose="credential", uploaded_file=FAKE_PNG)
    assert err.value.code == "file_type_rejected"


def test_store_upload_rejects_bad_extension_size_and_purpose(user):
    with pytest.raises(DomainError):
        store_upload(
            user,
            purpose="credential",
            uploaded_file=SimpleUploadedFile("a.gif", b"\x89PNG\r\n\x1a\nxx"),
        )
    big = SimpleUploadedFile("big.png", b"\x89PNG\r\n\x1a\n" + b"x" * (11 * 1024 * 1024))
    with pytest.raises(DomainError) as err:
        store_upload(user, purpose="credential", uploaded_file=big)
    assert err.value.code == "file_too_large"
    with pytest.raises(DomainError):
        store_upload(user, purpose="request_brief", uploaded_file=PNG)  # purpose arrives in Phase 4


def test_dedupe_same_bytes_same_uploader(user):
    first, created_1 = store_upload(user, purpose="credential", uploaded_file=PNG)
    again, created_2 = store_upload(user, purpose="credential", uploaded_file=PNG)
    assert created_1 and not created_2 and first.id == again.id


def test_avatar_is_public_credential_is_private(user):
    avatar, _ = store_upload(
        user, purpose="avatar", uploaded_file=SimpleUploadedFile("me.png", b"\x89PNG\r\n\x1a\nzz")
    )
    credential, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    assert avatar.access == Attachment.Access.PUBLIC
    assert credential.access == Attachment.Access.PRIVATE


def test_grant_download_matrix(user, django_user_model):
    credential, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    stranger = django_user_model.objects.create_user(
        email="s@demo.local", password="long-pass-123", name="S"
    )
    staff = django_user_model.objects.create_user(
        email="staff@demo.local", password="long-pass-123", name="T", is_staff=True
    )
    assert grant_download(None, credential) is False
    assert grant_download(stranger, credential) is False
    assert grant_download(user, credential) is True  # uploader
    assert grant_download(staff, credential) is True  # reviewer


def test_signed_download_token_roundtrip_and_tamper(user, rf):
    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    url = download_url(rf.get("/api/v1/files"), attachment)
    token = url.split("token=")[1]
    resolve_download_token(str(attachment.id), token)  # valid
    from apps.core.exceptions import PermissionDeniedError

    with pytest.raises(PermissionDeniedError):
        resolve_download_token(str(attachment.id), token + "x")  # tampered
    with pytest.raises(PermissionDeniedError):
        resolve_download_token(str(attachment.id), None)


def test_staff_credential_view_is_audited(client, user, django_user_model):
    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    staff = django_user_model.objects.create_user(
        email="reviewer@demo.local", password=PASSWORD, name="R", is_staff=True
    )
    api_login(client, staff)
    response = client.get(f"/api/v1/files/{attachment.id}/download-url")
    assert response.status_code == 200
    assert AuditEvent.objects.filter(action="files.credential_viewed").exists()

    # uploader's own grant: no audit row
    AuditEvent.objects.all().delete()
    api_login(client, user)
    client.get(f"/api/v1/files/{attachment.id}/download-url")
    assert not AuditEvent.objects.exists()


def test_public_avatar_needs_no_token(client, user):
    avatar, _ = store_upload(
        user, purpose="avatar", uploaded_file=SimpleUploadedFile("a.png", b"\x89PNG\r\n\x1a\nz")
    )
    response = client.get(f"/api/v1/files/{avatar.id}/download")
    assert response.status_code == 200
    assert response["X-Content-Type-Options"] == "nosniff"
    assert "inline" in response["Content-Disposition"]


def test_metadata_and_download_404_for_unknown(client, user):
    import uuid

    api_login(client, user)
    assert client.get(f"/api/v1/files/{uuid.uuid4()}").status_code == 404


def test_purpose_rules_match_documented_allowlists():
    credential = PURPOSE_RULES["credential"]
    assert credential.extensions == frozenset({"pdf", "png", "jpg", "jpeg"})
    assert credential.max_bytes == 10 * 1024 * 1024
    avatar = PURPOSE_RULES["avatar"]
    assert avatar.extensions == frozenset({"png", "jpg", "jpeg", "webp"})
    assert avatar.max_bytes == 2 * 1024 * 1024
