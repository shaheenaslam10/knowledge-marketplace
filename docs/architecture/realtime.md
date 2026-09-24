# Realtime Architecture (WebSockets)

> Status: ✅ Phase 8 (chat + notifications consumers live) · Last updated: Phase 8 completion · ADR-0003

## Where realtime earns its keep (and where it doesn't)

| Feature | Realtime? | Mechanism | Status |
|---|---|---|---|
| Chat messages | ✅ | WS `/ws/threads/{id}/` (`ThreadConsumer`) | ✅ Phase 8 |
| Notification toasts/badges | ✅ | WS `/ws/notifications/` (`NotificationConsumer`, group `user_{id}`) | ✅ Phase 8 |
| Order status timeline | later (push refresh hint) | WS `order_{id}` group → client refetches | backlog — REST refetch only today |
| Everything else (lists, dashboards) | ❌ | normal fetch / router refresh | — |

Deliberate choice (unchanged): WS transports are **hints to refetch, never the source of truth** — PostgreSQL (read through REST) is always authoritative. If a socket dies, the UI still works: sends fall back to REST, and the client refetches on reconnect, window focus, tab visibility, and `online` events (plus a slow interval poll for the notification badge).

## Stack & topology

- **Django Channels 4.3.x** on the same ASGI process as HTTP (daphne in dev, uvicorn in compose/prod). Consumers: `apps/messaging/consumers.py` (`ThreadConsumer`), `apps/notifications/consumers.py` (`NotificationConsumer`), plus the Phase 1 `PingConsumer` at `/ws/ping/`. Routes in `config/routing.py`.
- **Channel layer: `InMemoryChannelLayer`** (MVP). Valid because MVP runs **exactly one ASGI process** (documented constraint in system-architecture + deployment). Groups in use: `thread_{id}`, `user_{id}`.
- **No Redis** (locked decision, ADR-0002/0003). Scale-out path (no code changes, settings only): swap to `channels_redis.RedisChannelLayer` when a second ASGI process is needed — Redis then enters the stack for this one purpose (see scalability doc triggers).

## Consumer behavior (as implemented)

- **Auth on connect:** JWT from the `hm_access` httpOnly cookie (`JWTAuthMiddlewareStack`, Phase 2) sets `scope["user"]`. Unauthenticated → close **4401**. Origin validated against `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (`config/asgi.py` custom validator — the built-in channels validator only knows `ALLOWED_HOSTS`); missing/foreign Origin is rejected.
- **Authorization:** `ThreadConsumer` resolves the thread via `messaging.thread_for_user` on connect (participant check re-derived from the live context) — not found or not a participant → close **4403**.
- **Chat:** receive `{"type":"message.send","body":…,"attachment_id":…}` → **same service call as REST** (`send_message` — all validation/persistence/audit in one place, no ORM writes in consumers) → broadcast `message.new` with the shared wire payload (attachments included) to group `thread_{id}`. Domain errors return only to the sender as `message.error`. Every send also fans out `message_new` notifications (personal groups + email per preferences) from the service layer.
- **Typing:** `{"type":"typing"}` → ephemeral group broadcast, never persisted, not echoed to its author.
- **Read receipts:** `{"type":"read"}` → `mark_read` (watermark update).
- **Notifications:** `NotificationConsumer` joins group `user_{id}`; the delivery task group-sends `notification.push` (id/type/title/body/url) — best-effort, exceptions swallowed so an unavailable channel layer never fails a delivery; the client refetches on the hint.

## Client-side contract (Phase 8 frontend)

- Thread page: optimistic send over WS; if the socket is down, sends go straight to REST (same endpoint the WS consumer wraps); pending bubbles clear on the REST refetch; connection-state pill shows Live/Offline.
- Notifications provider: one app-wide socket, toast on push + refetch; focus/visibility/online listeners + 60s poll as the no-socket fallback.
- Reconnects use bounded exponential backoff; after the budget is exhausted the page stays correct via the refetch/poll fallbacks alone.

## Why not SSE / polling instead?

SSE was considered (simpler, unidirectional). Rejected because chat needs client→server anyway and Channels gives both directions with the same auth model at no extra infra cost. Polling-only remains the automatic degradation path if WS is blocked by a corporate proxy.

## Cost

Zero: no Redis, no Pusher/Ably, no extra server. The only cost is the documented single-process constraint until scale demands Redis (~$0–10/mo then).
