# PROJECT HANDOFF — operational continuation document

> **Permanent project rule:** this file is the single continuation document for any new AI agent or developer (Arena, ChatGPT, Gemini, human). It is updated at every phase completion and whenever a plan/architecture/business-rule change is discovered — **before or with** the implementation, never silently. Detailed evidence lives in the linked documents; this file stays a fast, accurate map.
>
> Last updated: **2026-09-24 (Phase 7 completion)**

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
| Current phase | **Phase 7 — Payments & Commissions ✅ complete** |
| Next phase | **Phase 8 — Messaging & Notifications** (scope below) |
| Branch | `arena/01a0cd90-knowledge-marketplace` (all work happens here) |
| Latest commit | `08b7c40` — docs: Phase 7 sync — payments surfaces, ledger model, jobs, roadmap |
| Latest verified CI | run **`35975718413`** — 4/4 ✓ (Backend · Frontend · Docs-sync · Compose smoke on clean checkout), 2026-09-24 |
| Working tree | Clean & synced with origin at last verification (`08b7c40`); verify with `git status` + `git fetch && git log origin/arena/01a0cd90-knowledge-marketplace -1` on takeover |
| Test baseline | backend pytest **248 passed**; frontend lint/typecheck/vitest **40**/build/bundle-budgets green |
| Roadmap | `docs/process/roadmap-phases.md` — the ONE source of truth for what exists (header + per-phase completion records) |

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
| 6 — Orders & Delivery | One order state machine for all three sources; delivery/revision loop (2 open / 3 managed), 72h auto-approval, cancellation, `/orders` + `/orders/[id]` workspace, OrderEvent timeline | `06808d0`, `9c41416`, `556b5cf`, `3421fc3` | order-lifecycle doc (BR-22..28) | `orders.auto_cancel_overdue` → Phase 9; chat deadline proposal → Phase 8 |
| 7 — Payments & Commissions | Provider-agnostic payment domain: Payment/Refund/Payout/LedgerEntry/WebhookEvent; ONE confirmation path (row-locked, amount-parity, atomic ledger + signal → order activation); webhooks idempotent; earnings/payouts; student payment UX; read-only financial admin | `111972b` (docs-first), `7fed70d`, `b505d1a`, `08b7c40` | **ADR-0005 amendment** (payments lower layer, Stripe = non-functional seam), ADR-0009 | **Stripe deferred until credentials + jurisdiction verification** (checklist in payments.md); refund automation of disputes → Phase 9; provider fee entries reserved for real rails |

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
| Realtime | Channels on the single ASGI process, `InMemoryChannelLayer`, origin-validated WS handshake, JWT-cookie auth; only `PingConsumer` ships so far (real consumers = Phase 8); WS is a **refetch hint, never source of truth** | ADR-0003, `docs/architecture/realtime.md` |
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
| On-platform communication + report-driven moderation (BR-34/35) | Phase 8 must implement these, not skip them | `docs/product/business-rules.md` |
| Docs-as-source-of-truth; Discover → Document → Implement → Test → Update handoff → Commit → Push | process rule | `docs/process/development-workflow.md`, this file |

---

## NEXT PHASE

### Phase 8 — Messaging & Notifications

**Goal.** Make the marketplace communicative and self-explaining: persistent per-context chat threads (request ↔ order lifecycle), realtime delivery over the existing Channels foundation with a database-backed fallback so nothing is lost when WebSockets are unavailable, read/unread receipts, a notification center with per-category preferences, and asynchronous fan-out (in-app + email) through django-q2 — replacing the current ad-hoc order-email hooks. All server-authorized, all Postgres-persisted, **no Redis** (in-memory channel layer, single ASGI process).

**Starting point (what exists).**
- ASGI/Channels foundation: `config/asgi.py` routing + origin validation + cookie auth; `apps/core/consumers.py` has only `PingConsumer` (`/ws/ping/`) as the plumbing proof — real consumers must follow its rules (authenticate on connect, authorize per group, delegate ALL business logic to services, no ORM writes in consumers).
- Notification seams to replace/absorb: `apps/orders/tasks.py` (`send_order_event_email` + `COPY` map, invoked via `orders.services._notify` → django-q2 `async_task`), `apps/assignments/tasks.py` + `apps/bidding/tasks.py` email hooks, `apps/accounts` verification/reset emails (keep these email-only categories).
- Email adapter seam (ADR-0011, console backend active): `EMAIL_BACKEND_MODE` env wiring is documented as a Phase 8 deliverable.
- UI entry points to hook: request page, offer cards, `/orders/[id]` workspace (chat surface), app shell (`SiteHeader`) for the notification bell.

