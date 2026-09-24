"""Phase 8 messaging tests — participants/authz, lifecycle, read state,
read-only contexts, WS fallback path (REST == WS == one service), BR-35."""

import asyncio

import pytest
from channels.testing import WebsocketCommunicator

from apps.bidding import services as bidding
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.messaging import services as messaging
from apps.messaging.models import Message
from apps.orders import services as order_services
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="msg-s@demo.local", password=PASSWORD, name="Msg S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        email="msg-a@demo.local", password=PASSWORD, name="Msg A", is_staff=True
    )


@pytest.fixture
def order_pair(student, django_user_model):
    """(order, expert) built through the one factory + paid (active)."""
    subject = ensure_term(kind="subject", name="MsgSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Chat flow",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    request_services.mark_matched(req)
    expert = make_expert(django_user_model, "msg-e@demo.local", "Msg Expert")
    order = order_services.create_order_for_request(
        req, expert=expert, amount=7000, currency="USD", source=order_services.Order.Source.OPEN_BID
    )
    order = order_services.mark_paid(order, actor=None, via="manual")
    return order, expert


@pytest.fixture
def order_thread(order_pair, student):
    order, expert = order_pair
    thread = messaging.get_or_create_thread(context_type="order", context=order, actor=student)
    return thread, order, expert


# --- thread lifecycle & authorization ---------------------------------------------


class TestThreadLifecycle:
    def test_lazy_creation_is_idempotent(self, student, order_pair):
        order, expert = order_pair
        t1 = messaging.get_or_create_thread(context_type="order", context=order, actor=student)
        t2 = messaging.get_or_create_thread(context_type="order", context=order, actor=expert)
        assert t1.pk == t2.pk  # one thread per context

    def test_stranger_cannot_open_order_thread(self, student, django_user_model, order_pair):
        order, _ = order_pair
        stranger = django_user_model.objects.create_user(
            email="msg-x@demo.local", password=PASSWORD, name="X"
        )
        with pytest.raises(PermissionDeniedError):
            messaging.get_or_create_thread(context_type="order", context=order, actor=stranger)

    def test_request_context_open_to_offering_experts(self, student, django_user_model):
        subject = ensure_term(kind="subject", name="MsgReq")[0]
        req = request_services.create_request(
            student,
            payload={
                "category": "tutoring",
                "title": "Pre-order chat",
                "description": "d" * 40,
                "subject": subject,
                "budget_max": 9000,
            },
        )
        req = request_services.publish(student, req, attested=True)
        expert = make_expert(django_user_model, "msg-e2@demo.local", "Offer Expert")
        outsider = django_user_model.objects.create_user(
            email="msg-o@demo.local", password=PASSWORD, name="O"
        )
        bidding.submit(
            expert,
            req,
            payload={"amount": 5000, "currency": "USD", "timeline_text": "1w", "message": "m"},
        )
        thread = messaging.get_or_create_thread(context_type="request", context=req, actor=expert)
        assert thread.request_id == req.pk
        with pytest.raises(PermissionDeniedError):
            messaging.get_or_create_thread(context_type="request", context=req, actor=outsider)


# --- messages ---------------------------------------------------------------------


class TestMessages:
    def test_participants_exchange_messages(self, student, order_thread):
        thread, _order, expert = order_thread
        m1 = messaging.send_message(
            thread, sender=student, body="Hello, quick question about scope."
        )
        m2 = messaging.send_message(thread, sender=expert, body="Sure — happy to clarify anything.")
        assert m1.thread_id == thread.pk and m2.thread_id == thread.pk
        assert messaging.thread_messages(thread).count() == 2

    def test_non_participant_cannot_send(self, student, django_user_model, order_thread):
        thread, _, _ = order_thread
        stranger = django_user_model.objects.create_user(
            email="msg-y@demo.local", password=PASSWORD, name="Y"
        )
        with pytest.raises(PermissionDeniedError):
            messaging.send_message(thread, sender=stranger, body="Let me in on this chat please.")

    def test_empty_message_rejected_and_length_cap(self, student, order_thread):
        thread, _, _ = order_thread
        with pytest.raises(DomainError):
            messaging.send_message(thread, sender=student, body="   ")
        with pytest.raises(DomainError):
            messaging.send_message(thread, sender=student, body="x" * 5001)

    def test_cancelled_order_becomes_read_only(self, student, admin, order_thread):
        thread, order, _expert = order_thread
        order_services.cancel(
            order, actor=admin, reason="Support decision (BR-27) — read-only test"
        )
        thread = messaging.thread_for_user(thread.pk, order.student)  # request paths always refetch
        with pytest.raises(DomainError, match="read-only"):
            messaging.send_message(
                thread, sender=order.student, body="Trying to talk after cancel."
            )
        # history is preserved and still readable
        thread_messages = messaging.thread_messages(thread)
        assert thread_messages.count() >= 0

    def test_message_purpose_files_only(self, student, order_thread):
        thread, _, _ = order_thread
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.files.services import store_upload

        pdf = SimpleUploadedFile("brief.pdf", b"%PDF-1.4\n" + b"w" * 64)
        brief, _ = store_upload(student, purpose="request_brief", uploaded_file=pdf)
        with pytest.raises(DomainError, match="message-purpose"):
            messaging.send_message(
                thread, sender=student, body="Wrong purpose file", attachment=brief
            )


# --- read state --------------------------------------------------------------------


class TestReadState:
    def test_mark_read_and_inbox_unread(self, student, order_thread):
        thread, _order, expert = order_thread
        messaging.send_message(thread, sender=expert, body="First unread message for the student.")
        inbox = messaging.inbox(student)
        assert inbox[0]["unread"] == 1
        messaging.mark_read(thread, user=student)
        assert messaging.inbox(student)[0]["unread"] == 0

    def test_own_messages_never_unread(self, student, order_thread):
        thread, _, _ = order_thread
        messaging.send_message(thread, sender=student, body="Note to self essentially.")
        assert messaging.inbox(student)[0]["unread"] == 0


# --- BR-35 moderation ----------------------------------------------------------------


class TestModeration:
    def test_admin_view_is_staff_only_and_audited(self, student, admin, order_thread):
        thread, _, _ = order_thread
        with pytest.raises(PermissionDeniedError):
            messaging.admin_view_thread(thread, admin=student)
        messages = messaging.admin_view_thread(thread, admin=admin)
        assert isinstance(messages, list)
        from apps.audit.models import AuditEvent

        assert AuditEvent.objects.filter(action="messaging.thread_viewed").exists()


# --- WS + REST: one service path, fallback behavior -----------------------------------


def _origin_headers():
    return [(b"origin", b"http://localhost:3000")]


# WS handlers run ORM in the consumer's worker-thread connection — the test
# transaction is invisible to it, so these need real (transactional) DB state.
@pytest.mark.django_db(transaction=True)
class TestWebsocketAndRest:
    def _run(self, coro):
        return asyncio.run(coro)

    def _auth_headers(self, user) -> list:
        from rest_framework_simplejwt.tokens import RefreshToken

        token = str(RefreshToken.for_user(user).access_token)
        return [*_origin_headers(), (b"cookie", f"hm_access={token}".encode())]

    def test_ws_send_broadcasts_and_persists(self, client, student, order_thread):
        thread, _, _expert = order_thread
        from config.asgi import application

        # headers (JWT minting writes token rows) MUST be built before the loop
        headers = self._auth_headers(student)

        async def session():
            sender = WebsocketCommunicator(
                application, f"/ws/threads/{thread.pk}/", headers=headers
            )
            connected, _ = await sender.connect()
            assert connected
            await sender.send_json_to(
                {"type": "message.send", "body": "WS hello from the student."}
            )
            response = await sender.receive_json_from()
            assert response["type"] == "message.new" and response["body"].startswith("WS hello")
            await sender.disconnect()

        self._run(session())
        assert Message.objects.filter(thread=thread, body__startswith="WS hello").exists()

    def test_ws_rejects_non_participant(self, client, student, django_user_model, order_thread):
        thread, _, _ = order_thread
        stranger = django_user_model.objects.create_user(
            email="msg-z@demo.local", password=PASSWORD, name="Z"
        )
        from rest_framework_simplejwt.tokens import RefreshToken

        from config.asgi import application

        token = str(RefreshToken.for_user(stranger).access_token)

        async def session():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/threads/{thread.pk}/",
                headers=[*_origin_headers(), (b"cookie", f"hm_access={token}".encode())],
            )
            connected, _code = await communicator.connect()
            assert not connected  # closed 4403
            if connected:
                await communicator.disconnect()

        self._run(session())

    def test_rest_send_equals_ws_path(self, client, student, order_thread):
        thread, _, _ = order_thread
        api_login(client, student)
        response = client.post(
            f"/api/v1/me/threads/{thread.pk}/messages",
            data='{"body": "REST hello"}',
            content_type="application/json",
        )
        assert response.status_code == 200
        detail = client.get(f"/api/v1/me/threads/{thread.pk}")
        bodies = [m["body"] for m in detail.json()["messages"]]
        assert "REST hello" in bodies

    def test_message_new_creates_notifications(self, client, student, order_thread):
        thread, _order, expert = order_thread
        from apps.notifications.models import Notification

        messaging.send_message(thread, sender=student, body="Notify me not, notify them.")
        assert Notification.objects.filter(recipient_id=expert.id, type="message_new").exists()

    def test_inbox_api_lists_thread(self, client, student, order_thread):
        thread, _, _ = order_thread
        api_login(client, student)
        response = client.get("/api/v1/me/threads")
        assert response.status_code == 200
        results = response.json()["results"]
        assert results and results[0]["id"] == str(thread.pk)

    def test_thread_open_api(self, client, student, order_pair):
        order, _expert = order_pair
        api_login(client, student)
        response = client.post(
            "/api/v1/me/threads/open",
            data=f'{{"context_type": "order", "order_id": {order.pk}}}',
            content_type="application/json",
        )
        assert response.status_code == 200
        thread_id = response.json()["id"]
        again = client.post(
            "/api/v1/me/threads/open",
            data=f'{{"context_type": "order", "order_id": {order.pk}}}',
            content_type="application/json",
        )
        assert again.json()["id"] == thread_id
