"""Order creation — the single convergence factory (ADR-0015)."""

from __future__ import annotations

import uuid

from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.orders.models import Order
from apps.payments.config import commission_split, rate_for_source


def _next_number() -> str:
    return f"ORD-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


def create_order_for_request(
    request,
    *,
    expert,
    amount: int,
    currency: str,
    source: str,
    offer_id=None,
) -> Order:
    """THE order factory — every acquisition path converges here (ADR-0015).

    Caller holds the surrounding transaction and has already validated
    eligibility. `source` picks the commission rate (open 15%, managed 20%),
    which is snapshotted onto the row (BR-17/BR-22).
    """
    from apps.experts.models import ExpertProfile

    expert_pk = getattr(expert, "pk", expert)
    profile = ExpertProfile.objects.filter(pk=expert_pk).first()
    commission, net = commission_split(amount, rate_for_source(source))
    order = Order.objects.create(
        number=_next_number(),
        request=request,
        student=request.student,
        expert_id=expert_pk,
        expert_name=profile.display_name if profile else f"user:{expert_pk}",
        expert_slug=profile.slug if profile else "",
        source=source,
        offer_id=offer_id,
        amount=amount,
        currency=currency,
        commission_amount=commission,
        expert_amount=net,
        accepted_at=timezone.now(),
        deadline=request.deadline,
    )
    audit_log(None, action="order.create", obj=order, detail={"source": source, "amount": amount})
    return order


def create_order_from_offer(offer) -> Order:
    """Open-bid selection seam (bidding.accept) — delegates to the generic factory."""
    return create_order_for_request(
        offer.request,
        expert=offer.expert_id,
        amount=offer.amount,
        currency=offer.currency,
        source=Order.Source.OPEN_BID,
        offer_id=offer.pk,
    )
