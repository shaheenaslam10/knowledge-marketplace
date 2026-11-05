"""WebSocket URL routing (single mount point; app consumers register here)."""

from django.urls import path

from apps.core.consumers import PingConsumer
from apps.messaging.consumers import ThreadConsumer
from apps.notifications.consumers import NotificationConsumer
from apps.orders.consumers import LiveCoachingConsumer

websocket_urlpatterns = [
    path("ws/ping/", PingConsumer.as_asgi()),
    path("ws/threads/<uuid:thread_id>/", ThreadConsumer.as_asgi()),
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/orders/<int:order_id>/live/", LiveCoachingConsumer.as_asgi()),
    path("ws/orders/<str:order_id>/live/", LiveCoachingConsumer.as_asgi()),
]
