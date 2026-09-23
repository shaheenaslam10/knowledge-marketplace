"""WebSocket foundation.

Phase 1 ships only the connectivity/plumbing proof (`PingConsumer`). Real
consumers (messaging, notifications) land in Phase 9 per docs/architecture/realtime.md
and follow the same rules: authenticate on connect, authorize per group,
delegate all business logic to service layers — never write ORM state here.
"""

import json
import logging

from channels.generic.websocket import WebsocketConsumer

logger = logging.getLogger(__name__)


class PingConsumer(WebsocketConsumer):
    """Echo-style liveness consumer at /ws/ping/ — replaced by real consumers later."""

    def connect(self):
        self.accept()

    def disconnect(self, code):
        logger.debug("ws ping disconnected code=%s", code)

    def receive(self, text_data=None, bytes_data=None):
        try:
            payload = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            self.send(text_data=json.dumps({"type": "error", "code": "invalid_json"}))
            return
        if payload.get("type") == "ping":
            self.send(text_data=json.dumps({"type": "pong"}))
        else:
            self.send(text_data=json.dumps({"type": "error", "code": "unsupported_type"}))
