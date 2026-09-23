"""Expert lifecycle emails — thin django-q2 wrappers (no credentials inside)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

DECISION_COPY = {
    "approved": (
        "Your expert application is approved 🎉",
        "Welcome aboard! Your expert profile is now live in the public directory.\n"
        "You can pause availability anytime from your expert profile page.",
    ),
    "rejected": (
        "Update on your expert application",
        "After review, your application was not approved this time. You can update it "
        "and resubmit whenever you are ready — the reviewer's note is in your application page.",
    ),
    "suspended": (
        "Your expert account has been suspended",
        "Expert surfaces are paused and you are hidden from the directory. "
        "Your student account is unaffected. Reply to support for details.",
    ),
    "reinstated": (
        "Your expert account is reinstated",
        "Your expert profile is visible in the directory again. Welcome back!",
    ),
}


def send_application_received_email(user_id: int) -> dict:
    from apps.accounts.models import User

    user = User.objects.get(pk=user_id)
    send_mail(
        subject="We received your expert application",
        message=(
            f"Hi {user.name or 'there'},\n\n"
            "Thanks for applying to become an expert. Our team typically reviews "
            "applications within 48 hours — you'll hear back by email.\n"
            "You can check the status anytime under Account → Expert application."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("expert application received email sent user_id=%s", user_id)
    return {"sent": True}


def send_decision_email(user_id: int, decision: str) -> dict:
    from apps.accounts.models import User

    user = User.objects.get(pk=user_id)
    subject, body = DECISION_COPY.get(
        decision, ("Expert application update", "Please sign in for details.")
    )
    send_mail(
        subject=f"{subject} — Hybrid Expert Marketplace",
        message=f"Hi {user.name or 'there'},\n\n{body}\n",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("expert decision email sent user_id=%s decision=%s", user_id, decision)
    return {"sent": True}


def enqueue_expert_email(task_name: str, user_id: int, **kwargs) -> str:
    from django_q.tasks import async_task

    return async_task(task_name, user_id, task_name="experts.email", **kwargs)
