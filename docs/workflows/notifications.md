# Notifications

> Status: ✅ Phase 8 · Last updated: Phase 8 completion · Related: [realtime](../architecture/realtime.md), [background-jobs](../architecture/background-jobs.md)

## Design (implemented — `apps/notifications`)

- Every notification = one `notifications.Notification` row (in-app inbox record, source of truth): recipient, `type`, `title`, `body`, `url` (deep link), `context` JSONB, `read_at`, `emailed_at`, `pushed_at`.
- Single funnel: domain services call `notify(recipient, type, *, title, body, url, context)` (accepts a user or user id). It creates the row and enqueues **one** django-q2 task (`notifications.deliver`); `notify_many` fans out for multi-recipient events.
- Delivery (`deliver_notification`, idempotent via `pushed_at`/`emailed_at` guards): **realtime** push to channel group `user_{id}` (toast/badge if online — best-effort; an unavailable channel layer never fails delivery) + **plain-text email** unless the category preference is off.
- Email transport is the pluggable adapter behind `EMAIL_BACKEND_MODE` (`console` in dev, `smtp`, or `brevo` API — see [environments](../architecture/environments.md)); retries ride django-q2 redelivery (`Q_MAX_ATTEMPTS`), not the adapter.
- Preferences: `NotificationPreference` per user × category (`in_app` always on; only email is toggleable). Categories: `account` (security mail — **email immutable-on**), `marketplace`, `assignments`, `orders`, `messages`, `payments`. API: `GET/PUT /api/v1/me/notification-preferences`; `account` cannot be muted.
- One-click unsubscribe: signed single-purpose token links (`GET /api/v1/unsubscribe?token=…`, public — the token IS the authorization, 60-day max age; renders a confirmation page). `account` tokens resolve to "protected" and never mute security mail.
- Retention: `manage.py prune_notifications [--days 90]` deletes rows older than the cutoff (idempotent; schedule via django-q2 `Schedule` in production).

## Realtime client behavior

- One app-wide socket (`/ws/notifications/`, group `user_{id}`) held by the app shell. A `notification.push` frame triggers a **REST refetch** + a toast; the socket is a hint — the badge/list stay correct via refetch-on-focus/visibility/online plus a slow interval poll with no socket at all.
- Toast queue (max 3, auto-dismiss) with deep link to `url`; bell dropdown = latest 10 with unread count, mark-read / mark-all-read.

## Catalog (delivered in Phase 8 — actual emit points)

| Type | Event | Recipient | Notes |
|---|---|---|---|
| `message_new` | chat message sent | other thread participants | preview + thread deep link |
| `order_paid_activated` | payment confirmed → order active | student + expert | |
| `order_delivered` | delivery submitted | student | |
| `order_revision_requested` | revision requested | expert | |
| `order_approved_completed` | delivery approved | student + expert | |
| `order_cancelled` | order cancelled | student + expert | |
| `order_deadline_warning` | deadline reminder job | expert | |
| `request_new_offer` | offer placed | student | |
| `offer_accepted` | student selects an offer | expert | |
| `invitation_new` | pool invitation broadcast | invited expert | |
| `assignment_new` | direct assignment | expert | |
| `payment_failed` | charge attempt failed | student | |
| `payout_paid` | payout settled | expert | |
| `account_verify_email` / `account_password_reset` | auth flows | user | `account` category — email always on (Phase 2 seams) |

## Catalog backlog (design target — NOT all implemented)

The original MVP catalog below records the full design target. Types **wired in the category map but not yet emitted**: `request_new_matching` (new-matching fan-out + daily digest — the matching loop does not emit it yet), `payout_scheduled`, `order_auto_approve_warning`. All Phase 9+ types (disputes, reviews, refunds beyond the two shipped, admin reports) are unimplemented — treat this backlog as the roadmap of types, not a claim of shipping.

| ID | Event | Recipient | Channels |
|---|---|---|---|
| `account_verify_email` | signup | user | email only |
| `account_password_reset` | request | user | email only |
| `expert_application_received` | apply | admin | email (admin digest) |
| `expert_application_decision` | approve/reject | applicant | email + in-app |
| `request_received_managed` | managed submit | admin queue | in-app (dashboard counter) |
| `request_new_offer` | offer placed | student | realtime + email |
| `request_new_matching` | open request matches expert subjects | expert | realtime + digest |
| `request_approved_pool` | triage | student | email + in-app |
| `request_rejected` | triage | student | email (reason) |
| `offer_accepted` | match | expert + student | email + realtime |
| `offer_declined_withdrawn` | closure | counterpart | realtime (batched) |
| `invitation_new` | pool broadcast | expert | realtime + email |
| `assignment_new` | direct assignment | expert | email + realtime |
| `assignment_expired_declined` | TTL | admin | in-app |
| `order_awaiting_payment` | match | student | email + realtime |
| `order_paid_activated` | payment | both | email + realtime |
| `order_delivered` | delivery | student | email + realtime |
| `order_revision_requested` | revision | expert | email + realtime |
| `order_approved_completed` | completion | both | email + realtime |
| `order_auto_approve_warning` | T-24h before auto-approve | student | realtime + email |
| `order_cancelled` / `order_refunded` | state change | affected | email + realtime |
| `order_deadline_warning` | T-24h | expert | realtime |
| `message_new` | chat message | other participants | realtime + email-if-offline |
| `dispute_opened` | dispute | both + admin | email + realtime |
| `dispute_resolved` | resolution | both | email (outcome summary) |
| `review_new` | review published | expert | realtime + email |
| `review_reply` | expert reply | student | in-app |
| `payout_scheduled` / `payout_paid` / `payout_failed` | payout lifecycle | expert | email + in-app |
| `payment_failed` | charge failure | student | realtime (retry prompt) |
| `admin_report_new` | any report | admins | in-app queue |

Digesting (deferred): the plan to batch high-frequency expert events (`request_new_matching`) into a daily digest email stays a design goal — it activates together with the `request_new_matching` emission (see backlog above). No digest emails exist today.

## Implementation notes (as built)

- Emit points live in domain service layers: `orders` (`_EVENT_COPY` map + `_notify`), `bidding`, `assignments`, `payments`, `messaging` — single funnel, no scattered sends. `send_order_event_email(order_id, event)` remains as a backward-compat shim for tasks queued before deploy.
- Emails are minimal plain text (title/body + deep-link URL) — HTML templates are later polish, not a Phase 8 deliverable.
- Realtime payload is minimal (id, type, title, body, url); clients refetch on click.
- Retention: `manage.py prune_notifications` (default 90 days) — implemented; audit-relevant events live in the audit log, not here.
- Tests: funnel idempotency (q2 sync mode), `account` immutability, preference API shape, unread counts/read-all, unsubscribe round-trip incl. tampered + protected tokens, prune command.
