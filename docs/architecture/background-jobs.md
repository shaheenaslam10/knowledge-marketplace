# Background Jobs — Database-Backed Queue (no Redis)

> Status: ✅ foundation implemented in Phase 1 · Last updated: Phase 1 · ADR-0002 (amended)

## Choice: `django-q2` with the ORM (PostgreSQL) broker

Phase 0 planned `django-tasks`; the Phase 1 readiness check found the published
package ships **no database backend or worker** (dummy/immediate backends only) —
see ADR-0002 amendment. Revised choice:

- **django-q2 1.11.x, ORM broker** — tasks live in Postgres (`django_q_task` / `django_q_ormq` tables), executed by the `qcluster` worker process. No Redis, no extra services.
- **Runner:** `python manage.py qcluster` (compose `worker` service; configurable `WORKERS`, `Q_TIMEOUT`, `Q_RETRY`, `Q_MAX_ATTEMPTS` — retry must exceed timeout).
- **Recurring/scheduled jobs:** django-q2's `Schedule` model (`I`/`H`/`D`/`W` cadence), admin-manageable — drives all sweepers from Phase 5+ (auto-approve, TTL expiries, payout runs). No separate cron needed; a cron container remains the fallback.
- **Test mode:** `Q_CLUSTER.sync=True` executes tasks inline (`config/settings/test.py`); the *real* worker pipeline is proven by `manage.py worker_smoke` locally and in CI's compose job.
- **Alternatives rejected:** Celery+Redis (extra infra), Huey (weak Django-ORM story), django-tasks (no DB backend — see above), cron-only (no retries/visibility).

## Task catalog (foundation + planned)

| App | Task | Trigger | Notes |
|---|---|---|---|
| core | `smoke_task` (+ `manage.py worker_smoke`) | manual/CI | Phase 1 pipeline proof |
| accounts | send verification/reset emails | on demand (Phase 2) | retries |
| service_requests | expire stale requests | daily (Phase 4) | BR-08 |
| bidding | expire stale offers | daily (Phase 5) | BR-15 |
| assignments | expire invitations/assignments | hourly (Phase 6) | BR-20/21 |
| orders | auto-approve deliveries, unpaid sweeper, deadline warnings | 15 min/hourly (Phase 7) | BR-24/26 |
| payments | payout sweeper, refund executor, webhook checker | hourly/on demand (Phase 8) | BR-30/31 |
| notifications | email fan-out, digests, prune | on notify/daily (Phase 9) | |
| files | retention cleanup | daily (Phase 10) | |
| audit/ledger | nightly ledger balance check | daily (Phase 8) | charge = commission + credit |

## Design rules

- Tasks are **thin wrappers over app services** (`apps/<app>/tasks.py` → `services.py`) — identical business logic as API/admin paths; views/serializers/tasks never contain business rules.
- Idempotency: every task tolerates re-execution (state checks before effects; money effects guarded by provider refs/ledger dedup).
- Retry policy: `Q_MAX_ATTEMPTS=3`; failed tasks visible in the django-q2 admin (ops surface without extra tooling).
- Observability: structured logs carry request/task ids; long jobs chunked (fan-out batches ~100).
- Concurrency safety: services use `select_for_update` on contended rows (accept/complete/first-accept-wins) — parallel worker processes stay correct.
- Enqueue inside the request transaction where the task depends on committed state changes.

## Why not outsource?

At MVP volumes (≤ a few thousand jobs/day) Postgres handles the queue with sub-second latency and transactional enqueue for free. Redis/Celery would add a moving part and a cost line to solve a problem we don't have yet — revisit at the triggers in [scalability](scalability.md).
