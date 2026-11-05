import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.exceptions import DomainError
from apps.disputes import services as dispute_services
from apps.disputes.models import Dispute
from apps.experts.catalog_services import purchase_knowledge_product
from apps.experts.models import ExpertProfile, KnowledgeProduct
from apps.experts.tests.test_api import make_expert
from apps.orders import services
from apps.orders.models import Order
from apps.payments.models import LedgerEntry, Payout
from apps.payments.services import confirm_order_payment, start_payment
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="sprint6-student@demo.local", password="long-pass-123", name="Student S6"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def expert(django_user_model):
    exp = make_expert(django_user_model, "sprint6-expert@demo.local", "Expert S6")
    ExpertProfile.objects.filter(pk=exp.pk).update(
        session_30m_price=4500,
        session_60m_price=8000,
    )
    return exp


@pytest.fixture
def admin_user(django_user_model):
    user = django_user_model.objects.create_superuser(
        email="admin-s6@demo.local", password="admin-pass-123", name="Admin S6"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def active_order(student, expert):
    subject = ensure_term(kind="subject", name="Sprint6Subject")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Sprint 6 Test Order",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    order = services.create_order_for_request(
        req, expert=expert, amount=6000, currency="USD", source=Order.Source.OPEN_BID
    )
    start_payment(order, actor=student)
    confirm_order_payment(order, actor=student)
    order.refresh_from_db()
    return order


def test_speed_booking_direct_session(student, expert):
    """Student books direct consultation session from specialist profile."""
    client = APIClient()
    client.force_authenticate(user=student)

    # 1. Book 30-minute session
    profile = ExpertProfile.objects.get(pk=expert.pk)
    resp = client.post(
        f"/api/v1/experts/{profile.slug}/book-session",
        {
            "duration_minutes": 30,
            "topic": "Python Async Architecture Review",
            "notes": "Review ASGI setup and websocket scaling bottlenecks.",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert resp.data["amount"] == 4500
    assert resp.data["currency"] == "USD"
    assert resp.data["order_number"].startswith("ORD-")

    # 2. Book 60-minute session
    resp60 = client.post(
        f"/api/v1/experts/{profile.slug}/book-session",
        {
            "duration_minutes": 60,
            "topic": "Deep Dive Systems Architecture",
        },
        format="json",
    )
    assert resp60.status_code == 201
    assert resp60.data["amount"] == 8000


def test_student_vault_and_orders(student, expert, active_order):
    """Student vault lists active orders, deliverables, and unlocked resources."""
    client = APIClient()
    client.force_authenticate(user=student)

    resp = client.get("/api/v1/me/vault")
    assert resp.status_code == 200, resp.data
    assert "invoices" in resp.data
    assert len(resp.data["invoices"]) >= 1
    found_invoice = next((inv for inv in resp.data["invoices"] if active_order.number in inv["invoice_number"]), None)
    assert found_invoice is not None


def test_expert_earnings_analytics_and_payouts(expert, active_order):
    """Specialist financial dashboard returns balance telemetry and accepts payout requests."""
    client = APIClient()
    client.force_authenticate(user=expert)

    # 1. Check earnings analytics
    resp = client.get("/api/v1/me/expert/earnings")
    assert resp.status_code == 200, resp.data
    assert "total_gmv_minor" in resp.data
    assert "payout_history" in resp.data or "payouts" in resp.data

    # 2. Request payout
    payout_resp = client.post(
        "/api/v1/me/expert/payouts/request",
        {"amount_minor": 2500, "note": "Monthly withdrawal to verified account"},
        format="json",
    )
    assert payout_resp.status_code == 201
    assert payout_resp.data["amount_minor"] == 2500
    assert payout_resp.data["status"] == Payout.Status.SCHEDULED


def test_live_cohort_seat_capacity_enforcement(student, expert):
    """Live micro-cohort workshops strictly enforce max_seats cap atomically."""
    profile = ExpertProfile.objects.get(pk=expert.pk)
    cohort = KnowledgeProduct.objects.create(
        expert=profile,
        title="Test Micro-Cohort Max Seats",
        summary="Capped workshop testing seat saturation.",
        product_type=KnowledgeProduct.ProductType.LIVE_COHORT,
        price_minor=5000,
        currency="USD",
        max_seats=2,
        enrolled_count=1,
        cohort_scheduled_at=timezone.now() + datetime.timedelta(days=2),
        live_room_code="TEST-ROOM-123",
        status=KnowledgeProduct.Status.PUBLISHED,
        published_at=timezone.now(),
    )

    # 1. Seat 2 of 2: purchase succeeds
    purchase = purchase_knowledge_product(cohort, buyer=student)
    assert purchase is not None
    cohort.refresh_from_db()
    assert cohort.enrolled_count == 2

    # 2. Seat 3 of 2: cohort is now full -> raises DomainError
    another_student = type(student).objects.create_user(
        email="another-student@demo.local", password="pass-1234-another"
    )
    another_student.mark_email_verified()

    with pytest.raises(DomainError) as exc_info:
        purchase_knowledge_product(cohort, buyer=another_student)
    assert exc_info.value.code == "cohort_full"


def test_ops_dispute_split_resolution_flow(student, expert, admin_user, active_order):
    """Operator executes interactive split resolution on disputed order via ops portal."""
    # 1. Student opens a dispute
    dispute = dispute_services.open_dispute(
        order=active_order,
        actor=student,
        reason=Dispute.Reason.SCOPE_DISAGREEMENT,
        description="Deliverable missing 2 sections from original agreement.",
    )
    assert dispute.status == Dispute.Status.OPEN

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # 2. Check dispute queue contains enriched details
    queue_resp = client.get("/api/v1/ops/disputes")
    assert queue_resp.status_code == 200, queue_resp.data
    found = next((d for d in queue_resp.data["results"] if d["id"] == str(dispute.pk)), None)
    assert found is not None
    assert "deliveries" in found
    assert found["description"] == dispute.description

    # 3. Support executes Split Ruling (60% student refund, 40% specialist payout)
    resolve_resp = client.post(
        f"/api/v1/ops/disputes/{dispute.pk}/resolve",
        {
            "outcome": "split",
            "split_percent": 60,
            "resolution_notes": "Both parties agreed to 60/40 settlement following tribunal review.",
        },
        format="json",
    )
    assert resolve_resp.status_code == 200, resolve_resp.data
    assert resolve_resp.data["status"] == "resolved"
    assert resolve_resp.data["outcome"] == "split"

    dispute.refresh_from_db()
    assert dispute.status == Dispute.Status.RESOLVED
    active_order.refresh_from_db()
    assert active_order.status == Order.Status.COMPLETED

    # 4. Verify refund ledger entry created for student (-3600 minor units = 60% of 6000)
    refund_entry = LedgerEntry.objects.filter(
        user=student, entry_type=LedgerEntry.EntryType.REFUND
    ).first()
    assert refund_entry is not None
    assert abs(refund_entry.amount_minor) == 3600
