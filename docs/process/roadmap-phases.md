# Development Phases, Dependencies & Acceptance Criteria

> Status: Phase 1 ✅ complete · Last updated: Phase 1
> Sequence follows the brief's suggested order (no deviations needed — dependencies confirmed consistent). Each phase: deliverables → acceptance criteria → "runs locally" proof. Doc updates happen **inside** each phase.

## Phase overview

| Phase | Name | Depends on | Core deliverables |
|---|---|---|---|
| 0 | Architecture & Documentation | — | ✅ this docs set, ADRs, review |
| 1 | Project Foundation | 0 | ✅ monorepo scaffolds (backend+frontend), Docker Compose, CI, `.env.example`, health endpoints, seed command, lint/test gates, worker pipeline, OpenAPI, error envelope, gateway interface |
| 2 | Authentication & Roles | 1 | register/verify/login/reset, JWT cookies, role model, admin groups, audit middleware, throttles |
| 3 | Student/Expert Profiles | 2 | profiles, taxonomy, expert application+approval (admin), files app (credentials, avatars), public expert directory API |
| 4 | Requests & Open Marketplace | 3 | ServiceRequest CRUD + integrity attestation, visibility, opportunities board, subjects/tags filters, request files |
| 5 | Bidding & Selection | 4 | offers lifecycle, accept→order creation (orders app core state machine + services), notifications MVP (in-app+email) |
| 6 | Managed Service & Owner Assignment | 4 | triage actions, pool invitations, direct assignments, quote/price guidance |
| 7 | Orders & Delivery | 5 | delivery/revision/approve/auto-approve/cancel flows, order workspaces (FE), timers, order timeline |
| 8 | Payments & Commissions | 7 | Stripe Connect adapter (+manual), PaymentIntent flow, webhooks+idempotency, ledger, refunds, payout sweeper, earnings UI |
| 9 | Messaging & Notifications | 5 | threads+WS realtime, read receipts, notification center+preferences+digests, realtime toasts |
| 10 | Files, Reviews & Disputes | 7,8 | secure downloads (R2 presigned), review flows+aggregates, dispute lifecycle+resolution execution |
| 11 | Admin & Analytics | 6–10 | admin dashboards/KPIs, moderation queues, audit viewer, config UI, reconciliation views, seed polish |
| 12 | Security, Testing & Performance | all | authorization matrix test suite, CSP/headers, dependency audit, E2E pack, perf budgets, checklist gate |
| 13 | Production Deployment | 12 | staging→prod deploy, backups+restore drill, monitoring, legal pages, launch checklist |

Notes on ordering: payments after orders (order must exist to pay for); messaging at 9 (marketplace usable without realtime chat); files core lands in 3 (credentials) with delivery-file extensions in 7/10.

## Per-phase acceptance criteria (summary — detailed gates)

- **Every phase:** backend `pytest` green + frontend `build` green in CI; `docker compose up` gives a working app; README updated; docs updated; committed & pushed with clear message; demo-able via seed data.
- **P2:** matrix tests for roles on existing endpoints; audit rows on admin actions.
- **P5:** open-flow E2E locally: post→offer→accept→order(awaiting_payment) with Stripe test-mode charge (gateway adapter stubbed money-safe) OR manual mode.
- **P6:** managed-flow E2E: submit→triage(approve pool / direct assign)→accept→order.
- **P8:** webhook idempotency tests; ledger balance invariant test; refund+partial refund paths; payout scheduling incl. minimums; expert earnings math verified against commission snapshots.
- **P9:** two-browser chat demo; offline email fallback; preference toggles honored.
- **P10:** cross-account file access denied (tested); review aggregates correct; dispute→partial refund→ledger verified.
- **P11:** owner can operate a full day (vet, triage, resolve, reconcile) from admin alone.
- **P12:** security checklist (docs/architecture/security.md) signed off; coverage gates met.
- **P13:** restore drill passed; uptime monitor green; live order cycle with real (or manual-mode) money.

## Effort shape (relative, not calendar-promising)

Foundation/auth/profiles = groundwork (~25% of effort), marketplace+managed+orders+payments = the product core (~45%), polish surfaces (messaging, files, reviews, disputes, admin) (~20%), hardening+launch (~10%).

---

## Phase 1 — completion record

**Status: ✅ complete** (all acceptance gates: backend tests green, frontend lint/type/unit/build green, compose smoke + worker + seed + e2e verified in CI, docs synced, env-docs CI gate added).

Delivered on top of the plan (all within documented architecture):

