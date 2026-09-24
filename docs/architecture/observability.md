# Observability — Logging, Error Handling, Audit Logs, Monitoring

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Error handling (backend)

- Central DRF exception handler → envelope `{"error":{"code","message","details"}}`; stable machine codes (`offer_already_accepted`, `order_not_payable`, …).
- Domain layer raises typed `DomainError` subclasses; views stay clean; unexpected exceptions → 500 with **correlation id** (`X-Request-ID`, generated per request, echoed in response + logs).
- Webhooks: never 500-retry-storm — catch, store `WebhookEvent(status=failed)`, alert, replay manually.
- Tasks: retries with backoff, terminal `failed` visible in admin.
- Frontend: API client maps codes → friendly messages; global error boundary + toast; retry only on idempotent GETs.

## Logging

- Structured JSON logs (python-json-logger) to stdout; the deploy stack ships them (docker json-file with rotation; upgrade path: Loki free self-host — see costs).
- Line schema: ts, level, logger, request_id, user_id, app, event, context (scrubbed — no tokens/cookies/passwords).
- Levels: DEBUG dev only; INFO business events (order_state_changed, payment_succeeded with ids); WARNING recoverable (retry, webhook signature fail); ERROR needs attention.
- Business event log is the debugging backbone (grep by order/number or user id across services).

## Audit logs (BR-42) — distinct from logging

`audit.AuditLog` rows = who did what to which object, when, from where, with before/after. Written by `audit.services.log()` from: admin actions (all), money mutations, expert approval/rejection, moderation, dispute actions, file-access grants to admins, thread views by admins. Insert-only (no update/delete even in admin — model enforced). Viewer: Django admin changelist with object/actor/period filters; export action (CSV) for incident reports.

## Monitoring & alerting (near-zero cost)

| Signal | Mechanism | Alert route |
|---|---|---|
| Uptime | free uptime monitor (UptimeRobot free tier) on `/healthz` | email |
| Errors/exceptions | Sentry free tier (5k events/mo), optional | email |
| Job failures | nightly `/readyz`-style ops check + admin queue counters; `manage.py ops_report` command prints stuck webhooks, failed tasks, payout failures | email digest (cron) |
| DB health | `/healthz` (conn + migration state) monitor | email |
| Money sanity | daily ledger balance-check task (charge = commission + credit) | email to admin |

Deliberately absent in MVP: APM tracing, metrics stacks (Prometheus/Grafana), pagerduty — documented upgrade path in costs; structured logs + Sentry cover diagnosis at this scale.


---

## Phase 10 — Operations portal & KPI dictionary (implemented)

The portal serves the same signals as this document: structured logs stay in stdout, audit rows stay append-only, and the ops surfaces are **read-only aggregations + service-backed moderation/config actions**. `manage.py ops_report` remains the CLI path. Live surfaces: `/portal` (dashboard, ranges today/7d/30d/custom — UTC, `[from,to)`), `/portal/moderation`, `/portal/disputes`, `/portal/finance` (reconciliation), `/portal/audit`, `/portal/users`, `/portal/config`; API under `/api/v1/ops/*` (staff-only).

### KPI dictionary (every metric names its source; ranges evaluated server-side in UTC, `[from, to)`)

| Group | Metric | Definition (exact source) |
|---|---|---|
| Marketplace | `total_requests` | count `service_requests.ServiceRequest` created in range |
| Marketplace | `open_requests` | status `open` at query time |
| Marketplace | `matched_requests` | status `matched` at query time (plus `in_progress` if the order started) |
| Marketplace | `completed_orders` / `cancelled_orders` / `active_orders` | `orders.Order` by status; created_at in range for the first two, current-state for the third |
| Marketplace | `request_to_match_rate` | matched+in_progress+completed-order requests / total requests (created_at in range) |
| Financial | `gmv_minor` | `payments.Payment` `amount_minor` where status `succeeded\|refunded\|partially_refunded` and paid_at in range (= money charged) |
| Financial | `commission_minor` | `payments.LedgerEntry` entry_type `commission`, created_at in range |
| Financial | `expert_payable_minor` | current `expert_credit` balance minus scheduled/in-transit payouts (ledger-source, query-time) |
| Financial | `refunds_minor` | `payments.Refund` rows (any status) processed in range |
| Financial | `payouts` | `payments.Payout` counts by status (query-time) |
| Financial | `take_rate` | commission_minor / gmv_minor (realized, in-range) |
| Quality | `avg_rating` / `review_count` | `reviews.Review` published, created_at in range (plain in-range average; profile aggregates use BR-39 weighting separately) |
| Quality | `dispute_count` / `dispute_rate` | `disputes.Dispute` created in range; rate = disputes / completed orders in range |
| Quality | `dispute_outcomes` | resolved disputes in range grouped by `outcome` |
| Quality | `revision_rate` | deliveries with `revision_number > 0` / deliveries in range |
| Communication | `message_count` | `messaging.Message` created in range (excluding hidden) |
| Communication | `report_count` | `messaging.MessageReport` created in range (+ open count at query time) |
| Communication | `notification_delivery` | `notifications.Notification` pushed_at/emailed_at counts in range (delivery/failure = persisted guards only) |

Trend series: daily `orders`, `gmv_minor`, `disputes` for the selected range (single grouped query per series).
