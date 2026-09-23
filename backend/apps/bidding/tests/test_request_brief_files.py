"""request_brief purpose: access matrix + per-purpose dedupe (Phase 4)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.bidding import services as bidding
from apps.experts.tests.test_api import PASSWORD, make_expert
from apps.files.services import grant_download, store_upload
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("brief.pdf", b"%PDF-1.4\n" + b"y" * 64)


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="file-student@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


def _open_request_with_attachment(student):
    attachment, _ = store_upload(student, purpose="request_brief", uploaded_file=PDF)
    subject = ensure_term(kind="subject", name="FileSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "T",
            "description": "D" * 40,
            "subject": subject,
            "budget_max": 5000,
        },
        attachment_ids=[str(attachment.pk)],
    )
    return request_services.publish(student, req, attested=True), attachment


def test_brief_metadata_visible_but_content_participants_only(student, django_user_model):
    request, attachment = _open_request_with_attachment(student)
    selected = make_expert(django_user_model, "fsel@demo.local", "FSel")
    outsider = make_expert(django_user_model, "fout@demo.local", "FOut")

    assert grant_download(student, attachment)  # owner
    assert not grant_download(outsider, attachment)  # eligible browser: metadata only
    assert not grant_download(None, attachment)

    offer = bidding.submit(
        selected,
        request,
        payload={"amount": 6000, "currency": "USD", "timeline_text": "1w", "message": "m"},
    )
    assert not grant_download(selected, attachment)  # still just an offer

    bidding.accept(student, offer)
    assert grant_download(selected, attachment)  # selected expert = participant


def test_same_bytes_different_purpose_do_not_dedupe(student):
    a1, _ = store_upload(student, purpose="request_brief", uploaded_file=PDF)
    PDF3 = SimpleUploadedFile("again.pdf", b"%PDF-1.4\n" + b"y" * 64)
    a2, created2 = store_upload(student, purpose="request_brief", uploaded_file=PDF3)
    assert created2 is False  # same purpose + same bytes → dedupe
    assert a1.pk == a2.pk
    cred = SimpleUploadedFile("cert.pdf", b"%PDF-1.4\n" + b"y" * 64)
    a3, created3 = store_upload(student, purpose="credential", uploaded_file=cred)
    assert created3 is True  # different purpose → own access row (Phase 4 fix)
    assert a3.pk != a1.pk
