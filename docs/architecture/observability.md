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
