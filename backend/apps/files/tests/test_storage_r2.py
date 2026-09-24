"""Phase 9 files tests — R2 storage selection, presigned downloads,
dispute_evidence authorization, retention cleanup."""

import pytest
from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.audit.models import AuditEvent
from apps.files import services as files
from apps.files.models import Attachment

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("f.pdf", b"%PDF-1.4\n" + b"f" * 64)


class TestR2Configuration:
    def test_default_is_local(self, settings):
        assert settings.FILE_STORAGE == "local"
        assert (
            settings.STORAGES["default"]["BACKEND"] == "django.core.files.storage.FileSystemStorage"
        )

    def test_r2_env_selects_s3_backend(self, settings):
        settings.FILE_STORAGE = "r2"
        settings.R2_BUCKET = "hem-test-files"
        settings.R2_ACCOUNT_ID = "testaccount"
        settings.R2_ACCESS_KEY = "key"
        settings.R2_SECRET_KEY = "secret"
        from config.settings.base import build_storages

        storages = build_storages(settings)
        assert storages["default"]["BACKEND"] == "storages.backends.s3.S3Storage"
        options = storages["default"]["OPTIONS"]
        assert options["bucket_name"] == "hem-test-files"
        assert options["endpoint_url"] == "https://testaccount.r2.cloudflarestorage.com"
        assert options["default_acl"] == "private"

    def test_presigned_download_url(self, settings, django_user_model):
        settings.FILE_STORAGE = "r2"
        settings.R2_BUCKET = "hem-test-files"
        settings.R2_ACCOUNT_ID = "testaccount"
        settings.R2_ACCESS_KEY = "key"
        settings.R2_SECRET_KEY = "secret"

        uploader = django_user_model.objects.create_user(
            email="r2-u@demo.local", password=PASSWORD, name="U"
        )
        attachment, _ = files.store_upload(uploader, purpose="credential", uploaded_file=PDF)

        captured = {}

        class FakeClient:
            def generate_presigned_url(self, method, Params, ExpiresIn):
                captured.update({"method": method, "Params": Params, "ExpiresIn": ExpiresIn})
                return "https://testaccount.r2.cloudflarestorage.com/hem-test-files/presigned"

        import unittest.mock as mock

        with mock.patch("boto3.client", return_value=FakeClient()):
            url = files.download_url(None, attachment)
        assert url.endswith("/presigned")
        assert captured["method"] == "get_object"
        assert captured["Params"]["Bucket"] == "hem-test-files"
        assert captured["Params"]["Key"] == attachment.file.name
        assert captured["ExpiresIn"] == settings.R2_PRESIGN_TTL_SECONDS == 300

    def test_local_download_url_uses_signed_token(self, django_user_model):
        from django.test import RequestFactory

        uploader = django_user_model.objects.create_user(
            email="loc-u@demo.local", password=PASSWORD, name="U"
        )
        attachment, _ = files.store_upload(uploader, purpose="credential", uploaded_file=PDF)
        request = RequestFactory().get("/api/v1/files/x/download-url")
        url = files.download_url(request, attachment)
        assert "token=" in url and "/download" in url


PASSWORD = "long-pass-123"


def _make_expert(django_user_model, email):
    """Expert user + profile without importing the higher-layer experts app."""
    user = django_user_model.objects.create_user(email=email, password=PASSWORD, name="E")
    apps.get_model("experts", "ExpertProfile").objects.create(user=user, display_name="E")
    return user


def _student_with_expert_order(django_user_model):
    """Rows only — retention tests need timestamps, not the state machine."""
    n = django_user_model.objects.count()
    student = django_user_model.objects.create_user(
        email=f"ret-{n}@demo.local", password=PASSWORD, name="S"
    )
    expert = _make_expert(django_user_model, f"ret-e{n}@demo.local")
    request = apps.get_model("service_requests", "ServiceRequest").objects.create(
        student=student,
        category="tutoring",
        title="T",
        description="d" * 40,
        subject=apps.get_model("taxonomy", "TaxonomyTerm").objects.create(
            kind="subject", name=f"RetSub{n}"
        ),
        budget_max=9000,
        status="open",
    )
    return student, expert, request


class TestRetention:
    def test_purges_old_briefs_of_dead_requests(self, django_user_model):
        from datetime import timedelta

        from django.utils import timezone

        student, _expert, request = _student_with_expert_order(django_user_model)
        brief, _ = files.store_upload(student, purpose="request_brief", uploaded_file=PDF)
        request.attachments.add(brief)
        request.status = "cancelled"
        request.closed_at = timezone.now()
        request.save(update_fields=["status", "closed_at"])

        # young — must NOT purge
        assert files.retention_cleanup() == {"briefs": 0, "order_files": 0}
        assert Attachment.objects.get(pk=brief.pk).file.name != ""

        # aged past 30 days — purged (storage + soft delete + audit)
        request.closed_at = timezone.now() - timedelta(days=31)
        request.save(update_fields=["closed_at"])
        purged = files.retention_cleanup()
        assert purged["briefs"] == 1
        brief.refresh_from_db()
        assert brief.file.name == ""
        assert AuditEvent.objects.filter(action="files.retention_purged").exists()

    def test_order_files_purge_after_12_months_with_legal_hold(self, django_user_model):
        from datetime import timedelta

        from django.utils import timezone

        student, expert, request = _student_with_expert_order(django_user_model)
        order = apps.get_model("orders", "Order").objects.create(
            request=request,
            student=student,
            expert_id=expert.pk,
            expert_name="E",
            status="completed",
            amount=7000,
            currency="USD",
            completed_at=timezone.now() - timedelta(days=400),
        )
        delivery_file, _ = files.store_upload(expert, purpose="delivery", uploaded_file=PDF)
        delivery = apps.get_model("orders", "Delivery").objects.create(
            order=order, summary="Delivered for retention test.", status="approved"
        )
        delivery.attachments.add(delivery_file)

        # legal hold protects the file
        delivery_file.legal_hold = True
        delivery_file.save(update_fields=["legal_hold"])
        assert files.retention_cleanup()["order_files"] == 0
        delivery_file.legal_hold = False
        delivery_file.save(update_fields=["legal_hold"])
        assert files.retention_cleanup()["order_files"] == 1
        delivery_file.refresh_from_db()
        assert delivery_file.file.name == ""

    def test_dispute_evidence_grant_traversal(self, django_user_model):
        student = django_user_model.objects.create_user(
            email="ev-u@demo.local", password=PASSWORD, name="S"
        )
        expert = _make_expert(django_user_model, "ev-e@demo.local")
        attachment, _ = files.store_upload(student, purpose="dispute_evidence", uploaded_file=PDF)
        stranger = django_user_model.objects.create_user(
            email="ev-x@demo.local", password=PASSWORD, name="X"
        )
        # no dispute references it yet → only the uploader
        assert files.grant_download(student, attachment) is True
        assert files.grant_download(expert, attachment) is False
        assert files.grant_download(stranger, attachment) is False
