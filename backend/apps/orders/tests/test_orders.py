"""Order lifecycle: delivery loop, revisions, approval, auto-approval, races (Phase 6)."""

import json
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.files.services import grant_download, store_upload
from apps.orders import services
from apps.orders.delivery import Delivery, OrderEvent
from apps.orders.models import Order
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("work.pdf", b"%PDF-1.4\n" + b"w" * 64)


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="ord-student@demo.local", password="long-pass-123", name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        email="ord-admin@demo.local", password="long-pass-123", name="A", is_staff=True
    )


def _active_order(student, django_user_model, admin):
    """An ACTIVE open_bid order — built through orders' own factory so this
    module never imports upward layers (the full open-bid path is covered in
    apps.bidding tests)."""
    import uuid as uuid_lib

    from apps.experts.tests.test_api import make_expert

    subject = ensure_term(kind="subject", name="OrdSub")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Order flow",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    req = request_services.publish(student, req, attested=True)
    expert = make_expert(
        django_user_model, f"ord-{uuid_lib.uuid4().hex[:8]}@demo.local", "Ord Expert"
    )
    order = services.create_order_for_request(
        req, expert=expert, amount=7000, currency="USD", source=Order.Source.OPEN_BID
    )
    request_services.mark_matched(req)  # selection already happened upstream (bidding.accept)
    return services.mark_paid(order, actor=admin, via="manual"), expert


@pytest.fixture
def active_order(student, django_user_model, admin):
    return _active_order(student, django_user_model, admin)


def test_payment_seam_and_request_link(student, admin, active_order):
    order, _expert = active_order
    order.refresh_from_db()
    assert order.status == Order.Status.ACTIVE and order.paid_at is not None
    assert order.request.status == "in_progress"  # request follows the order
    assert order.events.filter(event_type=OrderEvent.EventType.PAYMENT_CONFIRMED).exists()
    with pytest.raises(DomainError):
        services.mark_paid(order, actor=admin)  # double payment impossible


def test_student_cannot_self_confirm_payment(student, active_order):
    order, _expert = active_order
    fresh = Order.objects.get(pk=order.pk)
    fresh.status = Order.Status.AWAITING_PAYMENT
    fresh.paid_at = None
    fresh.save(update_fields=["status", "paid_at"])
    with pytest.raises(PermissionDeniedError):
        services.mark_paid(fresh, actor=student)  # seam is staff-only until Phase 7


def test_delivery_loop_with_files(student, active_order):
    order, expert = active_order
    attachment, _ = store_upload(expert, purpose="delivery", uploaded_file=PDF)
    delivery = services.submit_delivery(
        order,
        expert=expert,
        summary="Completed sessions + notes for weeks one and two.",
        attachment_ids=[str(attachment.pk)],
    )
    order.refresh_from_db()
    assert order.status == Order.Status.DELIVERED
    assert delivery.revision_number == 0
    assert order.auto_approve_at is not None
    assert order.deliveries.count() == 1

    revision = services.request_revision(
        order, student=student, note="Please redo section two with examples."
    )
    order.refresh_from_db()
    assert order.status == Order.Status.REVISION_REQUESTED
    assert order.revisions_used == 1
    assert revision.status == Delivery.Status.REVISION_REQUESTED
    assert order.auto_approve_at is None  # timer paused mid-revision

    resubmission = services.submit_delivery(
        order,
        expert=expert,
        summary="Section two reworked with worked examples.",
        attachment_ids=None,
    )
    assert resubmission.revision_number == 1
    order.refresh_from_db()
    assert order.status == Order.Status.DELIVERED

    services.approve_delivery(order, actor=student, source="student")
    order.refresh_from_db()
    assert order.status == Order.Status.COMPLETED
    assert order.deliveries.order_by("-revision_number").first().approval_source == "student"
    assert order.request.status == "completed"
    assert order.events.filter(event_type=OrderEvent.EventType.COMPLETED).exists()


def test_revision_rules_and_history(student, active_order):
    order, expert = active_order
    services.submit_delivery(order, expert=expert, summary="First complete delivery of the work.")
    services.request_revision(order, student=student, note="Change the intro examples please.")
    services.submit_delivery(order, expert=expert, summary="Second delivery with revised examples.")
    services.request_revision(order, student=student, note="One more pass on the summary section.")
    services.submit_delivery(order, expert=expert, summary="Third delivery, final polish applied.")
    with pytest.raises(DomainError):  # 2 included revisions exhausted (BR-24)
        services.request_revision(order, student=student, note="Yet another round of changes.")

    with pytest.raises(DomainError):
        services.request_revision(order, student=student, note="short")  # note required
    with pytest.raises(PermissionDeniedError):
        services.request_revision(order, student=expert, note="not the student")


def test_delivery_guards(student, admin, active_order, django_user_model):
    order, expert = active_order
    stranger = django_user_model.objects.create_user(
        email="ord-x@demo.local", password="long-pass-123", name="X"
    )
    with pytest.raises(PermissionDeniedError):
        services.submit_delivery(
            order, expert=stranger, summary="Totally not the assigned expert here."
        )
    with pytest.raises(PermissionDeniedError):
        services.approve_delivery(order, actor=stranger, source="student")
    with pytest.raises(DomainError):
        services.submit_delivery(order, expert=expert, summary="too short")  # summary quality gate
    with pytest.raises(PermissionDeniedError):  # post-payment: student cannot self-cancel
        services.cancel(order, actor=order.student, reason="self-cancel after payment")
    order = services.cancel(order, actor=admin, reason="Support decision (BR-27)")
    order.refresh_from_db()
    with pytest.raises(DomainError):  # cancelled orders take no deliveries
        services.submit_delivery(order, expert=expert, summary="Delivering into a cancelled order.")


