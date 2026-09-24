# PROJECT HANDOFF — operational continuation document

> **Permanent project rule:** this file is the single continuation document for any new AI agent or developer (Arena, ChatGPT, Gemini, human). It is updated at every phase completion and whenever a plan/architecture/business-rule change is discovered — **before or with** the implementation, never silently. Detailed evidence lives in the linked documents; this file stays a fast, accurate map.
>
> Last updated: **2026-09-24 (Phase 10 completion)**

---

## START HERE

```text
Current phase:      Phase 10 — Admin & Analytics ✅ COMPLETE
Latest commit:      Phase 10 completion commit (this one — roadmap record + handoff).
                    Feature chain: dfefc87 (docs checkpoint) → a031fe1 (docs-first plan)
                    → 6e637cb (backend: ops API, PlatformConfig, moderation services,
                    seed funnel) → c2471e6 (FE portal: dashboard/moderation/disputes/
                    audit/finance/users/config) → 64f75d9 (docs sync)
Next phase:         Phase 11 — Security, Testing & Performance  (see "NEXT PHASE" below)
Read first:         docs/process/roadmap-phases.md (Phase 10 completion record + Phase 11 row),
                    docs/architecture/security.md, docs/product/user-roles.md (authorization
                    matrix), docs/workflows/admin-journey.md (portal surface matrix)
First implementation task:  authorization-matrix test suite across ALL roles × ALL endpoints
                    (Phase 10 /ops surfaces included), then CSP/security headers
Do not start:       Phase 12 (production deployment), Stripe activation (credentials do not
                    exist; seam stays), Redis (prohibited)
```


---

## Current project state

| Field | Value |
|---|---|
| Project | Hybrid Expert Marketplace (`knowledge-marketplace`) — three-experience marketplace: open bidding, managed service, one shared order/payment pipeline |
| Current phase | **Phase 10 — Admin & Analytics ✅ complete** |
| Next phase | **Phase 11 — Security, Testing & Performance** (scope below) |
| Branch | `arena/01a0cd90-knowledge-marketplace` (all work happens here) |
| Latest commit | Phase 10 completion commit (roadmap record + this handoff); feature chain `dfefc87` → `a031fe1` → `6e637cb` (backend) → `c2471e6` (FE) → `64f75d9` (docs sync) |
| Latest verified CI | run **`36025183020`** — ✓ 4/4 on `e21a4b5` (Frontend · Docs sync · Backend · Compose smoke; prior: `36007194246` ✓ 4/4 on `f0bff4b`) |
| Working tree | Clean & synced with origin at the completion commit; verify with `git status` + `git fetch && git log origin/arena/01a0cd90-knowledge-marketplace -1` on takeover |
| Test baseline | backend pytest **340 passed** (portal 14: staff authz incl. support-vs-admin config writes, KPI math, moderation idempotency, reconciliation detection); frontend lint/typecheck/vitest **68**/build/bundle-budgets green; ruff+format clean; import-linter 3 kept/0 broken; `makemigrations --check` clean; env-docs gate green |
| Roadmap | `docs/process/roadmap-phases.md` — the ONE source of truth for what exists (header + per-phase completion records; Phase 10 record has the as-built details + deferred list) |

---

## Completed phases

Detailed scope, acceptance gates and per-phase records live in `docs/process/roadmap-phases.md` (completion records) — not duplicated here.

