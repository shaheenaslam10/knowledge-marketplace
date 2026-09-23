"""Order creation — the single convergence factory (ADR-0015)."""

from __future__ import annotations

import uuid

from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.orders.models import Order
from apps.payments.config import commission_split


def _next_number() -> str:
    return f"ORD-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


def create_order_from_offer(offer) -> Order:
    """Creates the order in `awaiting_payment` and snapshots the commission
    split (BR-17). Caller holds the surrounding transaction (bidding.accept);
    managed-service assignment reuses this factory with its own source later.
    """
    request = offer.request
    from apps.experts.models import ExpertProfile

    profile = ExpertProfile.objects.filter(pk=offer.expert_id).first()
    commission, net = commission_split(offer.amount)
    order = Order.objects.create(
        number=_next_number(),
        request=request,
        student=request.student,
        expert_id=offer.expert_id,
        expert_name=profile.display_name if profile else f"user:{offer.expert_id}",
        expert_slug=profile.slug if profile else "",
        source=Order.Source.OPEN_BID,
        offer_id=offer.pk,
        amount=offer.amount,
        currency=offer.currency,
        commission_amount=commission,
        expert_amount=net,
        accepted_at=timezone.now(),
        deadline=request.deadline,
    )
    audit_log(
        None,
        action="order.create",
        obj=order,
        detail={"source": order.source, "amount": order.amount},
    )
    return order
