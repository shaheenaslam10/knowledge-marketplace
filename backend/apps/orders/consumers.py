"""Django Channels WebRTC signaling & collaborative scratchpad consumer for live coaching."""

from __future__ import annotations

import logging
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.orders.models import LiveSession, Order

logger = logging.getLogger(__name__)


class LiveCoachingConsumer(AsyncJsonWebsocketConsumer):
    """WS /ws/orders/<order_id>/live/ — group `order_{order_id}_live`."""

    user: Any
    order: Order
    group_name: str
    user_role: str

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)
            return

        self.user = user
        order_id = self.scope["url_route"]["kwargs"].get("order_id")
        self.group_name = f"order_{order_id}_live"

        try:
            order = await sync_to_async(self._get_authorized_order)(order_id, user)
        except Exception:
            await self.close(code=4403)
            return

        if not order:
            await self.close(code=4403)
            return

        self.order = order
        self.user_role = "expert" if user.id == order.expert_id else "student"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Announce presence to existing peer in room
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "peer.join",
                "user_id": user.id,
                "user_name": getattr(user, "name", "") or user.email,
                "user_role": self.user_role,
            },
        )

    def _get_authorized_order(self, order_id: Any, user: Any) -> Order | None:
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            return None
        is_participant = (
            order.student_id == user.id
            or order.expert_id == user.id
            or getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
        )
        return order if is_participant else None

    def _persist_scratchpad(self, content: str) -> None:
        active = (
            LiveSession.objects.filter(order=self.order, status=LiveSession.Status.LIVE)
            .order_by("-created_at")
            .first()
        )
        if not active:
            active = (
                LiveSession.objects.filter(order=self.order, status=LiveSession.Status.SCHEDULED)
                .order_by("-created_at")
                .first()
            )
        if active:
            active.scratchpad_content = content
            active.save(update_fields=["scratchpad_content", "updated_at"])

    async def disconnect(self, code: int) -> None:
        if hasattr(self, "group_name") and hasattr(self, "user") and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "peer.leave",
                    "user_id": self.user.id,
                },
            )
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content: dict, **kwargs) -> None:
        action = content.get("type")

        if action == "peer_join":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "peer.join",
                    "user_id": self.user.id,
                    "user_name": getattr(self.user, "name", "") or self.user.email,
                    "user_role": self.user_role,
                },
            )
        elif action == "webrtc_offer":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "webrtc.relay",
                    "sender_id": self.user.id,
                    "event": "offer",
                    "sdp": content.get("sdp"),
                },
            )
        elif action == "webrtc_answer":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "webrtc.relay",
                    "sender_id": self.user.id,
                    "event": "answer",
                    "sdp": content.get("sdp"),
                },
            )
        elif action == "webrtc_ice_candidate":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "webrtc.relay",
                    "sender_id": self.user.id,
                    "event": "ice_candidate",
                    "candidate": content.get("candidate"),
                },
            )
        elif action == "media_state":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "media.state",
                    "sender_id": self.user.id,
                    "audio": content.get("audio"),
                    "video": content.get("video"),
                    "screen": content.get("screen"),
                },
            )
        elif action == "scratchpad_update":
            text = str(content.get("content", ""))
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "scratchpad.update",
                    "sender_id": self.user.id,
                    "content": text,
                },
            )
            await sync_to_async(self._persist_scratchpad)(text)

    # ---------------- Group Handlers ----------------

    async def peer_join(self, event: dict) -> None:
        if event.get("user_id") != self.user.id:
            await self.send_json(
                {
                    "type": "peer_join",
                    "user_id": event.get("user_id"),
                    "user_name": event.get("user_name"),
                    "user_role": event.get("user_role"),
                }
            )

    async def peer_leave(self, event: dict) -> None:
        if event.get("user_id") != self.user.id:
            await self.send_json(
                {
                    "type": "peer_leave",
                    "user_id": event.get("user_id"),
                }
            )

    async def webrtc_relay(self, event: dict) -> None:
        if event.get("sender_id") != self.user.id:
            event_name = event.get("event")
            await self.send_json(
                {
                    "type": f"webrtc_{event_name}",
                    "sender_id": event.get("sender_id"),
                    "sdp": event.get("sdp"),
                    "candidate": event.get("candidate"),
                }
            )

    async def media_state(self, event: dict) -> None:
        if event.get("sender_id") != self.user.id:
            await self.send_json(
                {
                    "type": "media_state",
                    "sender_id": event.get("sender_id"),
                    "audio": event.get("audio"),
                    "video": event.get("video"),
                    "screen": event.get("screen"),
                }
            )

    async def scratchpad_update(self, event: dict) -> None:
        if event.get("sender_id") != self.user.id:
            await self.send_json(
                {
                    "type": "scratchpad_update",
                    "sender_id": event.get("sender_id"),
                    "content": event.get("content", ""),
                }
            )
