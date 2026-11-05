import asyncio
import datetime

import pytest
from channels.testing import WebsocketCommunicator
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.experts.tests.test_api import make_expert
from apps.orders import services
from apps.orders.delivery import OrderEvent
from apps.orders.models import Order
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term
from config.asgi import application

pytestmark = pytest.mark.django_db


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="sprint3-student@demo.local", password="long-pass-123", name="Student S3"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def expert(django_user_model):
    return make_expert(django_user_model, "sprint3-expert@demo.local", "Expert S3")


@pytest.fixture
def outsider(django_user_model):
    user = django_user_model.objects.create_user(
        email="sprint3-outsider@demo.local", password="long-pass-123", name="Outsider S3"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def active_order(student, expert):
    subject = ensure_term(kind="subject", name="Sprint3Sub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Sprint 3 Test Live Order",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    order = services.create_order_for_request(
        req, expert=expert, amount=5000, currency="USD", source=Order.Source.OPEN_BID
    )
    order.status = Order.Status.ACTIVE
    order.delivery_due_at = timezone.now() + datetime.timedelta(days=2)
    order.save(update_fields=["status", "delivery_due_at"])
    return order


def test_schedule_live_session_and_ics_download(student, expert, active_order):
    client = APIClient()
    client.force_authenticate(user=expert)

    # 1. Schedule a session
    sched_time = (timezone.now() + timezone.timedelta(days=2)).isoformat()
    resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/live-session",
        {"action": "schedule", "scheduled_at": sched_time},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    active_sess = resp.data.get("active_session")
    assert active_sess is not None
    assert active_sess["status"] == "scheduled"

    # Verify OrderEvent logged
    assert OrderEvent.objects.filter(
        order=active_order, event_type=OrderEvent.EventType.LIVE_SESSION_SCHEDULED
    ).exists()

    # 2. Download RFC 5545 .ics invite
    client.force_authenticate(user=student)
    ics_resp = client.get(f"/api/v1/me/orders/{active_order.pk}/live-session/ics")
    assert ics_resp.status_code == 200
    assert "text/calendar" in ics_resp["Content-Type"]
    body = ics_resp.content.decode("utf-8")
    assert "BEGIN:VCALENDAR" in body
    assert "BEGIN:VEVENT" in body
    assert f"Order #{active_order.number}" in body
    assert "END:VCALENDAR" in body


def test_instant_start_and_end_session_audit(student, expert, active_order):
    client = APIClient()
    client.force_authenticate(user=expert)

    # 1. Start instant session
    start_resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/live-session",
        {"action": "start"},
        format="json",
    )
    assert start_resp.status_code == 200
    assert start_resp.data["active_session"]["status"] == "live"

    # 2. End session with scratchpad notes
    sample_code = "def estimate_ols(X, y):\n    return np.linalg.inv(X.T @ X) @ X.T @ y"
    end_resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/live-session/end",
        {"duration_seconds": 240, "scratchpad_content": sample_code},
        format="json",
    )
    assert end_resp.status_code == 200
    assert end_resp.data["active_session"] is None
    recent = end_resp.data.get("recent_sessions", [])
    assert len(recent) >= 1
    assert recent[0]["duration_seconds"] == 240
    assert recent[0]["scratchpad_content"] == sample_code

    # 3. Verify OrderEvent timeline row
    event = OrderEvent.objects.filter(
        order=active_order, event_type=OrderEvent.EventType.LIVE_SESSION_COMPLETED
    ).first()
    assert event is not None
    assert event.data.get("duration_seconds") == 240
    assert event.data.get("scratchpad_content") == sample_code


def test_permission_guard(outsider, active_order):
    client = APIClient()
    client.force_authenticate(user=outsider)

    resp = client.get(f"/api/v1/me/orders/{active_order.pk}/live-session")
    assert resp.status_code in (403, 404)


@pytest.mark.django_db(transaction=True)
def test_live_coaching_websocket_consumer(student, expert, active_order):
    student_token = str(RefreshToken.for_user(student).access_token)
    expert_token = str(RefreshToken.for_user(expert).access_token)

    origin_header = (b"origin", b"http://localhost:3000")
    student_cookie = (b"cookie", f"hm_access={student_token}".encode())
    expert_cookie = (b"cookie", f"hm_access={expert_token}".encode())

    async def session():
        comm_student = WebsocketCommunicator(
            application,
            f"/ws/orders/{active_order.pk}/live/",
            headers=[origin_header, student_cookie],
        )
        connected, _ = await comm_student.connect()
        assert connected

        comm_expert = WebsocketCommunicator(
            application,
            f"/ws/orders/{active_order.pk}/live/",
            headers=[origin_header, expert_cookie],
        )
        connected2, _ = await comm_expert.connect()
        assert connected2

        # Student receives peer_join from Expert
        join_event = await comm_student.receive_json_from()
        assert join_event["type"] == "peer_join"
        assert join_event["user_id"] == expert.id

        # Expert broadcasts scratchpad update
        await comm_expert.send_json_to(
            {"type": "scratchpad_update", "content": "import pandas as pd"}
        )

        # Student receives scratchpad update
        msg = await comm_student.receive_json_from()
        assert msg["type"] == "scratchpad_update"
        assert msg["content"] == "import pandas as pd"

        await comm_student.disconnect()
        await comm_expert.disconnect()

    run(session())
