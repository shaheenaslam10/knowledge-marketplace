# Background Jobs — Database-Backed Queue (no Redis)

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · ADR-0002

## Choice: `django-tasks` (DB-backed)

The officially-maintained Django task framework (merged from `django-tasks` under the Django ecosystem umbrella, API aligned with the DEP 0004 "database background tasks" spec). Tasks are rows in Postgres (`django_tasks` tables), executed by worker processes; retries, priorities and states included.

- Runner: `python manage.py process_tasks` (worker container; concurrency 4 threads).
- Enqueue: `tasks.enqueue(task_fn, args...)` inside the request transaction where possible (row created atomically with the state change → no lost work).
- **Recurring/scheduled jobs**: `django-tasks` scheduled tasks (cron-like config in code) drive all sweepers.
- Alternatives rejected: Celery+Redis (extra infra, heavy for MVP), Huey (needs Redis for prod-grade), django-q2 (DB broker OK but less standard/actively-aligned than django-tasks), cron-only (no retries/visibility).

## Job catalog

| App | Task | Trigger | Notes |
|---|---|---|---|
| accounts | send verification/reset emails | on demand | retries 3× backoff |
| service_requests | expire stale requests | daily | BR-08 |
| bidding | expire stale offers | daily | BR-15 |
| assignments | expire invitations/assignments | hourly | BR-20/21 |
| orders | auto-approve deliveries (72h) | every 15 min | BR-24 |
| orders | cancel unpaid orders (72h) + reminders (24h) | hourly | |
| orders | deadline warnings (T-24h) | hourly | |
| payments | payout sweeper | hourly | BR-30 |
| payments | webhook non-final PI checker | nightly | reconciliation aid |
| payments | refund/transfer executor | on demand (dispute/cancel) | |
| notifications | email fan-out (per notification) | on notify | retries; digest bundler daily |
| files | retention cleanup (30d/12m rules) | daily | |
| notifications | notification prune (90d) | weekly | |
| audit | integrity spot-check (ledger balance check) | daily | charge = commission+credit |

## Design rules

- Tasks are **thin wrappers over app services** (`tasks.py` → `services.py`) — identical business logic as API/admin paths.
- Idempotency: every task tolerates re-execution (state checks before effects; payment effects guarded by Stripe object ids/ledger dedup).
- Retry policy: default 3 attempts, exponential backoff; poison tasks end `failed` and appear in the admin task queue view (django-tasks admin integration) — ops sees failures without extra tooling.
- Observability: task runs logged with structured context; long jobs chunked (e.g., email fan-out batches of 100).
- Concurrency safety: services use `select_for_update` on contended rows (order accept/complete, invitation first-accept) so thread-parallel workers stay correct.

## Why not outsource?

At MVP volumes (≤ a few thousand jobs/day) Postgres handles the queue with sub-second latency and gives transactional enqueue for free. Redis/Celery would add a moving part and a cost line to solve a problem we don't have yet — revisit at the triggers in [scalability](scalability.md).
