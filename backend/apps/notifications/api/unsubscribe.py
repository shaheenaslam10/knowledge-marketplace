"""One-click email unsubscribe (public, tokenized — CAN-SPAM style links).

GET /api/v1/unsubscribe?token=… → resolves the signed token (60-day max age)
and turns the category's email channel off. ACCOUNT mail is immutable by
design; a token for it simply renders "already required". No auth: the token
IS the authorization (signed, single-purpose, expiring).
"""

from __future__ import annotations

from django.db import IntegrityError
from rest_framework.permissions import AllowAny
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import NotificationPreference, resolve_unsubscribe_token

CATEGORY_LABELS = dict(NotificationPreference.Category.choices)


class UnsubscribeView(APIView):
    """`GET /api/v1/unsubscribe?token=…` — public one-click email opt-out."""

    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "notifications/unsubscribe.html"

    def get(self, request):
        token = str(request.query_params.get("token", ""))
        resolved = resolve_unsubscribe_token(token)
        if resolved is None:
            return Response(
                {"status": "invalid", "category_label": ""},
                status=400,
            )
        user_id, category = resolved
        if category not in CATEGORY_LABELS:
            return Response({"status": "invalid", "category_label": ""}, status=400)
        if category == NotificationPreference.Category.ACCOUNT:
            # security mail cannot be muted — explain instead of failing hard
            return Response(
                {"status": "protected", "category_label": CATEGORY_LABELS[category]},
                status=200,
            )
        # token IS the authorization; update by user_id (no upward app import)
        try:
            NotificationPreference.objects.update_or_create(
                user_id=user_id, category=category, defaults={"email_enabled": False}
            )
        except IntegrityError:  # recipient no longer exists
            return Response({"status": "invalid", "category_label": ""}, status=400)
        return Response(
            {"status": "unsubscribed", "category_label": CATEGORY_LABELS[category]},
            status=200,
        )
