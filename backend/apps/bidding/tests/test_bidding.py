"""Offer lifecycle + transactional selection tests (Phase 4)."""

import json

import pytest

from apps.bidding import services
from apps.bidding.models import Offer
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.services import suspend
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.orders.models import Order
from apps.payments.config import commission_split
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="bid-student@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def open_request(student):
    subject = ensure_term(kind="subject", name="Chemistry")[0]
    req = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Organic chemistry tutoring",
            "description": "Reaction mechanisms coaching twice a week.",
            "subject": subject,
            "budget_min": 3000,
            "budget_max": 12000,
        },
    )
    return request_services.publish(student, req, attested=True)


def _offer_data(amount=8000, **over):
    data = {
        "amount": amount,
        "currency": "USD",
        "timeline_text": "2 weeks",
        "message": "I can help weekly.",
    }
    data.update(over)
    return data


def test_submit_rules(open_request, django_user_model, student):
    expert = make_expert(django_user_model, "bid1@demo.local", "Bid One")
    offer = services.submit(expert, open_request, payload=_offer_data())
    assert offer.status == Offer.Status.PENDING
    open_request.refresh_from_db()
    assert open_request.offer_count == 1

    with pytest.raises(DomainError):  # BR-15 one per request
        services.submit(expert, open_request, payload=_offer_data())
    expert2 = make_expert(django_user_model, "bid3@demo.local", "Bid Three")
    with pytest.raises(DomainError):  # BR-18 floor
        services.submit(expert2, open_request, payload=_offer_data(amount=100))
    with pytest.raises(PermissionDeniedError):
        services.submit(student, open_request, payload=_offer_data())


def test_submit_requires_open_eligible_request(open_request, django_user_model, student):
    expert = make_expert(django_user_model, "bid4@demo.local", "Bid Four")
    request_services.cancel(student, open_request, reason="changed mind")
    with pytest.raises(DomainError):
        services.submit(expert, open_request, payload=_offer_data())


def test_edit_withdraw_resubmit(open_request, django_user_model):
    expert = make_expert(django_user_model, "bid5@demo.local", "Bid Five")
    offer = services.submit(expert, open_request, payload=_offer_data())
    services.update_offer(expert, offer, payload={"amount": 9000, "message": "Updated plan."})
    offer.refresh_from_db()
    assert offer.amount == 9000

    with pytest.raises(PermissionDeniedError):
        other = make_expert(django_user_model, "bid6@demo.local", "Bid Six")
        services.update_offer(other, offer, payload={"amount": 1})

    services.withdraw(expert, offer)
    offer.refresh_from_db()
    assert offer.status == Offer.Status.WITHDRAWN
    open_request.refresh_from_db()
    assert open_request.offer_count == 0
    with pytest.raises(DomainError):
        services.withdraw(expert, offer)  # not pending anymore
    services.resubmit(expert, offer)
    offer.refresh_from_db()
    assert offer.status == Offer.Status.PENDING


def test_decline_by_owner(open_request, django_user_model, student):
    expert = make_expert(django_user_model, "bid7@demo.local", "Bid Seven")
    offer = services.submit(expert, open_request, payload=_offer_data())
    with pytest.raises(PermissionDeniedError):
        services.decline(expert, offer)
    services.decline(student, offer, reason="not a fit")
    offer.refresh_from_db()
    assert offer.status == Offer.Status.DECLINED
    assert offer.response_reason == "not a fit"


def test_accept_is_transactional_and_creates_order(open_request, django_user_model, student):
    winner = make_expert(django_user_model, "win@demo.local", "Winner Expert")
    loser = make_expert(django_user_model, "lose@demo.local", "Loser Expert")
    winning_offer = services.submit(winner, open_request, payload=_offer_data(10000))
    losing_offer = services.submit(loser, open_request, payload=_offer_data(6000))

    with pytest.raises(PermissionDeniedError):
        services.accept(winner, winning_offer)  # only the request owner selects

    offer, order = services.accept(student, winning_offer)
    offer.refresh_from_db()
    losing_offer.refresh_from_db()
    open_request.refresh_from_db()
    assert offer.status == Offer.Status.ACCEPTED
    assert losing_offer.status == Offer.Status.DECLINED  # siblings auto-declined
    assert open_request.status == ServiceRequest.Status.MATCHED
    assert order.status == Order.Status.AWAITING_PAYMENT
    assert order.amount == 10000
    commission, net = commission_split(10000)
    assert (order.commission_amount, order.expert_amount) == (commission, net)
    assert order.source == Order.Source.OPEN_BID
    assert order.expert_name == "Winner Expert"  # snapshot, not FK


