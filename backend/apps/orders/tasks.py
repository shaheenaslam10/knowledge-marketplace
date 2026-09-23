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
    "deadline_reminder": (
        "Delivery due within 24 hours",
        "Heads-up: your delivery is due within 24 hours. Submit it (or propose a new deadline in chat) to stay on track.",
    ),
}


def auto_approve_deliveries() -> int:
    """BR-24 — approve delivered orders past the 72h auto-approval timer.
    Schedule: every 15 min (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.auto_approve_due()


def awaiting_payment_sweeper() -> int:
    """BR-23 — cancel orders unpaid for more than 72h.
    Schedule: hourly (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.sweep_unpaid()


def deadline_reminder() -> int:
    """T-24h expert warning. Schedule: hourly (django-q2 Scheduled tasks, ops setup)."""
    from apps.orders import services

    return services.deadline_reminder()


def send_order_event_email(order_id: str, event: str, extra_email: int | None = None) -> dict:
    from apps.accounts.models import User
    from apps.orders.models import Order

    order = Order.objects.select_related("request").get(pk=order_id)
    subject, body = COPY.get(event, ("Order update", "Please sign in for details."))
    recipients = [order.student_id, order.expert_id]
    if extra_email is not None and extra_email not in recipients:
        recipients.append(extra_email)
    for user_id in recipients:
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
