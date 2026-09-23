# Notifications

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [realtime](../architecture/realtime.md), [background-jobs](../architecture/background-jobs.md)

## Design

- Every notification = one `notifications.Notification` row (in-app inbox record, source of truth).
- Delivery fan-out happens in a background task (`notifications.deliver`): **realtime** push via channel layer group `user_{id}` (toast/badge if online) + **email** (unless disabled per category preference).
- Email sending is itself a queued task with retries; provider is a pluggable adapter (Brevo/Gmail SMTP — see [integrations](../operations/integrations.md)).
- Preferences: `NotificationPreference` per user × category (`in_app` always on, `email` toggleable). Unsubscribe links set email opt-out per category (one-click, tokenized).

## Catalog (MVP)

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

Digesting: high-frequency events for experts (`request_new_matching`) are **batched into a daily digest email** (preference default: digest) to keep email volume sane.

## Implementation notes

- Emit points: domain service layers call `notifications.services.notify(recipient, type, context)` — single funnel, no scattered logic.
- Templates: server-rendered text+HTML (Django templates); i18n-ready (English first).
- Realtime payload is minimal (id, type, title, url); clients fetch detail on click.
- Retention: notifications pruned after 90 days (management command); audit-relevant events live in the audit log, not here.
