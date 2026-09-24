"""Notifications WS consumer — personal group `user_{id}` (ADR-0003).

Server pushes are hints: the client refetches authoritative state (unread
count, list) when a socket is unavailable. Nothing here reads or writes
notification rows.
"""

from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """WS /ws/notifications/ — group `user_{id}`."""

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)
            return
        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_push(self, event: dict) -> None:
        await self.send_json({"type": "notification.push", **event})