| Area | What exists |
|---|---|
| Backend | `config/settings/{base,dev,test,prod}`, `config/urls|api|asgi|wsgi|routing`, `apps/core` (request-id middleware + logging filter, `DomainError` + uniform error envelope, DRF exception handler, cursor pagination, money utils with largest-remainder allocation, `healthz`/`readyz` probes + JSON 404 for `/api/*`, `PingConsumer`, `smoke_task`, `seed_demo`, `worker_smoke`), `apps/payments` (`PaymentGateway` protocol + registry + `ManualGateway` placeholder — **provider-agnostic seam only**) |
| Frontend | `src/app/(public)` layout/home/how-it-works, `src/components/ui` (Button/Card/Badge), `src/features/status` (integration proof card), `src/lib/api` (envelope-aware client), `src/lib/config` (browser vs server API URLs), types, vitest + Playwright setup, robots.ts |
| Infra | `Dockerfile`s (dev/prod targets, non-root), `docker-compose.yml` (db/backend/worker/frontend; clean-checkout `up --build` with baked dev defaults), root `.env.example` synced to docs (CI-gated) |
| Quality | ruff + import-linter contracts (core ⇍ domain; core < payments), `makemigrations --check`, pytest (43 tests: health/schema/envelope/money/gateway/consumers/tasks), vitest (10 tests), Playwright smoke, GitHub Actions: backend / frontend / docs-sync / compose-smoke |
| Realtime | Channels foundation: ASGI ProtocolTypeRouter, auth middleware stack, origin validator (cross-subdomain-aware), `/ws/ping/` proof — no business realtime yet |
| Tasks | django-q2 ORM broker (ADR-0002 amended — see below), `qcluster` worker service, `worker_smoke` end-to-end proof |

**Readiness-check outcome (docs corrected, per the "only real contradictions" rule):**
1. **django-tasks had no database backend/worker** (dummy/immediate only, upstream repo gone) → ADR-0002 amended to **django-q2 ORM broker**; all docs referencing `process_tasks` updated to `qcluster`.
2. **"Channels 5" doesn't exist** (current: 4.3.x) → docs corrected.
3. **Channels' `AllowedHostsOriginValidator` rejects foreign/missing Origin and only knows `ALLOWED_HOSTS`** — would break the documented cross-subdomain deploy → explicit origin allowlist from `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS`.
4. Minor: pytest/import-linter config consolidated in `pyproject.toml` (docs said "pytest.ini/setup.cfg").

**Known Phase 1 limitations (by design):** no auth (default Django user; `accounts.User` lands in Phase 2 **before** any real migration), payments = interface only, no domain models/apps yet, email console-only, frontend displays backend status (integration proof) rather than product features.

### Phase 1 — formal completion record (post-approval sync pass)

- **Implementation commit:** `b71aba3` (linear history: Phase 0 `ae11ac7` → foundation `128edfb` → frontend `8573509` → infra/CI `e68e0f3` → docs sync `b71aba3`; docs-sync pass appended on top).
- **CI:** all four jobs green on the implementation commit — Backend (postgres service: ruff, import-linter, migrations check, pytest+coverage), Frontend (lint/typecheck/unit/build), Docs-sync (env gate), **Compose-smoke** (clean checkout → `docker compose up --build` → healthz/readyz → API root + OpenAPI schema → `worker_smoke` → `seed_demo` → Playwright E2E).

**Acceptance criteria status** (per "Per-phase acceptance criteria — every phase" gates):

| Gate | Status |
|---|---|
| Backend `pytest` green + frontend `build` green in CI | ✅ (43 + 10 tests) |
| `docker compose up` gives a working app | ✅ verified in CI compose-smoke from a clean checkout |
| README updated (setup, commands, troubleshooting) | ✅ |
| Docs updated & synchronized | ✅ (this pass re-verified: no stale `django-tasks`/`process_tasks`/`Channels 5` implementation references; commands match code) |
| Committed & pushed with clear messages | ✅ `b71aba3` |
| Demo-able via seed data | ✅ `seed_demo` (admin account) |
| Lint/contract gates (ruff, import-linter, `makemigrations --check`, env-docs gate) | ✅ all green |

**Local verification (this pass, 2026-09-23 — re-run on the pushed tree):** Postgres up ✓ · 43 backend tests ✓ · `makemigrations --check` clean ✓ · fresh-DB `migrate` ✓ · `seed_demo` ✓ · `qcluster` + `worker_smoke` end-to-end ✓ · `/healthz` `{"status":"ok"}` + `/readyz` `{"status":"ready"}` ✓ · gateway resolves from `PAYMENT_GATEWAY` env ✓ · frontend lint/typecheck/10 unit tests/production build ✓.

**Documentation-sync fixes applied in this pass:** ADR-0003 version reference (Channels 4.3.x — lost in a prior conflict resolution), backend layout (`pyproject.toml` single config source + `docker/` entrypoints), docs index layout (actual Dockerfile locations), prod-hardening vars (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`) added to `.env.example` + environments.md, `MANUAL_PAYMENT_INSTRUCTIONS` **wired** into settings (was documented but unread), `EMAIL_BACKEND_MODE` correctly marked as Phase 9-wired (console backend active now).
