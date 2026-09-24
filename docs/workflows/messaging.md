# Messaging / Chat

> Status: ✅ Phase 8 + Phase 9 moderation/dispute context · Last updated: Phase 9 · Related: [realtime](../architecture/realtime.md), [security](../architecture/security.md), [files](files.md), [disputes](disputes.md)

## Model (implemented — `apps/messaging`)

- `Thread`: linked to a **request** or an **order** (dispute context reserved for Phase 9; FK is `SET_NULL` so history survives context deletion). `context_type` (`request` | `order` | `dispute`) + nullable FK + `last_message_at`. One thread per context, created **lazily** on first use.
- **Participants are derived from LIVE context rows, not snapshotted**: an order thread's participants are its student + expert; a request thread's are the owner + every expert holding an offer. The `participants` M2M is synced on access — no stale membership when a context changes.
- `Message`: sender, body (≤ 5000 chars, plain text — stripped, linkified client-side, never HTML), optional attachment (files app, purpose `message`), `created_at`, `is_hidden` soft-delete flag.
- `MessageReceipt`: unique (thread, user) with `last_read_at` — read state is an epoch watermark; unread counts = messages after it, excluding own.

## Surfaces (implemented)

- `/messages` — inbox cards (counterpart, context label, preview, relative time, unread badge, read-only marker) with focus/visibility refetch.
- `/messages/{id}` — realtime thread page: WebSocket with **optimistic send** (pending bubble) when the socket is up, **direct REST send** when it is not; typing indicator (ephemeral); connection-state pill ("Live" / "Offline — messages send over REST and sync on reconnect").
- Entry points: **Message** button on the order workspace, per-offer cards on the request page, and the opportunities (expert) detail page — all call `POST /api/v1/me/threads/open` (lazy create-or-fetch) then route to the thread.
- Notification bell links to the inbox; `message_new` notifications deep-link to the thread.

## Rules (implemented)

- **Participants only** — server-enforced on WS connect (close 4403) *and* every REST call; services are the single authorization path for both transports. Guests: none (WS close 4401).
- Thread access re-derives participants from the live context on every request — a user removed from the context loses access immediately.
- **Ended contexts become read-only** (history preserved, sends rejected with `thread_read_only`): order `cancelled`; request `cancelled|expired`.
- Files in chat: purpose `message` (pdf/png/jpg/jpeg/txt ≤ 5 MB, private storage, content-sniffed, deduped). Upload-first, then attach by id (string ids accepted over WS). Download authorization = **thread-participant traversal inside the files sidecar** — only users who are participants of a thread whose messages reference the file can fetch a signed URL.
- Empty messages rejected; attachment-only messages allowed (body may be empty when a file is present).

## REST API (implemented)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/me/threads` | inbox cards with per-thread unread counts |
| POST | `/api/v1/me/threads/open` | `{context_type, order_id \| request_id}` → thread id (lazy create); participant-checked |
| GET | `/api/v1/me/threads/{id}` | thread + full message history; **marks the thread read** |
| POST | `/api/v1/me/threads/{id}/messages` | `{body, attachment_id?}` — REST send/fallback |
| POST | `/api/v1/me/threads/{id}/read` | explicit read receipt |
| POST | `/api/v1/me/messages/{id}/report` | `{reason, details?}` — BR-34 report button (Phase 9) |

## Realtime behavior (see [realtime](../architecture/realtime.md) for infra)

- `message.send` over WS → the consumer calls the **same service** as REST → persisted → `message.new` broadcast (shared wire payload, attachments included) to the thread group. Domain errors return to the sender only (`message.error`).
- Every message fans out `message_new` notifications to the other participants (preview + thread deep link) through the standard notification funnel — realtime toast if online, email per preferences otherwise.
- Typing: ephemeral broadcast, never persisted, not echoed to its author.
- Read receipts: opening the thread (REST GET) marks read; the WS `read` action covers live sessions. UI batches are naturally debounced by the refetch cycle.
- WS is a **refetch hint, never the source of truth** — the thread page re-fetches via REST on socket (re)connect, window focus, and `online` events; Postgres + REST responses are always authoritative.

## Moderation (BR-34/35 — implemented Phase 9)

- **Report a message:** any thread participant calls `POST /api/v1/me/messages/{id}/report` (`{reason: off_platform|abuse|integrity|spam|other, details?}`) → `MessageReport` (one **open** report per message+reporter; re-reporting while open is idempotent). Audited (`messaging.message_reported`). Staff see reports in Django admin (read-only); closing a report is a staff action (Phase 10 adds the queue UI).
- **Grounds-gated admin thread view:** `admin_view_thread(thread, admin)` is staff-only and now **requires moderation grounds** — an open dispute on the thread's order (via `Order.has_open_dispute`) or an open report inside the thread. Without grounds it raises `no_moderation_grounds`; with grounds it writes an audit row (`moderation-inspection`). Django admin exposes threads/messages read-only, with `is_hidden` the only toggle.
- **Dispute-context threads (Phase 9):** opening a dispute creates/reuses the order thread with `context_type="dispute"` (label "Dispute — Order N"; participants derived from the order). It stays writable while the dispute is open and becomes read-only at resolution; the WS + REST-fallback transport is inherited unchanged.
- **Policy banner (BR-34):** the thread UI shows the on-platform-communication notice (keep conversation and payments on-platform; off-platform deals are bannable). *FE surface pending — see Phase 9 FE tasks.*

## Non-goals (MVP)

Group chats beyond the two parties, voice/video, E2E encryption (platform moderation access is a deliberate product requirement, audited), message search (Postgres FTS on messages is trivial to add later). Chat-based deadline extension: the **service exists** (Phase 9 `orders.propose_deadline`/`respond_deadline_proposal`, used by the order workspace); a dedicated in-chat proposal card remains backlog (decision recorded in the Phase 9 handoff).
