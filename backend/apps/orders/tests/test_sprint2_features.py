import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.experts.tests.test_api import make_expert
from apps.orders import services
from apps.orders.models import Order
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="sprint2-student@demo.local", password="long-pass-123", name="Student S2"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def expert(django_user_model):
    return make_expert(django_user_model, "sprint2-expert@demo.local", "Expert S2")


@pytest.fixture
def active_order(student, expert):
    subject = ensure_term(kind="subject", name="Sprint2Sub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Sprint 2 Test Order",
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


def test_deadline_proposal_and_acceptance(student, expert, active_order):
    client = APIClient()
    client.force_authenticate(user=expert)

    # 1. Expert proposes new deadline (+48h)
    new_due = timezone.now() + datetime.timedelta(days=4)
    resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deadline-proposal",
        {
            "proposed_due_at": new_due.isoformat(),
            "note": "Need 48h to finish complex dataset analysis",
        },
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert resp.data["status"] == "pending"
    assert resp.data["proposed_by_role"] == "expert"
    assert "Need 48h" in resp.data["note"]

    # 2. Student views order detail -> sees pending proposal
    client.force_authenticate(user=student)
    detail_resp = client.get(f"/api/v1/me/orders/{active_order.pk}")
    assert detail_resp.status_code == 200
    assert detail_resp.data["deadline_proposal"] is not None
    assert detail_resp.data["deadline_proposal"]["status"] == "pending"

    # 3. Student accepts proposal
    resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deadline-proposal/respond",
        {"action": "accept"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["status"] == "accepted"

    active_order.refresh_from_db()
    assert abs((active_order.delivery_due_at - new_due).total_seconds()) < 5

    # 4. Propose again and withdraw
    new_due_2 = timezone.now() + datetime.timedelta(days=6)
    resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deadline-proposal",
        {"proposed_due_at": new_due_2.isoformat(), "note": "Student proposes another date"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["status"] == "pending"

    resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deadline-proposal/respond",
        {"action": "withdraw"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["status"] == "withdrawn"


def test_delivery_multiversion_history(student, expert, active_order):
    client = APIClient()

    # 1. Expert submits v1
    client.force_authenticate(user=expert)
    deliv_resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deliveries",
        {"summary": "Initial completed draft including statistical methodology."},
        format="json",
    )
    assert deliv_resp.status_code == 200
    assert deliv_resp.data["version_label"] == "v1"

    # 2. Student requests revision
    client.force_authenticate(user=student)
    rev_resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/request-revision",
        {"note": "Please expand chapter 3 regarding empirical sampling bias."},
        format="json",
    )
    assert rev_resp.status_code == 200

    # 3. Expert submits v2
    client.force_authenticate(user=expert)
    deliv2_resp = client.post(
        f"/api/v1/me/orders/{active_order.pk}/deliveries",
        {"summary": "Updated final version addressing sampling bias review."},
        format="json",
    )
    assert deliv2_resp.status_code == 200
    assert deliv2_resp.data["version_label"] == "v2"

    # 4. Student inspects order detail: verifies 2 versions & feedback note
    client.force_authenticate(user=student)
    detail_resp = client.get(f"/api/v1/me/orders/{active_order.pk}")
    assert detail_resp.status_code == 200
    deliveries = detail_resp.data["deliveries"]
    assert len(deliveries) == 2
    assert deliveries[0]["version_label"] == "v1"
    assert (
        deliveries[0]["student_revision_note"]
        == "Please expand chapter 3 regarding empirical sampling bias."
    )
    assert deliveries[0]["is_latest"] is False
    assert deliveries[1]["version_label"] == "v2"
    assert deliveries[1]["is_latest"] is True
