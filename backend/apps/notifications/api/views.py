"""Notifications REST API — inbox, read state, preferences."""

from __future__ import annotations

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications import services


def _notification_meta(notification) -> dict:
    return {
        "id": str(notification.pk),
        "type": notification.type,
        "title": notification.title,
        "body": notification.body,
        "url": notification.url,
        "read": notification.read_at is not None,
        "created_at": notification.created_at,
    }


class MyNotificationListView(APIView):
    """GET /api/v1/me/notifications — latest 50 + unread count."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = services.Notification.objects.filter(recipient=request.user)[:50]
        return Response(
            {
                "unread": services.unread_count(request.user),
                "results": [_notification_meta(n) for n in qs],
            }
        )


class MyNotificationReadView(APIView):
    """POST /api/v1/me/notifications/{id}/read — mark one read."""

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = services.Notification.objects.filter(
            pk=notification_id, recipient=request.user
        ).first()
        if notification is None:
            from apps.core.exceptions import NotFoundError

            raise NotFoundError("Notification not found.")
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response({"read": True, "unread": services.unread_count(request.user)})


class MyNotificationReadAllView(APIView):
    """POST /api/v1/me/notifications/read-all."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = services.Notification.objects.filter(
            recipient=request.user, read_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({"read_all": True, "updated": updated})


class MyNotificationPreferencesView(APIView):
    """GET/PUT /api/v1/me/notification-preferences — per-category email toggle."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"results": services.preferences_for(request.user)})

    def put(self, request):
        category = str(request.data.get("category", ""))
        pref = services.set_preference(
            request.user, category, email_enabled=bool(request.data.get("email_enabled", True))
        )
        return Response({"category": pref.category, "email_enabled": pref.email_enabled})
