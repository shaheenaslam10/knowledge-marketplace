"""Account emails — thin task wrappers (django-q2) over the email builders.

Emails contain no credentials — only single-use, time-limited links/tokens.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from apps.accounts.models import User

logger = logging.getLogger(__name__)


def _send(subject: str, body: str, to: str) -> None:
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to],
        fail_silently=False,
    )


def send_verification_email(user_id: int) -> dict:
    from apps.accounts.services import verification_url

    user = User.objects.get(pk=user_id)
    if user.is_verified:
        return {"skipped": "already_verified"}
    url = verification_url(user)
    _send(
        subject="Verify your email — Hybrid Expert Marketplace",
        body=(
            f"Hi {user.name or 'there'},\n\n"
            "Confirm your email address to unlock requests, offers and messaging:\n"
            f"{url}\n\n"
            "The link expires in 24 hours. If you didn't create this account, ignore this email."
        ),
        to=user.email,
    )
    logger.info("verification email sent user_id=%s", user_id)
    return {"sent": True}


def send_password_reset_email(user_id: int) -> dict:
    from apps.accounts.services import password_reset_context

    user = User.objects.get(pk=user_id)
    ctx = password_reset_context(user)
    _send(
        subject="Reset your password — Hybrid Expert Marketplace",
        body=(
            f"Hi {user.name or 'there'},\n\n"
            "We received a request to reset your password:\n"
            f"{ctx['url']}\n\n"
            "The link is single-use and expires after 3 days. "
            "If this wasn't you, ignore this email — your password is unchanged."
        ),
        to=user.email,
    )
    logger.info("password reset email sent user_id=%s", user_id)
    return {"sent": True}


def enqueue_email(task_name: str, user_id: int) -> str:
    """Queue via django-q2 (sync=True executes inline under test)."""
    from django_q.tasks import async_task

    return async_task(task_name, user_id, task_name="accounts.email")
