"""WebSocket URL routing (single mount point; app consumers register here)."""

from django.urls import path

from apps.core.consumers import PingConsumer

websocket_urlpatterns = [
    path("ws/ping/", PingConsumer.as_asgi()),
]