| Phase | Delivered (concise) | Key commits | ADRs | Deferred / notes |
|---|---|---|---|---|
| 0 — Architecture & Docs | Full docs set, business rules BR-01..35, ADR baseline | see roadmap | ADR-0001..0012 | — |
| 1 — Foundation | Monorepo, Docker Compose, CI, error envelope, health, seed, worker pipeline, OpenAPI, `PaymentGateway` interface | see roadmap | ADR-0002 **amended** (django-q2, not django-tasks), ADR-0003 (Channels+in-memory layer) | real WS consumers → Phase 8 |
| 2 — Auth & Roles | Email user, JWT in httpOnly cookies (rotation, reuse detection), roles, admin groups, audit middleware, throttles | see roadmap | ADR-0004 (+ implemented refinements recorded in it) | token-family tracking documented as future hardening |
| 3 — Profiles | StudentProfile, taxonomy, expert application→approval, files app (credentials/avatars), public directory | see roadmap | ADR-0012 | — |
| 3.5 — Design & Product | Three-experience structure, design system + motion + component selection | see roadmap | ADR-0013, ADR-0014 | — |
| 4 — Marketplace + Open Bidding | ServiceRequest lifecycle (+integrity attestation), opportunities feed, blind offers, **transactional selection → Order**, request files, bundle budget gate | `d8fe925`, `debb945`, `9e46c46` | ADR-0008, ADR-0009, ADR-0015 (domain boundaries, selection, order factory) | — |
| 5 — Managed Service | Owner triage (Django admin), pool invitations (first-accept-wins), direct assignments, convergence into the SAME Order | `5fbd530`, `55f2417`, `8cf1d31`, `690b231` | ADR-0015, ADR-0010 | — |
| 6 — Orders & Delivery | One order state machine for all three sources; delivery/revision loop (2 open / 3 managed), 72h auto-approval, cancellation, `/orders` + `/orders/[id]` workspace, OrderEvent timeline | `06808d0`, `9c41416`, `556b5cf`, `3421fc3` | order-lifecycle doc (BR-22..28) | `orders.auto_cancel_overdue` → Phase 9; chat deadline proposal dropped from Phase 8 scope (backlog) |
| 7 — Payments & Commissions | Provider-agnostic payment domain: Payment/Refund/Payout/LedgerEntry/WebhookEvent; ONE confirmation path (row-locked, amount-parity, atomic ledger + signal → order activation); webhooks idempotent; earnings/payouts; student payment UX; read-only financial admin | `111972b` (docs-first), `7fed70d`, `b505d1a`, `08b7c40` | **ADR-0005 amendment** (payments lower layer, Stripe = non-functional seam), ADR-0009 | **Stripe deferred until credentials + jurisdiction verification** (checklist in payments.md); refund automation of disputes → Phase 9; provider fee entries reserved for real rails |
| 8 — Messaging & Notifications | Persistent threads (request/order contexts, live participant derivation), REST + WS on ONE service path, read receipts, chat attachments (message purpose, participant-only downloads), notification funnel across all domain events (q2 task: best-effort realtime push + plain-text email), per-category preferences (account immutable), public one-click unsubscribe, `prune_notifications` command, bell/toasts + `/messages` inbox + thread page + entry points | `b66d381`, `ff85028` | ADR-0003 held (InMemory layer, no Redis); ADR-0011 email adapter implemented (`EMAIL_BACKEND_MODE`) | **Deferred:** `request_new_matching` fan-out + daily digest, order-group WS hints; chat deadline proposal (dropped) |
| 9 — Files, Reviews & Disputes | `FILE_STORAGE=r2` adapter (django-storages, private bucket, 5-min presigned GET after `grant_download`; local stays free default); `dispute_evidence` purpose + `legal_hold` + `files.retention_cleanup` q2 job; reviews (student-only per completed order, edit-until-reply, single immutable expert reply + private student rating, staff hide) with BR-39 recency-weighted aggregates into `ExpertProfile`; disputes (BR-40 window, services-only state machine, evidence, dispute threads, Django-admin resolve) whose money outcomes reuse Phase 7 `issue_refund`/payout services — **zero direct ledger writes**; payout freeze via `Order.has_open_dispute` (schedule/settle/sweeper, race-tested); moderation hooks (`MessageReport` + report route, BR-35 grounds-gated audited thread view, FE policy banner + report dialog); backlog absorbed: overdue flagging job, deadline proposals, retention cleanup | `fd90947`, `b8323d4`, `07e8d04`, `8b19135` | ADR-0006 implemented as specified (storage = env swap); layers extended (disputes > reviews > messaging) | **Deferred:** moderation queue/dashboard + analytics → Phase 10; `request_new_matching` fan-out + digest; chat deadline-proposal card (services exist; UI non-goal); order-group WS hints; `expert_rating_of_student` stays private |

