"""WebSocket URL routing (single mount point; app consumers register here)."""

from django.urls import path

from apps.core.consumers import PingConsumer
from apps.messaging.consumers import ThreadConsumer
from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    path("ws/ping/", PingConsumer.as_asgi()),
    path("ws/threads/<uuid:thread_id>/", ThreadConsumer.as_asgi()),
    path("ws/notifications/", NotificationConsumer.as_asgi()),
]