**First tasks (ordered checklist).**
1. Backend `apps/messaging`: models `Thread` (context `request|order|dispute` + FK, one thread per context, created lazily), `Message` (sender, body ≤5000 plain text, optional attachment via `apps.files`, soft-hide flag), `MessageReceipt` (per-participant `read_at`); migration; add `apps.messaging` + `apps.notifications` to `LOCAL_APPS` and to the import-linter layers (see `backend/pyproject.toml`) at the correct height.
2. `apps/messaging/services.py`: thread get-or-create per context, send (participant guard + context-open guard — cancelled/expired contexts read-only, BR-34 banner data), inbox list, mark-read (throttle-tolerant), admin-view-with-audit only for open dispute/report (BR-35).
3. REST API: `GET /me/threads`, `GET /me/threads/{id}/messages`, `POST /me/threads/{id}/messages` (same service the WS consumer calls — one business path).
4. Consumers: `messaging/consumers.py` (`thread_{id}` group: message.new broadcast + typing indicator ephemeral) and `notifications/consumers.py` (`user_{id}` group: notification.push) on the Phase 1 pattern.
5. Backend `apps/notifications`: `Notification` rows (source of truth) + `NotificationPreference` (user × category, in_app always on, email toggleable, tokenized unsubscribe); `notifications.deliver` django-q2 task (push to `user_{id}` + email unless opted out, email task itself queued with retries).
6. Wire the catalog entries that exist today (`request_new_offer`, `offer_accepted`, `invitation_new`, `assignment_new`, `order_*` family, `message_new`) by replacing `orders.services._notify`'s direct email task with the notification service; keep `accounts` auth emails email-only.
7. Frontend: `/messages` inbox + thread page (WS client with refetch-on-reconnect/focus fallback and optimistic send), notification bell + toasts in the app shell (reduced-motion-safe per motion-system.md), entry points on request/order pages.
8. Tests: participant-only connect **and** send, cross-account 403s, read receipts/unread counts, offline DB fallback (WS down ⇒ message persisted + notification row exists), fan-out idempotency (django-q2 sync mode), preferences honored, read-only contexts, BR-35 admin view audit, frontend component tests.
9. Docs sync in the same phase: messaging.md, notifications.md, realtime.md, background-jobs.md, environments.md (email vars), api.md, database.md, roadmap completion record — and **update PROJECT-HANDOFF.md** (protocol below).

**Required files/docs to read first.**
- `docs/process/PROJECT-HANDOFF.md` (this file) + `docs/process/roadmap-phases.md` (Phase 8 row, Phase 5–7 records)
- `docs/workflows/messaging.md` (Thread/Message/MessageReceipt model, surfaces, BR-34/35 rules)
- `docs/workflows/notifications.md` (catalog, preference model, fan-out design)
- `docs/architecture/realtime.md` (consumers, groups `thread_{id}`/`user_{id}`, fallback doctrine)
- `docs/architecture/background-jobs.md` + ADR-0002 (django-q2 rules), ADR-0003 + `backend/apps/core/consumers.py` + `config/asgi.py` (WS foundation)
- `docs/product/business-rules.md` (BR-34, BR-35), `docs/design/design-system.md` + `docs/design/motion-system.md` (UI rules)
- `backend/pyproject.toml` (import-linter layers — new apps must be inserted correctly)

**Dependencies.** Auth/JWT cookies (Phase 2), files app for chat attachments (Phase 3, purpose rules in files.md), request/offer/order/assignment surfaces (Phases 4–6), django-q2 worker (Phase 1), Channels foundation (Phase 1).

**Do not implement yet.**
- Dispute threads/resolution, review system, file-access expansion (`secure downloads`), refund automation → **Phase 9**
- Admin dashboards/moderation queues/audit viewer polish → **Phase 10**
- Full E2E/hardening pack, CSP hardening → **Phase 11**
- Stripe adapter implementation (needs credentials + verified checklist), provider fees, payout provider integration → blocked until owner verification
- Redis channel layer (settings-only scale-out, not now), group chats, E2E encryption, message search (messaging.md non-goals)

**Acceptance criteria.** Roadmap Phase 8 row + the standard gates: backend pytest all green (incl. new messaging/notifications suites), FE lint/typecheck/vitest/build green, bundle budgets respected, ruff/format/lint-imports green, `makemigrations --check` clean, env-docs gate green, CI 4/4 on a clean checkout, docs + this handoff updated in the same phase.

**Expected GitHub workflow.** Work on `arena/01a0cd90-knowledge-marketplace` only; logical commits (backend messaging → notifications → frontend → docs); run the full suite + docs gates before every push; push and watch CI; update `PROJECT-HANDOFF.md` + roadmap in the completion commit; report hashes and CI run.

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