def test_duplicate_completion_and_cancel_races(student, admin, active_order):
    order, expert = active_order
    services.submit_delivery(order, expert=expert, summary="Delivery number one, ready for review.")
    services.approve_delivery(order, actor=student, source="student")
    with pytest.raises(DomainError):
        services.approve_delivery(order, actor=student, source="student")  # duplicate completion
    with pytest.raises(DomainError):
        services.cancel(order, actor=admin, reason="too late")  # completed is terminal
    fresh = Order.objects.get(pk=order.pk)
    with pytest.raises(DomainError):
        services.transition(fresh, "active")  # state-transition bypass blocked


def test_cancellation_paths(student, admin, django_user_model):
    order, _expert = _active_order(student, django_user_model, admin)
    order.status = Order.Status.AWAITING_PAYMENT
    order.paid_at = None
    order.save(update_fields=["status", "paid_at"])
    order = services.cancel(order, actor=student, reason="Found a different expert")
    assert order.status == Order.Status.CANCELLED
    assert order.request.status == "cancelled"

    order2, _ = _active_order(student, django_user_model, admin)
    with pytest.raises(PermissionDeniedError):
        services.cancel(
            order2, actor=order2.student, reason="post-payment self-cancel"
        )  # after payment: staff only
    order2 = services.cancel(order2, actor=admin, reason="Support decision (BR-27)")
    assert order2.status == Order.Status.CANCELLED


def test_auto_approval_idempotent_and_race_safe(student, active_order, django_user_model, admin):
    order, expert = active_order
    services.submit_delivery(order, expert=expert, summary="Auto-approval test delivery, all done.")
    Order.objects.filter(pk=order.pk).update(auto_approve_at=timezone.now() - timedelta(hours=1))
    assert services.auto_approve_due() == 1
    order.refresh_from_db()
    assert order.status == Order.Status.COMPLETED
    assert order.deliveries.order_by("-revision_number").first().approval_source == "auto"
    assert order.events.filter(event_type=OrderEvent.EventType.AUTO_APPROVED).exists()
    assert services.auto_approve_due() == 0  # idempotent — nothing due anymore
    # a student approval racing the worker: worker re-checks status under lock
    order2, expert2 = _active_order(student, django_user_model, admin)
    services.submit_delivery(
        order2, expert=expert2, summary="Second order delivery for the race test."
    )
    Order.objects.filter(pk=order2.pk).update(auto_approve_at=timezone.now() - timedelta(hours=2))
    services.approve_delivery(order2, actor=order2.student, source="student")
    assert services.auto_approve_due() == 0  # did not double-approve


def test_unpaid_sweeper(student, admin, django_user_model):
    order, _ = _active_order(student, django_user_model, admin)
    Order.objects.filter(pk=order.pk).update(
        status=Order.Status.AWAITING_PAYMENT,
        paid_at=None,
        created_at=timezone.now() - timedelta(hours=73),
    )
    assert services.sweep_unpaid() == 1
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED
    assert services.sweep_unpaid() == 0


def test_delivery_file_access_rules(student, active_order, django_user_model):
    order, expert = active_order
    attachment, _ = store_upload(expert, purpose="delivery", uploaded_file=PDF)
    services.submit_delivery(
        order,
        expert=expert,
        summary="Files attached for the student.",
        attachment_ids=[str(attachment.pk)],
    )
    outsider = django_user_model.objects.create_user(
        email="ord-outsider@demo.local", password="long-pass-123", name="O"
    )
    assert grant_download(student, attachment)  # order student = participant
    assert grant_download(expert, attachment)  # delivering expert
    assert not grant_download(outsider, attachment)
    other_expert = django_user_model.objects.create_user(
        email="ord-other@demo.local", password="long-pass-123", name="E"
    )
    assert not grant_download(other_expert, attachment)  # eligible-but-unrelated expert


def test_order_api_workspace(client, student, admin, active_order, django_user_model):
    order, expert = active_order
    services.submit_delivery(order, expert=expert, summary="Workspace API test delivery content.")

    api_login_client = client
    from apps.experts.tests.test_api import PASSWORD, api_login

    api_login(api_login_client, student)
    response = api_login_client.get("/api/v1/me/orders")
    assert response.status_code == 200
    assert response.json()["results"][0]["role"] == "student"

    detail = api_login_client.get(f"/api/v1/me/orders/{order.pk}").json()
    assert detail["number"] == order.number
    assert [e["event_type"] for e in detail["events"]][:2] == ["created", "payment_confirmed"]
    assert detail["deliveries"][0]["summary"] == "Workspace API test delivery content."

    # revision + approve through the API
    response = api_login_client.post(
        f"/api/v1/me/orders/{order.pk}/request-revision",
        json.dumps({"note": "Tighten the summary please."}),
        content_type="application/json",
    )
    assert response.status_code == 200
    api_login(api_login_client, expert)
    response = api_login_client.post(
        f"/api/v1/me/orders/{order.pk}/deliveries",
        json.dumps({"summary": "Revised delivery via the API surface."}),
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json()["revision_number"] == 1
    api_login(api_login_client, student)
    response = api_login_client.post(
        f"/api/v1/me/orders/{order.pk}/approve", "{}", content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

    # strangers are locked out
    intruder = django_user_model.objects.create_user(
        email="ord-intruder@demo.local", password=PASSWORD, name="I"
    )
    api_login(api_login_client, intruder)
    assert api_login_client.get(f"/api/v1/me/orders/{order.pk}").status_code == 403
    assert (
        api_login_client.post(
            f"/api/v1/me/orders/{order.pk}/approve", "{}", content_type="application/json"
        ).status_code
        == 403
    )
