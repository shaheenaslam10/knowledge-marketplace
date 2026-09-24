"""Orders-side receivers for payments domain signals (ADR-0005 amendment).

apps.payments is a LOWER layer — it emits `payment_confirmed`; this module
listens and runs the order activation state machine inside the same DB
transaction. Connected in PaymentsReadyConfig.ready() below (apps.py).
"""

from __future__ import annotations

import logging

from django.dispatch import receiver

from apps.orders.services import mark_paid
from apps.payments.models import Payment
from apps.payments.signals import payment_confirmed

logger = logging.getLogger(__name__)


@receiver(payment_confirmed, sender=Payment)
def activate_order_on_payment(sender, *, payment: Payment, source: str = "", **kwargs) -> None:
    mark_paid(payment.order, actor=None, via=payment.gateway)
    logger.info(
        "order activated by payment confirmation order=%s source=%s", payment.order.number, source
    )
