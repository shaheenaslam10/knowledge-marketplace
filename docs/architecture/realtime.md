# Realtime Architecture (WebSockets)

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · ADR-0003

## Where realtime earns its keep (and where it doesn't)

| Feature | Realtime in MVP? | Mechanism |
|---|---|---|
| Chat messages | ✅ | WS `/ws/threads/{id}/` |
| Notification toasts/badges | ✅ | WS `/ws/notifications/` |
| Order status timeline | ✅ (push refresh hint) | WS `order_{id}` group → client refetches |
| Offer arrivals (student) | ✅ toast | personal user group |
| Everything else (lists, dashboards) | ❌ | normal fetch / router refresh |

Deliberate choice: WS transports are **hints to refetch**, never the source of truth. If a socket dies, the UI still works via polling fallback (client refetch on reconnect + focus).

## Stack & topology

- **Django Channels 4.3.x** on the same ASGI process as HTTP (uvicorn). Consumers in `messaging/consumers.py` and `notifications/consumers.py` (Phase 8). Phase 1 ships the ASGI/routing/auth/origin-validation foundation plus a `PingConsumer` connectivity proof.
- **Channel layer: `InMemoryChannelLayer`** (MVP). Valid because MVP runs **exactly one ASGI process** (documented constraint in system-architecture + deployment). Groups used: `thread_{id}`, `user_{id}`, `order_{id}`.
- Scale-out path (no code changes, settings only): swap to `channels_redis.RedisChannelLayer` when a second ASGI process is needed — Redis then enters the stack for this one purpose (see scalability doc triggers). Auth still via cookie on WS handshake.

## Consumer behavior

- Handshake: origin validated against `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (Phase 1, `config/asgi.py` — the built-in channels validator only knows `ALLOWED_HOSTS`, which breaks our cross-subdomain design); JWT/session auth middleware lands in Phase 2; role/participant checks per group on connect **and** on every receive. Missing/foreign Origin is rejected.
- Chat: receive `{"type":"message.send","body":...}` → **calls messaging service** (same validation/persistence as REST) → broadcast `message.new` to thread group + `notify()` fan-out (personal groups + email-if-offline job). No direct ORM writes in consumers.
- Typing indicator: ephemeral broadcast, never persisted.
- Heartbeat: server ping 30s; clients reconnect with backoff; read receipts batched.

## Why not SSE / polling instead?

SSE was considered (simpler, unidirectional). Rejected because chat needs client→server anyway and Channels gives both directions with the same auth model at no extra infra cost. Polling-only remains the automatic degradation path if WS is blocked by a corporate proxy.

## Cost

Zero: no Redis, no Pusher/Ably, no extra server. The only cost is the documented single-process constraint until scale demands Redis (~$0–10/mo then).
