# Messaging / Chat

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [realtime](../architecture/realtime.md), [security](../architecture/security.md)

## Model

- `Thread`: linked to a **request** and/or an **order**; participants = student + expert (+admin when involved). One thread per context (created lazily on first message). `Thread` carries `context_type` (`request` | `order` | `dispute`) + FK.
- `Message`: sender, body (≤5000 chars, plain text with minimal markdown — linkified, no HTML), optional attachment (via files app), `created_at`, soft-delete (hidden-by-report) flag.
- `MessageReceipt`: per-participant `read_at` (drives unread counts).

## Surfaces

- `/messages` — inbox with threads, unread badges, last message preview.
- Thread page — realtime via WebSocket `/ws/threads/{id}/`; optimistic send; typing indicator (ephemeral via channel layer, not persisted).
- Contextual entry points: request page ("Message"), offer card, order workspace (chat tab).

## Rules

- Participants only (server-enforced on connect **and** send); guests: none.
- Threading exists at every match stage: pre-order (request context) and during order. After an order is created, the request thread links/redirects to the order thread (context switch notice).
- Files in chat: same secure file pipeline as everywhere (purpose `message`, smaller quota).
- **BR-34**: policy banner in thread ("Keep communication and payments on-platform…") + report button per message.
- Moderation: report-driven. Admin can view a thread only for accounts with an open dispute/report — the view action writes an audit log entry (BR-35). MVP has no proactive content scanning; automated contact-info detection is post-MVP.
- Blocked/ended contexts: cancelled/expired requests — threads become read-only (history preserved).

## Realtime behavior (see realtime doc for infra)

- New message → broadcast to thread group; recipients' open thread updates instantly; others get a notification-row update via their personal user group.
- Offline users get in-app notification + email (per preferences).
- Delivery/read: single open tab receipt writes are throttled (batched by frontend, debounced 2s).

## Non-goals (MVP)

Group chats beyond the two parties, voice/video, E2E encryption (platform moderation access is a deliberate product requirement, audited), message search (Postgres FTS on messages is trivial to add later).
