# Performance

> Status: Phase 11 baseline · Enforced in CI (backend + frontend jobs) · Last updated: Phase 11

This document records the performance budgets the platform commits to, where they are
**enforced** (not just observed), and the measured Phase 11 snapshot. Optimization rule for
future work: optimize the implementation first (queries, indexes, code-splitting); change a
budget only through a documented ADR when a real product decision forces it.

## Stack constraints (fixed)

Next.js + Django/DRF + PostgreSQL + django-q2 (ORM queue) + Channels (InMemory layer),
free-tier-first: **no Redis, no Celery, no Elasticsearch, no paid SaaS, no CDN-assumption**.
Performance work must stay within this stack (see ADRs 0001–0014).

## Backend — query-count budgets

Enforced by `backend/apps/portal/tests/test_query_budgets.py` (runs in the backend CI job;
a regression fails the build):

| Surface | Budget | Guard |
| --- | --- | --- |
| Request feed (opportunities/home) | ≤ 12 queries | `test_request_feed_query_budget` |
| Expert directory | ≤ 12 queries | `test_expert_directory_query_budget` |
| Message thread list | ≤ 14 queries | `test_thread_list_query_budget` |
| Order detail (workspace) | ≤ 14 queries | `test_order_detail_query_budget` |
| Admin/portal KPI dashboard | ≤ 40 queries | `test_kpi_dashboard_query_budget` |

Rules the budgets encode: list endpoints `select_related`/`prefetch_related` their
relations (no N+1), aggregations happen in PostgreSQL (no per-row Python), and pagination
is cursor-based (`DefaultCursorPagination`). Adding an endpoint that renders relations
must extend this test file with a budget.

## Frontend — bundle budgets

Enforced by `frontend/scripts/check-bundle.mjs` after every production build
(`npm run build && node scripts/check-bundle.mjs` — runs in the frontend CI job):

| Route class | First Load JS budget |
| --- | --- |
| Marketing `/` | ≤ 180 kB |
| App routes (`/requests`, `/opportunities`, `/offers`, `/account`, `/onboarding`, `/expert*`) | ≤ 220 kB |

The design system is the shared-chunk strategy: UI primitives live in
`src/components/ui` and are code-split per route; heavy views (workspace, portal) import
feature modules lazily rather than through the root layout.

### Measured snapshot (Phase 11, production build)

- `/` → 159 kB (budget 180) · heaviest app route `/expert/apply` → 121 kB (budget 220)
- Portal routes land between 116–172 kB first-load (admin surfaces are not public paths
  but stay well under the app budget).
- `bundle-check: all budgets respected` — green.

## Runtime performance decisions

- **django-q2 with the ORM broker**: background work (verification email, notifications,
  scheduled jobs) leaves the request path; the database is the queue, so no extra infra.
  `worker_smoke` guards worker liveness in CI.
- **Channels InMemory layer**: dev/single-process realtime. Documented scaling limit —
  horizontal realtime scaling would require the (forbidden-for-now) Redis layer (ADR-0004).
- **PostgreSQL indexes**: every high-traffic filter column is indexed by migration
  (`db_index` / explicit `AddIndex`); no blind indexes — each one maps to a measured or
  contractually required lookup (see `docs/architecture/database.md`).
- **File uploads** stream to storage with size/type validation before persistence
  (`docs/architecture/files-storage.md`); downloads are grant-gated redirects, not
  server-side streams on the hot path.

## Accessibility & responsiveness interaction

WCAG 2.1 AA conformance (Phase 11) and the responsive rules in
`docs/design/design-system.md` are treated as performance constraints too: reduced-motion
profiles disable animations instead of pausing them, and motion durations are tokenized so
low-power devices are not locked into long transitions.

## How to verify locally

```bash
# backend budgets
cd backend && DATABASE_URL=... python -m pytest apps/portal/tests/test_query_budgets.py

# bundle budgets
cd frontend && npm run build > /tmp/next-build.log && node scripts/check-bundle.mjs /tmp/next-build.log
```
