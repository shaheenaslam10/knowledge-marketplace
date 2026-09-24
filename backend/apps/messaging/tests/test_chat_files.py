"""Phase 8: chat-attachment access via the files sidecar traversal (BR-34)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.files import services as files
from apps.messaging import services as messaging
from apps.orders import services as order_services
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("chat-note.pdf", b"%PDF-1.4\n" + b"c" * 64)


def _pair_and_thread(django_user_model):
    student = django_user_model.objects.create_user(
        email="file-s@demo.local", password=PASSWORD, name="S"
    )
    student.mark_email_verified()
    expert = make_expert(django_user_model, "file-e@demo.local", "E")
    subject = ensure_term(kind="subject", name="ChatFiles")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Files thread",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    request_services.mark_matched(request)
    order = order_services.create_order_for_request(
        request,
        expert=expert,
        amount=6000,
        currency="USD",
        source=order_services.Order.Source.OPEN_BID,
    )
    order = order_services.mark_paid(order, actor=None, via="manual")
    thread = messaging.get_or_create_thread(context_type="order", context=order, actor=student)
    return student, expert, thread


class TestChatAttachmentAccess:
    def test_participant_downloads_chat_attachment(self, client, django_user_model):
        student, expert, thread = _pair_and_thread(django_user_model)
        attachment, _ = files.store_upload(expert, purpose="message", uploaded_file=PDF)
        messaging.send_message(thread, sender=expert, body="Notes attached.", attachment=attachment)

        api_login(client, student)
        response = client.get(f"/api/v1/files/{attachment.pk}/download-url")
        assert response.status_code == 200 and "url" in response.json()

    def test_stranger_cannot_download_chat_attachment(self, client, django_user_model):
        _student, expert, thread = _pair_and_thread(django_user_model)
        attachment, _ = files.store_upload(expert, purpose="message", uploaded_file=PDF)
        messaging.send_message(thread, sender=expert, body="Notes attached.", attachment=attachment)

        stranger = django_user_model.objects.create_user(
            email="file-x@demo.local", password=PASSWORD, name="X"
        )
        stranger.mark_email_verified()
        api_login(client, stranger)
        response = client.get(f"/api/v1/files/{attachment.pk}/download-url")
        assert response.status_code == 403

    def test_unattached_message_file_unreachable(self, django_user_model):
        student, expert, _thread = _pair_and_thread(django_user_model)
        attachment, _ = files.store_upload(expert, purpose="message", uploaded_file=PDF)
        # uploaded but never sent into a thread: even the other participant cannot fetch
        assert files.grant_download(student, attachment) is False
        assert files.grant_download(expert, attachment) is True  # uploader always can