def test_accept_guards(open_request, django_user_model, student):
    expert = make_expert(django_user_model, "guard@demo.local", "Guard Expert")
    offer = services.submit(expert, open_request, payload=_offer_data())
    offer.status = Offer.Status.WITHDRAWN  # simulate a state change behind the student's back
    offer.save(update_fields=["status"])
    with pytest.raises(DomainError):
        services.accept(student, offer)  # accepting an invalid/withdrawn offer


def test_cannot_select_two_experts(open_request, django_user_model, student):
    first = make_expert(django_user_model, "two1@demo.local", "First Expert")
    second = make_expert(django_user_model, "two2@demo.local", "Second Expert")
    offer1 = services.submit(first, open_request, payload=_offer_data())
    offer2 = services.submit(second, open_request, payload=_offer_data())
    services.accept(student, offer1)
    with pytest.raises(DomainError):  # duplicate assignment is impossible
        services.accept(student, offer2)


def test_suspended_expert_cannot_be_selected_or_offer(open_request, django_user_model, student):
    expert = make_expert(django_user_model, "susp@demo.local", "Susp Expert")
    offer = services.submit(expert, open_request, payload=_offer_data())
    admin = django_user_model.objects.create_user(
        email="bid-admin@demo.local", password=PASSWORD, name="A", is_staff=True
    )
    suspend(expert.expert_application.pk, reviewer=admin, reason="violation")
    with pytest.raises(DomainError):
        services.accept(student, offer)  # ineligible at selection time
    offer.status = Offer.Status.PENDING
    offer.save(update_fields=["status"])
    request = ServiceRequest.objects.get(pk=open_request.pk)
    request.status = ServiceRequest.Status.OPEN
    request.save(update_fields=["status"])
    with pytest.raises(PermissionDeniedError):
        services.update_offer(expert, offer, payload={"amount": 9000})


def test_expired_request_expires_pending_offers(open_request, django_user_model):
    expert = make_expert(django_user_model, "exp@demo.local", "Expiry Expert")
    offer = services.submit(expert, open_request, payload=_offer_data())
    request_services.expire_due.__wrapped__ if hasattr(
        request_services.expire_due, "__wrapped__"
    ) else None
    open_request.status = ServiceRequest.Status.EXPIRED
    open_request.save(update_fields=["status"])
    services.decline_siblings_and_expire(open_request)
    offer.refresh_from_db()
    assert offer.status == Offer.Status.EXPIRED


# --- API surface ---


def test_offer_api_flow(client, open_request, django_user_model, student):
    expert = make_expert(django_user_model, "api1@demo.local", "Api Expert")
    api_login(client, expert)
    response = client.post(
        f"/api/v1/requests/{open_request.pk}/offers", _offer_data(), content_type="application/json"
    )
    assert response.status_code == 201
    offer = response.json()
    assert offer["status"] == "pending"
    assert offer["net_preview"]["net"] < offer["amount"]  # BR-17 net preview

    response = client.patch(
        f"/api/v1/me/offers/{offer['id']}",
        json.dumps({"amount": 9500}),
        content_type="application/json",
    )
    assert response.status_code == 200

    api_login(client, student)
    response = client.get(f"/api/v1/me/requests/{open_request.pk}/offers")
    assert response.status_code == 200
    card = response.json()["results"][0]["expert"]
    assert card["display_name"] == "Api Expert"  # expert card, not private data

    response = client.post(
        f"/api/v1/me/requests/{open_request.pk}/offers/{offer['id']}/accept",
        "{}",
        content_type="application/json",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["order"]["status"] == "awaiting_payment"
    assert body["request"]["status"] == "matched"
    assert Order.objects.filter(pk=body["order"]["id"]).exists()


def test_offer_api_blind_bidding(client, open_request, django_user_model):
    """Experts never see other experts' offers or identities (BR-05)."""
    e1 = make_expert(django_user_model, "blind1@demo.local", "Blind One")
    e2 = make_expert(django_user_model, "blind2@demo.local", "Blind Two")
    services.submit(e1, open_request, payload=_offer_data())
    api_login(client, e2)
    response = client.get(f"/api/v1/requests/{open_request.pk}")
    bidding = response.json()["bidding"]
    assert set(bidding.keys()) == {"offer_count", "my_offer_status"}
    assert bidding["offer_count"] == 1  # count visible, identity hidden
    api_login(client, e1)
    assert "expert" not in client.get("/api/v1/me/offers").json()["results"][0]


def test_my_offers_list_scoped(client, open_request, django_user_model):
    e1 = make_expert(django_user_model, "scope1@demo.local", "Scope One")
    e2 = make_expert(django_user_model, "scope2@demo.local", "Scope Two")
    services.submit(e1, open_request, payload=_offer_data())
    services.submit(e2, open_request, payload=_offer_data())
    api_login(client, e1)
    results = client.get("/api/v1/me/offers").json()["results"]
    assert len(results) == 1  # only own offers, ever
