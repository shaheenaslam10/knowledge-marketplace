"""Order emails — thin django-q2 wrappers (Phase 8 expands the system)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

COPY = {
    "order_active": (
        "Order paid — you can start",
        "Payment is confirmed; the deadline clock is running. Deliver through your Assignments → Order page.",
    ),
    "delivered": (
        "Your order has a delivery to review",
        "The expert submitted their work. Approve it or request a revision within 72 hours — after that it auto-approves.",
    ),
    "revision_requested": (
        "Revision requested",
        "The student requested changes. Check the order page for the notes and the updated due date.",
    ),
    "completed": (
        "Order completed 🎉",
        "The delivery was approved. Payout is scheduled per the payments terms (Phase 7).",
    ),
    "cancelled": ("Order cancelled", "This order was cancelled. No action is needed."),
}


def send_order_event_email(order_id: str, event: str) -> dict:
    from apps.accounts.models import User
    from apps.orders.models import Order

    order = Order.objects.select_related("request").get(pk=order_id)
    subject, body = COPY.get(event, ("Order update", "Please sign in for details."))
    for user_id in (order.student_id, order.expert_id):
        user = User.objects.filter(pk=user_id).first()
        if user is None:
            continue
        send_mail(
            subject=f"{subject} — Hybrid Expert Marketplace",
            message=f"Hi {user.name or 'there'},\n\n{body}\n\nOrder {order.number} ({order.request.title}).",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    logger.info("order event email sent order=%s event=%s", order_id, event)
    return {"sent": True}
