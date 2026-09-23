"""Bidding maintenance — orchestrates request TTL expiry + offer closure (BR-08/BR-15).

Lives in bidding (the highest domain layer involved) so the layering contract
stays intact: it may import service_requests downward. Schedule it via the
Django admin (django-q2 Scheduled tasks, hourly) — one-off ops setup, no code.
"""

from __future__ import annotations

import logging

from django.utils import timezone

from apps.bidding.models import Offer
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest

logger = logging.getLogger(__name__)


def expire_stale_requests() -> int:
    """Expire TTL-due open requests, then close their pending offers."""
    due_ids = list(
        ServiceRequest.objects.filter(
            status=ServiceRequest.Status.OPEN, expires_at__lte=timezone.now()
        ).values_list("id", flat=True)
    )
    count = request_services.expire_due()
    if due_ids:
        Offer.objects.filter(request_id__in=due_ids, status=Offer.Status.PENDING).update(
            status=Offer.Status.EXPIRED,
            responded_at=timezone.now(),
            response_reason="Request expired",
        )
    logger.info("requests expired=%s offers closed", count)
    return count
