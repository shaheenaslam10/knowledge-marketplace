# PROJECT HANDOFF — operational continuation document

> **Permanent project rule:** this file is the single continuation document for any new AI agent or developer (Arena, ChatGPT, Gemini, human). It is updated at every phase completion and whenever a plan/architecture/business-rule change is discovered — **before or with** the implementation, never silently. Detailed evidence lives in the linked documents; this file stays a fast, accurate map.
>
> Last updated: **2026-09-24 (Phase 8 completion)**

---

## START HERE

```text
Current phase:      Phase 7 — Payments & Commissions ✅ COMPLETE
Latest commit:      f844575 (docs: permanent handoff system) — branch arena/01a0cd90-knowledge-marketplace
Next phase:         Phase 8 — Messaging & Notifications  (see "NEXT PHASE" below)
Read first:         docs/process/roadmap-phases.md (Phase 8 row + Phase 5–7 records),
                    docs/workflows/messaging.md, docs/workflows/notifications.md,
                    docs/architecture/realtime.md, docs/product/business-rules.md (BR-34/35)
First implementation task:  apps/messaging — Thread/Message/MessageReceipt models +
                    services with participant-only guards + migration
Do not start:       Phase 9 (reviews/disputes/file expansion), Phase 10 (admin/analytics),
                    Stripe activation (credentials do not exist; seam stays), Redis (prohibited)
```

---

## Current project state

| Field | Value |
|---|---|
| Project | Hybrid Expert Marketplace (`knowledge-marketplace`) — three-experience marketplace: open bidding, managed service, one shared order/payment pipeline |
| Current phase | **Phase 8 — Messaging & Notifications ✅ complete** |
| Next phase | **Phase 9 — Files, Reviews & Disputes** (scope below) |
| Branch | `arena/01a0cd90-knowledge-marketplace` (all work happens here) |
| Latest commit | `ff85028` — Phase 8: FE messaging+notifications UI, unsubscribe endpoint, prune command (feature commits `b66d381` backend, `ff85028` FE; docs-sync commit follows this handoff) |
| Latest verified CI | run **`35986626495`** — ✓ on `ff85028` (2026-09-24); the docs-sync commit gets its own run — verify with `gh run list --limit 3` on takeover |
| Working tree | Clean & synced with origin at the docs-sync commit; verify with `git status` + `git fetch && git log origin/arena/01a0cd90-knowledge-marketplace -1` on takeover |
| Test baseline | backend pytest **282 passed**; frontend lint/typecheck/vitest **40**/build/bundle-budgets green; ruff+format clean; import-linter 2 kept/0 broken; `makemigrations --check` clean |
| Roadmap | `docs/process/roadmap-phases.md` — the ONE source of truth for what exists (header + per-phase completion records; Phase 8 record has the as-built details + deferred list) |

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
| 8 — Messaging & Notifications | Persistent threads (request/order contexts, live participant derivation), REST + WS on ONE service path, read receipts, chat attachments (message purpose, participant-only downloads), notification funnel across all domain events (q2 task: best-effort realtime push + plain-text email), per-category preferences (account immutable), public one-click unsubscribe, `prune_notifications` command, bell/toasts + `/messages` inbox + thread page + entry points | `b66d381`, `ff85028` | ADR-0003 held (InMemory layer, no Redis); ADR-0011 email adapter implemented (`EMAIL_BACKEND_MODE`) | **Deferred:** `request_new_matching` fan-out + daily digest, per-message report button + policy banner + dispute threads (Phase 9 moderation), chat deadline proposal (dropped), order-group WS hints |

**Major plan changes so far** (all documented before/with implementation): django-tasks → django-q2 (ADR-0002 amendment); payments layering inversion via domain signal (ADR-0005 amendment); no PaymentAttempt/Transaction tables; ledger identity formalized; payout settlement manual-by-design; Stripe explicitly not production-ready until the checklist in `docs/workflows/payments.md` is verified.

---

## Current architecture snapshot

Authoritative details live in `docs/architecture/*` — this is the map only.

| Area | Current state | Source |
|---|---|---|
| Frontend | **One Next.js (App Router, TS, Tailwind v4 CSS-first tokens) app with three experiences** — `(marketing)` / `(app)` / `(portal)` route groups, ESLint experience boundaries | ADR-0013, `docs/architecture/frontend.md`, `docs/architecture/web-experiences.md` |
| Backend | **One Django + DRF modular monolith**; domain apps with acyclic imports (import-linter in CI); business logic only in `services.py` (views/serializers/tasks/admin are thin); uniform error envelope | ADR-0001, `docs/architecture/backend.md` |
| Database | **PostgreSQL source of truth**; BigInteger minor-unit money (ADR-0009); UUID public ids (ADR-0008); migrations are append-only history | `docs/architecture/database.md` |
| Background jobs | **django-q2 + ORM broker on PostgreSQL** (no Redis/Celery); idempotent tasks = thin wrappers over services; schedules are ops setup via admin; shipped jobs: assignments expiry, orders auto-approve/unpaid-sweeper/deadline-reminder, payments payout-sweeper/ledger-check | ADR-0002, `docs/architecture/background-jobs.md` |
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

### Phase 9 — Files, Reviews & Disputes

**Goal.** Close the trust loop: secure file exchange for order work (R2 presigned downloads), the review/reputation system (student→expert reviews, expert reply, weighted public rating), and the dispute lifecycle with admin resolution executed through the existing refund/ledger machinery (BR-36..42) — plus the moderation hooks Phase 8 explicitly deferred (per-message report button, on-platform policy banner, dispute-context threads).

