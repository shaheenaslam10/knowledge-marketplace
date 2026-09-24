# Background Jobs — Database-Backed Queue (no Redis)

> Status: ✅ foundation (Phase 1) + orders/payments jobs (Phases 5–7) + notification delivery (Phase 8) · Last updated: Phase 8 completion · ADR-0002 (amended)

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
| assignments | expire invitations/assignments | hourly ✅ (Phase 5) | BR-20/21 |
| orders | auto-approve deliveries (15 min) ✅, unpaid sweeper (hourly) ✅, deadline reminder (hourly) ✅ — Phase 6; overdue flagging ⏳ Phase 9 | BR-23/24/26 |
| payments | payout sweeper (hourly ✅ Phase 7: schedules only, settlement is an operator/gateway action), ledger balance check (nightly ✅ Phase 7); refund executor + webhook state checker ⏳ with a real provider | BR-30/31 |
| notifications | `deliver_notification` (realtime push + email, idempotent) ✅ Phase 8, `prune_notifications` command (90d default) ✅; digests ⏳ with `request_new_matching` emission | on notify / daily | fan-out batches per recipient |
| files | retention cleanup | daily (Phase 9) | |
| audit/ledger | nightly ledger balance check | daily ✅ (Phase 7: `payments.ledger_check_task`) | charge + refund = commission + expert_credit + fee |

## Design rules

- Tasks are **thin wrappers over app services** (`apps/<app>/tasks.py` → `services.py`) — identical business logic as API/admin paths; views/serializers/tasks never contain business rules.
- Idempotency: every task tolerates re-execution (state checks before effects; money effects guarded by provider refs/ledger dedup).
- Retry policy: `Q_MAX_ATTEMPTS=3`; failed tasks visible in the django-q2 admin (ops surface without extra tooling).
- Observability: structured logs carry request/task ids; long jobs chunked (fan-out batches ~100).
- Concurrency safety: services use `select_for_update` on contended rows (accept/complete/first-accept-wins) — parallel worker processes stay correct.
- Enqueue inside the request transaction where the task depends on committed state changes.

## Why not outsource?

At MVP volumes (≤ a few thousand jobs/day) Postgres handles the queue with sub-second latency and transactional enqueue for free. Redis/Celery would add a moving part and a cost line to solve a problem we don't have yet — revisit at the triggers in [scalability](scalability.md).
