"""Every notification type the catalog declares must actually be emitted.

An audit of the codebase found four types that were declared in
`CATEGORY_FOR_TYPE`, exposed in the user's per-category preference UI, and
documented in the notification catalog -- but never emitted by any code path.
The user-visible consequence was silence at exactly the moments that matter:

* `request_new_offer`          a student was never told a bid arrived
* `payout_scheduled`           an expert was never told money was scheduled
* `payout_failed`              an expert was never told a payout failed
* `order_auto_approve_warning` a student was never warned before auto-approval
                               released their money at 72h

These tests pin the wiring so the catalog cannot drift back into fiction.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.notifications.models import CATEGORY_FOR_TYPE, Notification
from apps.orders import services as order_services
from apps.orders.delivery import OrderEvent
from apps.orders.models import Order
from apps.payments import services as payment_services
from apps.payments.models import Payout
from apps.portal.tests.test_portal import _paid_completed_order, _staff
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PASSWORD = "long-pass-123"


def _types_for(user) -> set[str]:
    """`orders.Order.expert_id` is a plain BigIntegerField (apps.orders does not
    depend on apps.accounts), so tests key on ids rather than user objects."""
    user_id = getattr(user, "pk", user)
    return set(Notification.objects.filter(recipient_id=user_id).values_list("type", flat=True))


@pytest.fixture
def staff(django_user_model):
    return _staff(django_user_model)


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="nt-student@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def expert(django_user_model):
    from apps.experts.tests.test_api import make_expert

    return make_expert(django_user_model, "nt-expert@demo.local", "E")


@pytest.fixture
def open_request(student):
    subject = ensure_term(kind="subject", name="NotifySubject")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Need help",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 30_000,
        },
    )
    return request_services.publish(student, request, attested=True)


@pytest.fixture
def paid_completed_order(django_user_model):
    """Completing an order already schedules the payout (BR-30), so these
    notifications are NOT wiped -- the scheduling path is what we assert on."""
    _student, _expert, order = _paid_completed_order(django_user_model)
    return order


@pytest.fixture
def delivered_order(django_user_model):
    """An order sitting in DELIVERED, i.e. the auto-approval clock is running."""
    _student, expert_user, order = _paid_completed_order(django_user_model, complete=False)
    order_services.submit_delivery(
        order, expert=expert_user, summary="Delivered in full, on time, as agreed."
    )
    order = Order.objects.get(pk=order.pk)
    Notification.objects.all().delete()
    return order


# --------------------------------------------------------------------------
# 1. request_new_offer -- the student must learn a bid arrived
# --------------------------------------------------------------------------


def test_new_offer_notifies_the_student(student, expert, open_request):
    from apps.bidding import services as bidding

    assert _types_for(student) == set()

    bidding.submit(expert, open_request, payload={"amount": 20_000, "message": "I can help"})

    assert "request_new_offer" in _types_for(student)
    note = Notification.objects.get(recipient=student, type="request_new_offer")
    assert note.url == f"/requests/{open_request.pk}"
    # Blind bidding (BR-15): the amount must not leak before the student opens it.
    assert "200" not in note.body and "20000" not in note.body


def test_new_offer_does_not_notify_the_bidding_expert(student, expert, open_request):
    from apps.bidding import services as bidding

    bidding.submit(expert, open_request, payload={"amount": 20_000, "message": "I can help"})

    assert "request_new_offer" not in _types_for(expert)


# --------------------------------------------------------------------------
# 2 + 3. payout_scheduled / payout_failed -- the expert must learn about money
# --------------------------------------------------------------------------


def test_scheduled_payout_notifies_the_expert(paid_completed_order):
    order = paid_completed_order
    # Approving the delivery completes the order, which schedules the payout.
    payout = Payout.objects.get(order=order)

    assert "payout_scheduled" in _types_for(order.expert_id)
    note = Notification.objects.get(recipient_id=order.expert_id, type="payout_scheduled")
    assert note.context["payout_id"] == str(payout.pk)


def test_scheduled_payout_notifies_only_once(paid_completed_order):
    order = paid_completed_order
    # The hourly payout sweeper re-runs against the same order; scheduling is
    # idempotent, so the expert must not be notified twice.
    payment_services.schedule_payout(order)
    payment_services.payout_sweeper()

    assert (
        Notification.objects.filter(recipient_id=order.expert_id, type="payout_scheduled").count()
        == 1
    )


def test_failed_payout_notifies_the_expert(paid_completed_order, staff):
    order = paid_completed_order
    payout = Payout.objects.get(order=order)
    Notification.objects.all().delete()  # isolate the failure notification

    payment_services.mark_payout_failed(payout, actor=staff, reason="bank rejected")

    assert "payout_failed" in _types_for(order.expert_id)
    assert Payout.objects.get(pk=payout.pk).status == Payout.Status.FAILED


def test_payout_notifications_are_not_sent_to_the_student(paid_completed_order, staff):
    order = paid_completed_order
    payout = Payout.objects.get(order=order)
    payment_services.mark_payout_failed(payout, actor=staff, reason="bank rejected")

    student_types = _types_for(order.student_id)
    assert "payout_scheduled" not in student_types
    assert "payout_failed" not in student_types


# --------------------------------------------------------------------------
# 4. order_auto_approve_warning -- warn before money moves silently
# --------------------------------------------------------------------------


def test_auto_approve_warning_reaches_the_student_inside_the_window(delivered_order):
    order = delivered_order
    order.auto_approve_at = timezone.now() + timedelta(hours=12)
    order.save(update_fields=["auto_approve_at"])

    assert order_services.auto_approve_warning() == 1

    assert "order_auto_approve_warning" in _types_for(order.student_id)
    assert order.events.filter(event_type=OrderEvent.EventType.AUTO_APPROVE_WARNED).exists()


def test_auto_approve_warning_is_idempotent(delivered_order):
    order = delivered_order
    order.auto_approve_at = timezone.now() + timedelta(hours=12)
    order.save(update_fields=["auto_approve_at"])

    assert order_services.auto_approve_warning() == 1
    # The hourly tick runs again -- it must not re-warn.
    assert order_services.auto_approve_warning() == 0
    assert (
        Notification.objects.filter(
            recipient_id=order.student_id, type="order_auto_approve_warning"
        ).count()
        == 1
    )


def test_auto_approve_warning_skips_orders_outside_the_window(delivered_order):
    order = delivered_order
    order.auto_approve_at = timezone.now() + timedelta(hours=48)  # too far out
    order.save(update_fields=["auto_approve_at"])

    assert order_services.auto_approve_warning() == 0
    assert "order_auto_approve_warning" not in _types_for(order.student_id)


def test_auto_approve_warning_skips_orders_already_approved(delivered_order):
    order = delivered_order
    order.auto_approve_at = timezone.now() + timedelta(hours=12)
    order.status = Order.Status.COMPLETED
    order.save(update_fields=["auto_approve_at", "status"])

    assert order_services.auto_approve_warning() == 0


# --------------------------------------------------------------------------
# Catalog integrity -- the real regression guard
# --------------------------------------------------------------------------


def test_every_declared_notification_type_has_a_category():
    for ntype, category in CATEGORY_FOR_TYPE.items():
        assert category, f"{ntype} has no category"


def test_the_four_repaired_types_are_still_declared():
    for ntype in (
        "request_new_offer",
        "payout_scheduled",
        "payout_failed",
        "order_auto_approve_warning",
    ):
        assert ntype in CATEGORY_FOR_TYPE