**Starting point (what exists).**
- Files app (`apps/files`): local-disk storage, upload-first purposes incl. `message` (Phase 8) and `delivery` (Phase 6), `grant_download` sidecar traversals, signed 5-min streaming tokens (`issue_download_token`/`resolve_download_token`), admin-audited credential views. R2 adapter = a storage-backend swap behind `FILE_STORAGE` (`docs/architecture/files-storage.md`), NOT a re-architecture.
- Refunds exist (Phase 7): staff full/partial with proportional commission reversal + ledger entries; dispute outcomes must reuse `payments.refund` (BR-41) — no new money path.
- Messaging (`apps/messaging`): `context_type="dispute"` is reserved in the schema; participants derive from live context rows — dispute threads slot in as a third context; `admin_view_thread` (BR-35, audited) is ready for dispute linkage.
- Notification funnel: add `dispute_opened`/`dispute_resolved`/`review_new`/`review_reply` types + the deferred `request_new_matching` emission decision (emit plainly or keep deferred — record the decision).
- Reviews data: `Review` model planned in `docs/architecture/database.md` (order 1-1, rating 1-5 + sub-scores, expert reply, published|hidden); expert rating aggregation feeds the public directory (`experts.rating_avg` already queried).

**First tasks (ordered checklist).**
1. Docs-first: update `docs/workflows/disputes.md` + `docs/workflows/files.md` (+ reviews spec in `docs/workflows/` — currently only business rules BR-37..39) to as-built intent; then implement.
2. R2 storage adapter: `django-storages` boto3 behind `FILE_STORAGE=r2`, presigned-GET download URLs through the existing token grant (env vars already documented: `R2_BUCKET`/`R2_ACCOUNT_ID`/`R2_ACCESS_KEY`/`R2_SECRET_KEY`/`R2_REGION`); local storage stays the default and dev reality.
3. Reviews: model + migration, "leave a review" surface on completed orders (student-only), expert reply-once, weighted public rating (BR-39) on profile/offers, hide-appeal via moderation flag; aggregates tested.
4. Disputes: `Dispute` model per database.md, open (BR-40 window + payout freeze hook into `payments` payout scheduling), dispute thread context (`messaging`), evidence files (`dispute_evidence` purpose), admin resolution action executing full/partial/release/split through the Phase 7 refund/ledger services (BR-41), notifications on open/resolve.
5. Moderation (BR-34/35): per-message report button + `admin_view_thread` linkage to an open report/dispute; on-platform policy banner in the thread UI; admin report queue lands in Phase 10 — Phase 9 ships the data + audited view.
6. Backlog absorbed this phase (decide + record): `orders.auto_cancel_overdue` job, `files` retention cleanup, chat `extend-deadline` (implement or explicitly push to Phase 10 — record the decision in roadmap).
7. Tests: cross-account file access denied (P9 gate), review aggregates correctness, dispute→partial refund→ledger identity (P9 gate), payout freeze/unfreeze on dispute open/resolve, dispute-window enforcement, report→audit linkage.
8. Docs sync + handoff update in the same phase (protocol below).

**Required files/docs to read first.**
- `docs/process/PROJECT-HANDOFF.md` (this file) + `docs/process/roadmap-phases.md` (Phase 9 row, Phase 8 record + its deferred list)
- `docs/workflows/disputes.md`, `docs/workflows/files.md`, `docs/architecture/files-storage.md` (ADR-0006), `docs/workflows/payments.md` (refund paths)
- `docs/product/business-rules.md` (BR-36..43), `docs/architecture/database.md` (planned `Review`/`Dispute` schemas)
- `docs/workflows/messaging.md` (dispute thread context, `admin_view_thread`) + `docs/architecture/background-jobs.md` (job seams)
- `backend/pyproject.toml` (import-linter layers — files stays low; reviews/disputes apps slot above orders/payments)

**Dependencies.** Orders & delivery (Phase 6), payments refunds/ledger/payouts (Phase 7), files grant/token plumbing (Phase 3/6/8), messaging dispute context (Phase 8).

**Do not implement yet.**
- Admin dashboards/KPIs/moderation queues/audit viewer/config UI/reconciliation views → **Phase 10**
- Authorization-matrix suite, CSP/security headers, dependency audit, E2E pack, perf budgets → **Phase 11**
- Production deploy (staging→prod, backups drill, monitoring, legal) → **Phase 12**
- Stripe activation (needs credentials + verified checklist in payments.md), provider fees, payout provider integration → blocked until owner verification
- Redis channel layer, message search, E2E encryption, group chats (non-goals)

**Acceptance criteria.** Roadmap Phase 9 row + the standard gates: backend pytest all green (incl. new reviews/disputes/files-access suites), FE lint/typecheck/vitest/build green, bundle budgets respected, ruff/format/lint-imports green, `makemigrations --check` clean, env-docs gate green, CI 4/4 on a clean checkout, docs + this handoff updated in the same phase.

**Expected GitHub workflow.** Work on `arena/01a0cd90-knowledge-marketplace` only; logical commits (docs-first → backend files/reviews/disputes → frontend → docs sync); run the full suite + docs gates before every push; push and watch CI; update `PROJECT-HANDOFF.md` + roadmap in the completion commit; report hashes and CI run.

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
