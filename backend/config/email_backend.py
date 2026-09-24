"""Brevo email backend (ADR-0011) — stdlib urllib only, zero new dependencies.

Selected by EMAIL_BACKEND_MODE=brevo. Falls back to loud failure on API
errors (retries are the queue's job — django-q2 retries the calling task).
"""

from __future__ import annotations

import json
import logging
import urllib.request

from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages) -> int:
        from django.conf import settings

        api_key = settings.BREVO_API_KEY
        if not api_key:
            raise RuntimeError("EMAIL_BACKEND_MODE=brevo but BREVO_API_KEY is not set.")
        sent = 0
        for message in email_messages:
            payload = {
                "sender": {"email": settings.DEFAULT_FROM_EMAIL},
                "to": [{"email": r} for r in message.recipients()],
                "subject": message.subject,
                "textContent": message.body,
            }
            request = urllib.request.Request(
                BREVO_API_URL,
                data=json.dumps(payload).encode(),
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status >= 400:
                    raise RuntimeError(f"Brevo API error {response.status}")
            sent += 1
        logger.info("brevo email sent count=%s", sent)
        return sent
