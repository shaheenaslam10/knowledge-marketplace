"""Thread WS consumer — transport only (ADR-0003/Phase 8 rules).

- authenticate on connect (JWT cookie middleware sets scope["user"])
- authorize per group on connect AND on every receive (services re-check too)
- ALL business logic delegates to apps.messaging.services (no ORM writes here)
- typing indicator is ephemeral, never persisted
"""

from __future__ import annotations

import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class ThreadConsumer(AsyncJsonWebsocketConsumer):
    """WS /ws/threads/{thread_id}/ — group `thread_{id}`."""

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)
            return
        from apps.messaging import services

        self.user = user
        self.group_name = f"thread_{self.scope['url_route']['kwargs']['thread_id']}"
        try:
            self.thread = await sync_to_async(services.thread_for_user)(
                self.scope["url_route"]["kwargs"]["thread_id"], user
            )
        except Exception:  # not found or not a participant — do not leak existence
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content: dict, **kwargs) -> None:
        from apps.messaging import services

        action = content.get("type")
        if action == "message.send":
            body = str(content.get("body", ""))
            attachment_id = content.get("attachment_id")
            try:
                message = await sync_to_async(services.send_message)(
                    self.thread, sender=self.user, body=body, attachment=attachment_id
                )
            except Exception as exc:  # domain errors go back to the sender only
                await self.send_json({"type": "message.error", "error": str(exc)})
                return
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "message.new",
                    "id": str(message.pk),
                    "sender_id": self.user.id,
                    "sender_name": self.user.name or self.user.email,
                    "body": message.body,
                    "created_at": message.created_at.isoformat(),
                },
            )
        elif action == "typing":
            # ephemeral — broadcast to the group, never persisted
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "typing", "user_id": self.user.id, "user_name": self.user.name},
            )
        elif action == "read":
            await sync_to_async(services.mark_read)(self.thread, user=self.user)

    # handler for group-sent events
    async def message_new(self, event: dict) -> None:
        await self.send_json({"type": "message.new", **event})

    async def typing(self, event: dict) -> None:
        if event.get("user_id") != self.user.id:  # don't echo typing to its author
            await self.send_json({"type": "typing", "user_name": event.get("user_name")})
