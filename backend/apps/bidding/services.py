"""Offer lifecycle + the transactional selection (docs/workflows/open-marketplace.md).

Offer machine:  pending -> accepted | declined | withdrawn | expired
Rules (BR-15..18): one offer per expert per request (unique), editable while
pending, withdrawable anytime while pending; withdrawal is reversible
(`resubmit`) while the request is open; <= MAX_PENDING live offers per expert;
acceptance is atomic: offer accepted, siblings declined, request matched,
Order created (awaiting_payment) — race-safe via select_for_update.
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.bidding.models import Offer
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.orders.services import create_order_from_offer
from apps.payments.config import MIN_OFFER_MINOR, commission_split
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest

MAX_PENDING_OFFERS = 20
OFFER_TTL_DAYS = 14


def _expert_guard(expert, request: ServiceRequest) -> None:
    if not request_services.expert_is_eligible(expert):
        raise PermissionDeniedError("Only approved, available experts can offer.")
    if not request.is_open_for_offers or request.mode != ServiceRequest.Mode.OPEN:
        raise DomainError("This request is not accepting offers.", code="request_closed")


def submit(expert, request: ServiceRequest, *, payload: dict[str, Any]) -> Offer:
    _expert_guard(expert, request)
    amount = payload.get("amount")
    if amount is None or amount < MIN_OFFER_MINOR:
        raise DomainError(
            "Offers below the platform minimum are not allowed (BR-18).", code="offer_too_low"
        )
    if Offer.objects.filter(request=request, expert=expert).exists():
        raise DomainError("You already have an offer on this request (BR-15).", code="offer_exists")
    pending = Offer.Status.PENDING
    if Offer.objects.filter(expert=expert, status=pending).count() >= MAX_PENDING_OFFERS:
        raise DomainError("Too many pending offers — withdraw one first.", code="offer_limit")
    with transaction.atomic():
        offer = Offer.objects.create(request=request, expert=expert, status=pending, **payload)
        ServiceRequest.objects.filter(pk=request.pk).update(offer_count=request.offer_count + 1)
        audit_log(expert, action="offer.submit", obj=offer, detail={"amount": amount})
    offer.refresh_from_db(fields=["request"])
    return offer


def _owned_pending(expert, offer: Offer) -> None:
    if offer.expert_id != expert.id:
        raise PermissionDeniedError("You can only manage your own offers.")
    if offer.status != Offer.Status.PENDING:
        raise DomainError("Only pending offers can be changed.", code="offer_locked")


def update_offer(expert, offer: Offer, *, payload: dict[str, Any]) -> Offer:
    _owned_pending(expert, offer)
    if not request_services.expert_is_eligible(
        expert
    ):  # BR-05: suspended/paused experts manage nothing
        raise PermissionDeniedError("Only approved, available experts can manage offers.")
    if not offer.request.is_open_for_offers:
        raise DomainError("This request is no longer accepting offers.", code="request_closed")
    amount = payload.get("amount", offer.amount)
    if amount is not None and amount < MIN_OFFER_MINOR:
        raise DomainError(
            "Offers below the platform minimum are not allowed (BR-18).", code="offer_too_low"
        )
    for field, value in payload.items():
        setattr(offer, field, value)
    offer.save()
    audit_log(expert, action="offer.update", obj=offer)
    return offer


def withdraw(expert, offer: Offer) -> Offer:
    _owned_pending(expert, offer)
    with transaction.atomic():
        offer.status = Offer.Status.WITHDRAWN
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
        ServiceRequest.objects.filter(pk=offer.request_id).update(
            offer_count=offer.request.offer_count - 1
        )
    audit_log(expert, action="offer.withdraw", obj=offer)
    return offer


def resubmit(expert, offer: Offer) -> Offer:
    """Withdrawn -> pending while the request is still open (BR-16 reversal)."""
    if offer.expert_id != expert.id:
        raise PermissionDeniedError("You can only manage your own offers.")
    if offer.status != Offer.Status.WITHDRAWN:
        raise DomainError("Only withdrawn offers can be re-submitted.", code="invalid_transition")
    _expert_guard(expert, offer.request)
    pending_count = Offer.objects.filter(expert=expert, status=Offer.Status.PENDING).count()
    if pending_count >= MAX_PENDING_OFFERS:
        raise DomainError("Too many pending offers — withdraw one first.", code="offer_limit")
    offer.status = Offer.Status.PENDING
    offer.responded_at = None
    offer.save(update_fields=["status", "responded_at", "updated_at"])
    ServiceRequest.objects.filter(pk=offer.request_id).update(
        offer_count=offer.request.offer_count + 1
    )
    audit_log(expert, action="offer.resubmit", obj=offer)
    return offer


def decline(student, offer: Offer, *, reason: str = "") -> Offer:
    request = offer.request
    if request.student_id != student.id:
        raise PermissionDeniedError("You can only manage offers on your own requests.")
    if offer.status != Offer.Status.PENDING:
        raise DomainError("Only pending offers can be declined.", code="offer_locked")
    offer.status = Offer.Status.DECLINED
    offer.responded_at = timezone.now()
    offer.response_reason = reason[:200]
    offer.save(update_fields=["status", "responded_at", "response_reason", "updated_at"])
    audit_log(student, action="offer.decline", obj=offer)
    return offer


@transaction.atomic
def accept(student, offer: Offer) -> tuple[Offer, Any]:
    """Race-safe selection: lock offer + request rows, re-validate everything
    server-side, then flip all state in one commit (BR-16)."""
    offer = Offer.objects.select_for_update().get(pk=offer.pk)
    request = ServiceRequest.objects.select_for_update().get(pk=offer.request_id)
    if request.student_id != student.id:
        raise PermissionDeniedError("You can only select an expert on your own requests.")
    if offer.status != Offer.Status.PENDING:
        raise DomainError("This offer can no longer be accepted.", code="offer_locked")
    if request.status != ServiceRequest.Status.OPEN:
        raise DomainError("This request is not open for selection.", code="request_closed")
    # Ineligible/suspended expert at selection time → refuse (BR-05).
    if not request_services.expert_is_eligible(offer.expert):
        raise DomainError("This expert is no longer eligible.", code="expert_ineligible")

    now = timezone.now()
    offer.status = Offer.Status.ACCEPTED
    offer.responded_at = now
    offer.save(update_fields=["status", "responded_at", "updated_at"])
    siblings = Offer.objects.filter(request=request, status=Offer.Status.PENDING).exclude(
        pk=offer.pk
    )
    siblings.update(
        status=Offer.Status.DECLINED,
        responded_at=now,
        response_reason="Another expert was selected",
    )
    request_services.mark_matched(request, actor=student)
    order = create_order_from_offer(offer)
    audit_log(student, action="offer.accept", obj=offer, detail={"order": str(order.pk)})
    from apps.notifications.services import notify

    notify(
        offer.expert_id,
        "offer_accepted",
        title="Your offer was accepted",
        body="The student selected your offer — the order is awaiting payment.",
        url=f"/orders/{order.pk}",
        context={"order_id": str(order.pk)},
    )
    return offer, order


def decline_siblings_and_expire(request: ServiceRequest) -> int:
    """Expire remaining pending offers when a request expires/closes (BR-15)."""
    now = timezone.now()
    return Offer.objects.filter(request=request, status=Offer.Status.PENDING).update(
        status=Offer.Status.EXPIRED, responded_at=now, response_reason="Request closed"
    )


def net_preview(amount_minor: int) -> dict[str, int]:
    commission, net = commission_split(amount_minor)
    return {"commission": commission, "net": net}