| 10 — Admin & Analytics | Operations portal `(portal)`: KPI dashboard (server-side Postgres aggregation, UTC ranges, KPI dictionary in observability.md), moderation report queue (audited dismiss/confirm-hide via the messaging service), dispute triage queue (resolution deep-links Django admin), audit viewer, financial reconciliation (read-only, ledger-identity reuse), users overview, PlatformConfig singleton + audited admin-only config UI, seed operations funnel | `6e637cb`, `c2471e6`, `64f75d9` | ADR-0010 implemented (portal/admin split documented in admin-journey.md) | Recharts deferred (bundle budget — SVG micro-charts); account warning/suspension service not built (business-rule change, recorded); CSV export post-MVP |

**Major plan changes so far** (all documented before/with implementation): django-tasks → django-q2 (ADR-0002 amendment); payments layering inversion via domain signal (ADR-0005 amendment); no PaymentAttempt/Transaction tables; ledger identity formalized; payout settlement manual-by-design; Stripe explicitly not production-ready until the checklist in `docs/workflows/payments.md` is verified.

---

## Current architecture snapshot

Authoritative details live in `docs/architecture/*` — this is the map only.

| Area | Current state | Source |
|---|---|---|
| Frontend | **One Next.js (App Router, TS, Tailwind v4 CSS-first tokens) app with three experiences** — `(portal)` operations surfaces live since Phase 10 — `(marketing)` / `(app)` / `(portal)` route groups, ESLint experience boundaries | ADR-0013, `docs/architecture/frontend.md`, `docs/architecture/web-experiences.md` |
| Backend | **One Django + DRF modular monolith**; domain apps with acyclic imports (import-linter in CI); business logic only in `services.py` (views/serializers/tasks/admin are thin); uniform error envelope | ADR-0001, `docs/architecture/backend.md` |
| Database | **PostgreSQL source of truth**; BigInteger minor-unit money (ADR-0009); UUID public ids (ADR-0008); migrations are append-only history | `docs/architecture/database.md` |
| Background jobs | **django-q2 + ORM broker on PostgreSQL** (no Redis/Celery); idempotent tasks = thin wrappers over services; schedules are ops setup via admin; shipped jobs: assignments expiry, orders auto-approve/unpaid-sweeper/deadline-reminder/**overdue-flagging**, payments payout-sweeper/ledger-check, **files retention-cleanup** | ADR-0002, `docs/architecture/background-jobs.md` |
| Realtime | Channels on the single ASGI process, `InMemoryChannelLayer`, origin-validated WS handshake, JWT-cookie auth; `ThreadConsumer` + `NotificationConsumer` live since Phase 8 (WS = **refetch hint, never source of truth**; offline = REST send + refetch-on-focus/reconnect + poll) | ADR-0003, `docs/architecture/realtime.md` |
| Payments | **Provider-agnostic** `PaymentGateway` registry via `PAYMENT_GATEWAY` env; **ManualGateway active** (dev/test + operator-confirmed fallback, simulated webhooks HMAC-signed); **StripeGateway = registered non-functional seam, no SDK dependency**; ledger = financial source of truth (identity `charge + refund == commission + expert_credit + fee`) | ADR-0005 (+ Phase 7 amendment), `docs/workflows/payments.md` |
| Storage | Local disk in dev → Cloudflare R2 in prod (presigned, permission-checked); delivery/order_attachment purposes private, participant-traversal access | ADR-0006, `docs/architecture/files-storage.md`, `docs/workflows/files.md` |
| Authentication | Email+password, JWT access/refresh in httpOnly cookies, rotation + reuse detection, per-request `is_active` check, custom-header CSRF, Argon2id | ADR-0004, `docs/architecture/authentication.md` |
| Domain modules | `accounts`, `experts`, `service_requests`, `bidding`, `assignments`, `orders` (+Delivery, OrderEvent), `payments`, `files`, `taxonomy`, `audit`, `core`, `seed` — layers enforced top-down in `backend/pyproject.toml` | `docs/architecture/system-architecture.md` |
| Design system | Normative docs: `docs/design/design-system.md`, `motion-system.md`, `component-selection.md` (tokens, adapted kit, transform/opacity-only motion, reduced-motion collapse) | ADR-0014 |

---

## Active business decisions — do NOT accidentally reverse

| Decision | Why it is locked | Source |
|---|---|---|
| Modular monolith, service-layer seams, import-linter contracts | owner mandate; extraction later = freeze a service interface | ADR-0001 |
| ONE repository (frontend/backend/docs/scripts) | owner mandate | ADR-0001 |
| ONE Next.js app, three experiences by route groups | no marketing rebuild, shared design system | ADR-0013 |
| ONE Django backend, one Order model/pipeline (open_bid + managed converge via `create_order_for_request`) | no second order model, no second payment pipeline | ADR-0015, `docs/workflows/order-lifecycle.md` |
| PostgreSQL source of truth; integer minor units, no floats | money correctness | ADR-0009, `apps/core/money.py` |
| django-q2 + ORM broker; **NO Redis for MVP** (incl. Phase 8 messaging) | free-first cost principle; scale-out is settings-only | ADR-0002, ADR-0003 |
| WS = refetch hints only; DB is source of truth; offline/polling fallback required | single-ASGI-process constraint | ADR-0003, realtime.md |
| Provider-agnostic payments; **no Stripe SDK/credentials required**; ManualGateway = dev/test rails; Stripe activation blocked on the payments.md checklist | owner has no Stripe credentials yet; jurisdiction unconfirmed | ADR-0005 amendment, `docs/workflows/payments.md` |
| Commission snapshots immutable after booking (15% open / 20% managed) | BR-17/22 | `apps/payments/config.py`, payments.md |
| Financial records append-only; admin read-only; money changes only via audited services | BR-32/33 | payments.md, `docs/architecture/security.md` |
| Expert access requires application + admin approval; suspended experts excluded | product rule | ADR-0012 |
| Academic-integrity rules BR-10..14 authoritative | owner mandate | `docs/product/business-rules.md` |
| On-platform communication + report-driven moderation (BR-34/35) | BR-34 participant-only chat shipped in Phase 8; report button/policy banner + dispute linkage land in Phase 9 (recorded as deferred, not skipped) | `docs/product/business-rules.md` |
| Docs-as-source-of-truth; Discover → Document → Implement → Test → Update handoff → Commit → Push | process rule | `docs/process/development-workflow.md`, this file |

---

## NEXT PHASE

### Phase 11 — Security, Testing & Performance

**Goal.** Convert the implicit security posture into an explicit, tested one and close the pre-production hardening gaps: a full authorization-matrix suite (every role × every endpoint), CSP/security headers, dependency audit, the E2E pack, and performance budgets — the last engineering phase before deployment.

**Starting point (what exists).**
- Server-side authorization everywhere (services are the single gate); Phase 10 `/ops/*` surfaces staff-gated (support reads/moderates, admin config-writes — tested).
- Existing suites: backend 340 (per-app authz incl. cross-account files, IDOR-style 404 masks, moderation grounds), FE 68; CSP/headers NOT yet enforced (deployment.md lists the intent).
- Threat notes live in `docs/architecture/security.md`; the role matrix in `docs/product/user-roles.md` is the test spec.

**First tasks (ordered checklist).**
1. Docs-first: finalize the authorization-matrix table (role × endpoint × expectation) as a test plan doc section, then implement `test_authorization_matrix.py` generating parametrized cases across accounts/experts/requests/bidding/assignments/orders/payments/messaging/reviews/disputes/files/ops.
2. Security headers: CSP (report-only → enforce), HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy — config via env, verified in prod settings tests.
3. Dependency audit: `pip-audit` + `npm audit` in CI (fail on high/critical; document suppressions).
4. E2E pack: Playwright happy-paths over seeded demo data (student funnel, expert funnel, dispute+moderation, portal staff read).
5. Performance: query-count budgets on the hot paths (order detail, inbox, KPI dashboard — `assertNumQueries`), bundle budgets already enforced; add slow-query logging note for ops.
6. Rate-limit review (DRF throttles already exist) + JWT reuse-detection tests already exist — extend to /ops surfaces.
7. Docs sync + handoff update in the same phase (protocol below).

**Required files/docs to read first.**
- `docs/process/PROJECT-HANDOFF.md` (this file) + `docs/process/roadmap-phases.md` (Phase 11 row, Phase 10 record + deferred list)
- `docs/architecture/security.md`, `docs/architecture/testing.md`, `docs/product/user-roles.md`, `docs/architecture/deployment.md` (headers intent)
- `backend/pyproject.toml` (import-linter), `.github/workflows/ci.yml` (gates to extend)

**Do not implement yet.**
- Production deploy (staging→prod, backups drill, monitoring, legal pages) → **Phase 12**
- Stripe activation (needs credentials + verified checklist in payments.md) → blocked until owner verification
- Redis, Elasticsearch, warehouses (prohibited by cost/architecture rules)

**Acceptance criteria.** Roadmap Phase 11 row + the standard gates: backend pytest all green **including the authorization-matrix suite**, FE lint/typecheck/vitest/build green, Playwright pack green, headers verified in tests, dependency audit clean (or documented), ruff/format/lint-imports clean, `makemigrations --check` clean, env-docs gate green, CI 4/4 on a clean checkout, docs + this handoff updated in the same phase.

**Expected GitHub workflow.** Work on `arena/01a0cd90-knowledge-marketplace` only; logical commits (docs-first matrix → headers → audit → e2e → perf → docs sync); full suite + gates before every push; push and watch CI; update `PROJECT-HANDOFF.md` + roadmap in the completion commit; report hashes and CI run.

---

## When taking over this project (continuation protocol)

1. Read `docs/process/PROJECT-HANDOFF.md` (this file) — START HERE box first.
2. Read `docs/process/roadmap-phases.md`: header status + the current-phase completion record + the next-phase row.
3. Read the architecture/ADR documents listed in the NEXT PHASE section.
4. Inspect the branch and latest commit: `git status`, `git log --oneline -5`, compare with the "Latest commit" above.
5. Verify where possible: CI run for the tip commit (`gh run list`), backend `pytest`, frontend `npm run lint && npm run typecheck && npm run test`.
6. Compare code against this handoff and the roadmap; if they disagree, **the repository is the source of truth** — reconcile the handoff first (document the discrepancy), then proceed.
7. Only then begin implementation, starting at the NEXT PHASE checklist. **Do NOT start by redesigning the architecture** — refinements require an ADR update first (ADR-0001 boundary).

---

## Handoff update protocol (permanent rule)

Update this file whenever any of these change: phase status · roadmap · architecture · business rules · database model · API · infrastructure · payment-provider assumptions · design system · major UX decisions · deferred scope · next-phase plan. The same applies whenever any agent discovers the original plan was technically wrong.

**Required sequence:** Discover → Document change (docs/ADR) → Implement → Test → Update handoff → Commit → Push. Never modify the plan silently.

**End of every phase (part of acceptance criteria):** update this file (state, completed-phase row, next-phase section with exact first tasks), update the roadmap completion record, update detailed docs, record exact commit hashes + CI run, commit and push the documentation together with the phase completion.

---

## Sandbox/ops notes for agents (non-normative, verified working)

- Backend: `cd backend && DATABASE_URL=postgres://hem:hem@127.0.0.1:5433/hem_test /home/user/.venv/bin/python -m pytest` (pg16 on 127.0.0.1:5433, trust auth; dev DB `hem_dev` seeded via `manage.py seed_demo`, demo passwords documented in the seed command).
- Frontend: `cd frontend && npm run lint | typecheck | test | build` + `node scripts/check-bundle.mjs <build-log>`.
- Docs gate: `python3 scripts/check_env_docs.py` (every `.env.example` var must be documented in `docs/architecture/environments.md` — same-commit rule).
- CI enforces: backend lint+contracts+migrations+tests, frontend lint+types+unit+build, docs-sync, compose smoke on a clean checkout (`docker compose up` must work with zero manual steps and no Stripe credentials).
