"""Managed sources converge into working orders (Phase 6, from the assignments layer)."""

import pytest

from apps.assignments import services as assignment_services
from apps.experts.tests.test_api import make_expert
from apps.orders import services
from apps.orders.models import Order
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="conv-student@demo.local", password="long-pass-123", name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        email="conv-admin@demo.local", password="long-pass-123", name="A", is_staff=True
    )


def test_managed_sources_create_working_orders(student, admin, django_user_model):
    """open_bid covered above; here managed_pool + managed_direct reach active."""

    subject = ensure_term(kind="subject", name="SrcSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Managed src",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req.mode = "managed"
    req.save(update_fields=["mode"])
    req = request_services.publish(student, req, attested=True)
    expert = make_expert(django_user_model, "src-expert@demo.local", "Src Expert")

    (invitation,) = assignment_services.approve_pool(
        admin, req, expert_ids=[expert.pk], quote_amount=8000
    )
    _inv, pool_order = assignment_services.accept_invitation(expert, invitation)
    services.mark_paid(pool_order, actor=admin)
    pool_order.refresh_from_db()
    assert pool_order.status == Order.Status.ACTIVE and pool_order.source == "managed_pool"

    req2 = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Direct src",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req2.mode = "managed"
    req2.save(update_fields=["mode"])
    req2 = request_services.publish(student, req2, attested=True)
    assignment = assignment_services.assign_direct(admin, req2, expert=expert, amount=6500)
    _a, direct_order = assignment_services.accept_direct(expert, assignment)
    services.mark_paid(direct_order, actor=admin)
    direct_order.refresh_from_db()
    assert direct_order.source == "managed_direct"
    assert services.submit_delivery(
        direct_order, expert=expert, summary="Direct-order delivery works identically."
    )
