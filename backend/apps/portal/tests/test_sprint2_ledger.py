import pytest
from rest_framework.test import APIClient

from apps.experts.tests.test_api import make_expert
from apps.orders import services
from apps.orders.models import Order
from apps.payments.models import LedgerEntry
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin(django_user_model):
    user = django_user_model.objects.create_user(
        email="ledger-admin@demo.local",
        password="long-pass-123",
        name="Staff Admin",
        is_staff=True,
        is_superuser=True,
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="ledger-student@demo.local", password="long-pass-123", name="Student"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def expert(django_user_model):
    return make_expert(django_user_model, "ledger-expert@demo.local", "Specialist")


@pytest.fixture
def balanced_order_and_entries(student, expert):
    subject = ensure_term(kind="subject", name="LedgerSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Ledger Audit Order",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    order = services.create_order_for_request(
        req, expert=expert, amount=10000, currency="USD", source=Order.Source.OPEN_BID
    )

    # Invariant: charge (10000) = commission (1500) + expert_credit (8500)
    e1 = LedgerEntry.objects.create(
        order=order,
        user=student,
        entry_type=LedgerEntry.EntryType.CHARGE,
        amount_minor=10000,
        currency="USD",
        description="Student charge",
    )
    e2 = LedgerEntry.objects.create(
        order=order,
        user=None,
        entry_type=LedgerEntry.EntryType.COMMISSION,
        amount_minor=1500,
        currency="USD",
        description="Platform take rate",
    )
    e3 = LedgerEntry.objects.create(
        order=order,
        user=expert,
        entry_type=LedgerEntry.EntryType.EXPERT_CREDIT,
        amount_minor=8500,
        currency="USD",
        description="Expert credit payable",
    )
    return order, [e1, e2, e3]


def test_ledger_explorer_view(admin, balanced_order_and_entries):
    order, _entries = balanced_order_and_entries
    client = APIClient()
    client.force_authenticate(user=admin)

    resp = client.get("/api/v1/ops/finance/ledger")
    assert resp.status_code == 200, resp.data
    assert resp.data["count"] >= 3
    assert resp.data["summary"]["system_balanced"] is True

    # Check that each entry has is_balanced True
    order_entries = [r for r in resp.data["results"] if r["order_id"] == str(order.id)]
    assert len(order_entries) == 3
    for entry in order_entries:
        assert entry["is_balanced"] is True
        assert entry["t_account"]["charge_plus_refund"] == 10000
        assert entry["t_account"]["allocations"] == 10000

    # Filter by entry_type
    charge_resp = client.get("/api/v1/ops/finance/ledger?entry_type=charge")
    assert charge_resp.status_code == 200
    for r in charge_resp.data["results"]:
        assert r["entry_type"] == "charge"

    # Search by order number
    search_resp = client.get(f"/api/v1/ops/finance/ledger?q={order.number}")
    assert search_resp.status_code == 200
    assert len(search_resp.data["results"]) == 3


def test_ledger_export_csv(admin, balanced_order_and_entries):
    order, _entries = balanced_order_and_entries
    client = APIClient()
    client.force_authenticate(user=admin)

    resp = client.get("/api/v1/ops/finance/ledger/export-csv")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/csv"
    assert 'attachment; filename="ledger_export_' in resp["Content-Disposition"]
    csv_text = resp.content.decode("utf-8")
    assert "Entry ID,Created At (UTC),Order Number" in csv_text
    assert order.number in csv_text
