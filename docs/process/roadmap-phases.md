# Development Phases, Dependencies & Acceptance Criteria

> Status: **Phase 11 ✅ complete · Next: Phase 12 (Production Deployment)** · Last updated: Phase 11 completion
> **Single source of truth.** The table below reflects what the system actually contains after each phase. Renumbered at Phase 5 kickoff (owner direction): the marketplace foundation (requests + open bidding + selection + order creation) shipped together in Phase 4, so the former "Bidding & Selection" phase no longer exists and later phases shifted down one. Per-phase completion records live at the bottom of this file.

## Phase overview

| Phase | Name | Depends on | Core deliverables |
|---|---|---|---|
| 0 | Architecture & Documentation | — | ✅ docs set, ADRs, review |
| 1 | Project Foundation | 0 | ✅ monorepo scaffolds (backend+frontend), Docker Compose, CI, `.env.example`, health endpoints, seed command, lint/test gates, worker pipeline, OpenAPI, error envelope, gateway interface |
| 2 | Authentication & Roles | 1 | ✅ register/verify/login/reset, JWT cookies, role model, admin groups, audit middleware, throttles |
| 3 | Student/Expert Profiles | 2 | ✅ profiles, taxonomy, expert application+approval (admin), files app (credentials, avatars), public expert directory API |
| 3.5 | Design & Product Architecture | 3 | ✅ three-experience structure (ADR-0013), design system + motion + component selection (ADR-0014) |
| 4 | Marketplace + Open Bidding + Selection | 3.5 | ✅ design foundation in code (tokens, customized kit, motion, three shells); ServiceRequest lifecycle + integrity attestation, visibility rules, opportunities feed, offers (blind, editable pending), **transactional selection** → Order (`awaiting_payment`, commission snapshot); request files (`request_brief`); `bundle:check` budget gate |
| 5 | Managed Service + Owner Assignment | 4 | ✅ owner triage (approve/reject), pool invitations (first-accept wins), direct assignments, quote/price guidance, expert accept/decline, **convergence into the same Order** (`source=managed_pool|managed_direct`) |
| 6 | Orders & Delivery | 5 | delivery/revision/approve/auto-approve/cancel flows, order workspaces (FE), timers, order timeline |
| 7 | Payments & Commissions | 6 | provider-agnostic `PaymentGateway` — **ManualGateway active** (dev/test + operator-confirmed fallback, simulated signed webhooks); **StripeGateway = registered non-functional seam, no SDK/credentials**; idempotent confirm path, ledger, refunds, payout sweeper, earnings UI |
| 8 | Messaging & Notifications | 5 | ✅ threads+WS realtime (optimistic send, offline REST fallback), read receipts, notification center + preferences, realtime toasts, email funnel, unsubscribe, prune; digest deferred (see record) |
| 9 | Files, Reviews & Disputes | 6,7 | ✅ R2 storage adapter + presigned downloads, retention job; review flows + BR-39 weighted aggregates; dispute lifecycle + resolution reusing Phase 7 money services; moderation hooks (report + grounds-gated view); overdue flagging + deadline proposals |
| 10 | Admin & Analytics | 5–9 | ✅ `(portal)` operations surfaces: KPI dashboard (server-side Postgres aggregation, UTC ranges), moderation report queue (audited review/dismiss/hide), dispute triage queue (resolution deep-links Django admin), audit viewer, PlatformConfig singleton + audited config UI, read-only financial reconciliation, users overview, seed operations funnel |
| 11 | Security, Testing & Performance | all | ✅ docs-first security audit (F-1..F-8, dispositions recorded), authorization-matrix suite, backend hardening (ops throttles, concurrency races), CSP/headers (CSP report-only; enforcement = Phase 12 gate), pip-audit + npm-audit CI gates, Playwright E2E pack (4 journeys + smoke over compose), query-count budgets + bundle budgets + `docs/architecture/performance.md`, compose smoke 4/4 |
| 12 | Production Deployment | 11 | staging→prod deploy, backups+restore drill, monitoring, legal pages, launch checklist |

Notes on ordering: payments after orders (an order must exist to pay for); messaging at 8 (marketplace usable without realtime chat); files core landed in 3 (credentials) + 4 (`request_brief`), delivery-file extensions in 6/9; the operations portal stays scaffolding until Phase 10 (Django admin remains the ops tool, ADR-0010). Sequence rationale (Phase 3.5 refinement): design system ✅ → marketplace domain → managed service → orders/delivery → payments → communication → files/reviews/disputes → admin → hardening → launch.

## Per-phase acceptance criteria (summary — detailed gates)

- **Every phase:** backend `pytest` green + frontend `build` green in CI; `docker compose up` gives a working app; README updated; docs updated; committed & pushed with clear message; demo-able via seed data.
- **Phase 4+ (design gate, from 3.5):** new user-facing screens consume the design-system tokens/primitives (no ad-hoc styling systems), vendored patterns are recorded in component-selection.md, and CI bundle checks stay within design-system.md §Performance.
- **P2 (done):** matrix tests for roles on existing endpoints; audit rows on admin actions.
- **P4 (done):** open-flow E2E locally: post→offer→accept→order(`awaiting_payment`); selection race-safety suite.
- **P5:** managed-flow E2E: submit→triage(approve pool / direct assign)→accept→order with correct `Order.source`; first-accept-wins race test; ineligible-expert rejections.
- **P6:** delivery/revision/approve loops tested incl. auto-approve timer; order workspace live for both roles.
- **P7:** webhook idempotency tests; ledger balance invariant test; refund+partial refund paths; payout scheduling incl. minimums; expert earnings math verified against commission snapshots.
- **P8 (done):** live chat demo verified (two concurrent WS sessions: message broadcast + typing + read); offline path = REST send + refetch-on-focus/reconnect; email fallback via django-q2; preference toggles honored (account immutable); unsubscribe + prune verified.
- **P9:** cross-account file access denied (tested); review aggregates correct; dispute→partial refund→ledger verified.
- **P10:** owner can operate a full day (vet, triage, resolve, reconcile) from admin alone.
- **P11:** security checklist (docs/architecture/security.md) signed off; coverage gates met.
- **P12:** restore drill passed; uptime monitor green; live order cycle with real (or manual-mode) money.

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

---

## Phase 2 — completion record (Authentication & Roles)

**Status: ✅ complete** (custom user + roles + auth flows + admin management + WS auth compatibility + frontend foundation; all suites green; docs synced; implementation commit(s) listed below, docs-sync pass on top).

### Delivered

| Area | What exists |
|---|---|
| User model | `apps.accounts.User` (email login, name, `is_active`, `is_staff`, `email_verified_at`, `timezone`, `locale`, `last_login_ip`, timestamps via shared `TimeStampedModel`) + manager; Argon2id-first hashers; 10-char password floor (validator + serializer); 3-day reset timeout |
| Auth API | `/api/v1/auth/register`, `/auth/token`, `/auth/token/refresh` (rotate+blacklist), `/auth/logout`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/password/reset(+confirm)`, `/auth/password/change`, `/api/v1/me` GET/PATCH, `/api/v1/me/deactivate` — tokens ONLY in httpOnly `SameSite=Lax` cookies; deny-by-default; `auth` throttle 10/min; enumeration-safe register/reset; per-request `is_active` |
| Roles | `get_roles` dict (`student` always, `verified`, `staff`, `support`/`admin` via groups+staff, `expert` reserved `False` slot for Phase 3); permission classes `IsAdmin`/`IsSupport`/`IsExpert`/`IsVerified`; extension point: role-provider registry |
| Realtime | `JWTAuthMiddleware` (cookie→scope user) + explicit origin allowlist; `/ws/whoami/` proof consumer |
| Tasks | `send_verification_email` / `send_password_reset_email` via django-q2 (console backend in dev; `enqueue_email` seam) |
| Admin | `ManagedUserAdmin` — search/filter, activate/deactivate/resend-verification actions, safe password form |
| Seeds | `seed_demo` → `admin@demo.local` / `student@demo.local` / `expert@demo.local` (env-controlled passwords, DEBUG/test-guarded, `--force` override) — moved to `apps.accounts` to keep `core` kernel-clean |
| Frontend | auth foundation only (per scope): session context + API client wiring, login/register/verify-email/reset-password routes, protected-route middleware foundation, role-aware nav shell, loading/error states, vitest coverage |
| Quality | 98 backend tests (accounts suites: models / api / permissions-matrix / WS) + full Phase-1 suite; ruff + import-linter (layers corrected: payments < accounts < core); `makemigrations --check`; OpenAPI with `cookieAuth` scheme + typed request/response schemas |

### Deliberate deviations & deferrals (documented in ADR-0004 + authentication.md)

- Refresh-reuse **family revocation** deferred (reuse itself is rejected; per-user all-token kill exists).
- Per-account exponential login backoff deferred (throttle scope in place).
- 72-h unverified-account cleanup job deferred.
- Audit-log sidecar app: schema seam reserved, rows start with admin actions in later phases.

### Implementation commits

See `git log` — Phase 2 lands as: (1) accounts app + settings + tests, (2) docs + env sync, (3) frontend auth foundation; hashes recorded in the final Phase 2 report.

**Known Phase 2 limitations (by design):** expert approval workflow and profile/taxonomy models are Phase 3; no business logic beyond auth; email delivery is console/SMTP settings (Brevo adapter Phase 9); audit rows pending.


---

## Phase 3 — completion record (Student/Expert Profiles)

**Status: ✅ complete** (profiles, expert lifecycle, taxonomy, files foundation, public directory, role-specific onboarding per ADR-0012; suites green; docs synced).

| Area | What exists |
|---|---|
| Taxonomy | `TaxonomyTerm` (category/subject/skill/tag, optional category parent, per-kind unique slugs), admin CRUD, public `GET /taxonomy/terms`, seeded demo tree |
| Student | `StudentProfile` (display name, bio, taxonomy interests) — self-service `GET/PATCH /me/student-profile`, no approval gate |
| Expert lifecycle | `ExpertApplication` (draft→submitted→under_review→approved/rejected, resubmittable; approved⇄suspended) — service-layer state machine, audited, emailed (django-q2); reviewer/reason/timestamps |
| Expert profile | `ExpertProfile` created at approval (slug, headline/bio/expertise, experience, qualifications, languages, availability available/paused, timezone, visibility opt-out, rating placeholders) |
| Roles | `expert` role = approved application (query-based check — immune to relation caching); suspension drops the role, keeps student |
| Files | `Attachment` sidecar: credential (private, pdf/png/jpg ≤10MB) + avatar (public, ≤2MB) purposes; extension allowlist + magic-byte sniffing; sha256 dedupe; `grant_download` single gate; 5-min signed streaming URLs; staff credential views audited |
| Directory | `GET /experts` + `/experts/{slug}`: approved+public+active only, q/subject/skill/rating filters, cursor pagination, zero private fields |
| Audit | `AuditEvent` sidecar (append-only, read-only admin) — all expert transitions + staff credential views |
| Seed | `apps.seed.seed_demo`: 8 personas across every lifecycle state + taxonomy tree + demo credentials; idempotent; dev/test-guarded |
| Frontend | `/experts`, `/experts/[slug]`, `/onboarding/student`, `/expert/apply`, `/expert/application`, `/expert/profile` (+ account widgets); middleware guards extended |

**Deliberate scope decisions:** no request/offer/order logic (Phase 4+); avatars have no upload UI yet (API ready); admin reviews via Django admin actions (no custom dashboard); R2 adapter deferred to Phase 10 per plan.

---

## Phase 3.5 — completion record (design & product architecture refinement)

**Status: ✅ complete (documentation)** — committed and pushed **before any Phase 4 implementation**, per the owner's direction. No Phase 3 work was redone; no Phase 4 code started.

| Deliverable | Where |
|---|---|
| Three-experience product architecture (marketing / app / portal; one repo, one app, one API) | [architecture/web-experiences.md](../architecture/web-experiences.md) + ADR-0013 |
| Design system (personality, tokens incl. iris/teal palette, typography, spacing/radius/shadows, per-experience surfaces, component inventory & states, icons/illustration style, responsive + a11y rules, performance budgets) | [design/design-system.md](../design/design-system.md) + ADR-0014 |
| Motion system (duration/easing tokens, per-experience profiles, reduced-motion, mobile reductions, performance constraints) | [design/motion-system.md](../design/motion-system.md) |
| Component/pattern selection (shadcn base kit, curated Aceternity patterns, bespoke matching-network & steppers, rejected patterns, deferred decisions, installation policy) | [design/component-selection.md](../design/component-selection.md) |
| Roadmap revision (sequence + Phase 4 design gate + bundle checks) | this file |

**Housekeeping in the same change:** Phase 3's onboarding ADR renumbered **ADR-0011 → ADR-0012** (ADR-0011 was already taken by the Phase 0 Brevo email adapter) — all 16 references updated across docs and code comments; no behavior changed.


---

## Phase 4 — completion record (Marketplace Foundation + Design Foundation)

**Status: ✅ complete.** First real marketplace workflow: student creates a request → eligible experts discover it → experts submit offers → student selects one (transactional) → Order created in `awaiting_payment`.

| Area | What exists |
|---|---|
| Design foundation | tokens (`@theme` iris/teal light+dark), vendored+customized kit (Button/Badge/Card/Input/Textarea/Label/Skeleton/Separator/Dialog/Sheet/DropdownMenu), motion/react runtime + Reveal/Stagger/Spotlight/TextReveal, three experience shells (`(marketing)`/`(app)`/`(portal)`), bundle-budget CI gate |
| Requests | `ServiceRequest`: integrity-relevant categories, subject+skills taxonomy, budget (minor units), deadline, `request_brief` attachments; draft→open→matched→… state machine in services; BR-10 attestation at publish; BR-08 TTL + reopen-once; cancel paths |
| Visibility | owner/staff/eligible-expert-only detail access; feed = open-mode open requests minus owner; suspended/paused experts excluded; selected expert keeps access; guests never see requests |
| Offers | one per expert per request (editable pending, withdraw + resubmit while open, 20-pending cap, min amount BR-18, net preview BR-17); blind bidding everywhere |
| Selection | single transaction: row locks, full server-side re-validation, siblings auto-declined, request `matched`, Order created (`awaiting_payment`, 15% commission snapshot) — ADR-0015 |
| Orders | unified anchor; managed service converges via the same factory (`managed_pool`/`managed_direct` enums ready) |
| Files | `request_brief` purpose (pdf/png/jpg ≤10MB, private); metadata-only for browsing experts; participant access for the selected expert; per-purpose dedupe |
| Jobs | `bidding.tasks.expire_stale_requests` (django-q2 + ORM; hourly schedule is ops setup) |
| API | 13 versioned endpoints (catalog in api.md), envelope/DomainError/request-id/pagination unchanged; OpenAPI auto |
| Frontend | student `/requests*`, expert `/opportunities*`, `/offers`; role-aware shared shell; portal scaffold; 37 vitest |
| Tests | +32 backend (173 total): lifecycle, visibility, IDOR, blind bidding, selection guards (double-select, withdrawn offer, suspended expert), brief access matrix, seed idempotency (9 users/6 applications/2 requests/2 offers) |

**Deliberate scope decisions:** payments/order transitions, messaging, managed ops, marketing pages (beyond shared hero components) all untouched — next phases per the revised sequence.


---

## Phase 5 — completion record (Managed Service + Owner Assignment)

**Status: ✅ complete.** `Student submits managed request → owner triage (Django admin) → pool or direct routing → expert accepts → unified Order (`awaiting_payment`).`

| Area | What exists |
|---|---|
| Student | managed option on the request form; publish = submit for triage (`in_review`, BR-19); status copy + owner-handling explanation; quote visible before any charge (BR-22) |
| Owner triage | Django admin: approve-for-pool action (subject-matched eligible experts or a hand-picked pool), direct-assignment form, supersede action, reject-with-reason, quote/notes editing — all staff-guarded, service-routed, audited |
| Pool | `PoolInvitation` (48h TTL): first-accept-wins under row locks → siblings auto-declined → Order (`managed_pool`) at the platform quote; advisory `expected_amount`; re-broadcast action |
| Direct | `DirectAssignment` (24h TTL): accept → Order (`managed_direct`) at the proposed price; decline/supersede → back to owner for reassignment (BR-21) |
| Convergence | single `create_order_for_request` factory (ADR-0015 seam); commission by source (open 15% / managed 20%) snapshotted; **no second order model** |
| Safety | staff guards on every triage service; suspended/paused experts cannot be assigned or respond; double-accept/double-match impossible (locks + `request_closed`); students cannot write routing fields (`WRITABLE_FIELDS` allowlist, tested) |
| Notifications | invitation/assignment/triage-decision emails via django-q2 async_task (hooks for Phase 8); expiry task (`expire_due_assignments`) |
| Frontend | expert `/assignments` (accept/decline + countdowns), student managed UX, portal triage pointers — design-system components only |
| Tests | +15 backend (188 total): triage authz, races, eligibility, supersede, transitions, `Order.source`, audit rows, seed idempotency (4 requests incl. managed demo + pending invitation); +3 frontend (40 total) |

## Phase 6 — completion record (Orders & Delivery)

**Status: ✅ complete.** `Order (awaiting_payment) → mark_paid (Phase 7 seam, staff/manual today) → active → delivered ⇄ revision_requested → completed | cancelled` — one state machine, one model, all three sources (BR-22..28).

| Area | What exists |
|---|---|
| Lifecycle | `apps/orders/services.py` transition map (409 `invalid_transition` on illegal moves); `select_for_update` row locks + status re-checks; request rides along (`matched→in_progress` on payment, `→completed` on approval, `→cancelled` on cancellation); amounts immutable post-payment |
| Delivery | `Delivery` rows (revision_number 0=n, UNIQUE per order) with summary (≥20 chars) + `delivery`-purpose files via the existing `apps.files` grant_download (participant-only, private storage) |
| Revisions | included = 2 open / 3 managed; student-only, required note (≥10); resubmission increments `revision_number`; due date +7d per revision; exhausted → approve/dispute/admin only; auto-approval pauses mid-revision |
| Completion | student approve · auto-approve (72h, BR-24) · admin force-approve (BR-25); `completed_at`, request → `completed`, payout scheduling is Phase 7 |
| Cancellation | pre-payment: either party w/ reason; post-payment: support only (BR-26..28 refund paths land in Phase 7) |
| Auto-approval | `orders.auto_approve_due` idempotent + race-safe (row lock, re-check status/delivery); django-q2 + PostgreSQL ORM broker; schedule creation = ops setup (admin) |
| Jobs | `auto_approve_deliveries` 15 min · `awaiting_payment_sweeper` (BR-23, 72h unpaid → cancel) hourly · `deadline_reminder` hourly (T-24h expert email, deduped by persisted `deadline_reminded` event) · overdue flagging deferred to Phase 9 |
| Timeline | append-only `OrderEvent` log (created, payment_confirmed, delivered, revision_requested, redelivered, approved, auto_approved, completed, cancelled, dispute_opened*, deadline_reminded) — the ONLY data the UI timeline renders (*dispute_opened fires in Phase 9) |
| API | `/api/v1/me/orders` (list/detail/deliveries/approve/request-revision/cancel); non-participants get 403 before any state read |
| Frontend | `/orders` list (both roles, status filters) + `/orders/[id]` workspace (summary card, 4-step progress rail, delivery thread, timeline, role-gated actions); delivery upload through the existing files API; `/orders` middleware-guarded |
| Design/motion | design-system tokens/components only; motion = status-badge pop, progress-rail fill, timeline stagger — transform/opacity only, reduced-motion collapses to instant states |
| Tests | +13 backend (201 total): payment-seam authz, delivery loop with files, revision rules + history, duplicate completion, cancellation paths, auto-approval idempotency + student-race, unpaid sweeper, file access matrix, reminder dedupe, API workspace + stranger lockout; FE lint/typecheck/vitest/build + bundle gates green |

## Phase 7 — completion record (Payments & Commissions)

**Status: ✅ complete.** `awaiting_payment → (payment confirmed: gateway/dev/admin/webhook) → active`, ledger as the financial source of truth — all provider-agnostic, ManualGateway fully functional locally, Stripe a prepared seam (ADR-0005 amendment).

| Area | What exists |
|---|---|
| Abstraction | `PaymentGateway` port (create/confirm/status/refund/transfer/verify_webhook) + `PAYMENT_GATEWAY` registry; `ManualGateway` = dev/test + operator-confirmed fallback (deterministic failure hook, simulated signed webhooks); `StripeGateway` registered, raises `GatewayNotConfigured`, no SDK dependency |
| Domain | Payment (1-1 order) / Refund / Payout / LedgerEntry (append-only) / WebhookEvent (event-id idempotent); no attempt tables (reasoning documented) |
| Confirmation | ONE service path: order row locked first, amount parity, ledger charge+commission+expert_credit atomically, `payment_confirmed` signal → `orders.mark_paid` (order `active`, request `in_progress`); duplicates/wrong-amount/cancelled all rejected & rolled back; failures recorded for retry |
| Commission | booked order snapshot is the immutable source (15% open / 20% managed); `commission_split` deterministic integer math; never recomputed after booking |
| Ledger | signed minor-unit entries; identity `charge + refund == commission + expert_credit + fee` enforced by nightly `payments.ledger_check`; expert earnings = queries over entries, never denormalized balances |
| Refunds | staff-only full/partial with proportional commission/credit reversal; refundable-balance cap; payment → `refunded|partially_refunded`; dispute-specific policies stay Phase 9 |
| Payouts | auto-scheduled on completion (BR-30: completed + dispute-free + expert active + ≥$10 else rolls forward); settlement = explicit operator/gateway action with ledger entry; failure reason + retry |
| Webhooks | `POST /payments/webhooks/{provider}`: signature verification before storage, raw payload kept, event-id dedup (replays no-op), failures persisted + admin redeliver |
| API/UX | pay + dev-confirm endpoints, `payment` block on order detail, `/me/earnings`, `/me/payouts`; student payment card (instructions, simulated badge, failure/retry, refund state); expert earnings card on `/orders` |
| Admin | Payment/Refund/Payout/LedgerEntry/WebhookEvent read-only; audited service actions: confirm, full-refund, settle, fail, redeliver |
| Security | server-side amounts only; ownership + staff gates; signature-verified ingestion; no card data fields; no secrets in responses/logs |
| Tests | +47 backend (248 total): the full acceptance matrix incl. wrong amount/order, cancelled-order confirmation, duplicate charge/confirm/settle, webhook idempotency/replay/rejection, refund caps/authz, payout floor/races, ledger tamper detection, stripe seam, dev-confirm gating; FE lint/type/test/build/bundle green |
## Phase 8 — completion record (Messaging & Notifications)

**Status: ✅ complete.** Persistent messaging (Postgres as source of truth) + realtime Channels transport + the notification funnel across all domain events; BR-34 participant-only communication enforced server-side for WS and REST alike.

| Area | What exists |
|---|---|
| Threads | `apps/messaging`: `Thread` (context `request|order`, `dispute` reserved) lazy one-per-context; participants derived from LIVE context rows (order student+expert; request owner + offer-holding experts), synced on access; read-only when the context ended (order `cancelled`, request `cancelled|expired` — `thread_read_only`) with history preserved |
| Messages | ≤5000-char plain text (strip + nonempty check); attachment via files app purpose `message` (5 MB, pdf/png/jpg/jpeg/txt, private, content-sniffed + deduped, string-id accepted for WS); `is_hidden` soft-delete (admin-toggleable) |
| Read state | `MessageReceipt` UNIQUE(thread,user) `last_read_at` watermark; REST thread GET marks read; inbox cards carry per-thread unread counts |
| Authorization | participant checks re-derived per request/WS-frame in services (single path); WS close 4401 unauth / 4403 non-participant; BR-35 `admin_view_thread` staff-only + audit `messaging.thread_viewed`; Django admin read-only (+`is_hidden` toggle only) |
| Realtime | `ThreadConsumer` (`message.send`/`typing`/`read` → same services; `message.new` broadcast with shared payload incl. attachments; `message.error` to sender) + `NotificationConsumer` (group `user_{id}`, `notification.push`); InMemory channel layer, JWT-cookie auth, origin-validated handshake; NO Redis |
| Fallback | WS = refetch hint only: optimistic send over WS, direct REST send when offline; thread page refetches on (re)connect/focus/visibility/online; notification badge adds a 60s poll — UI correct with zero sockets |
| Notification center | `Notification` rows (url deep link, context JSONB, read/emailed/pushed timestamps); `/messages` inbox + bell dropdown (unread count, mark-read / mark-all-read); toasts (max 3, auto-dismiss) on push |
| Funnel | `notify`/`notify_many` single funnel; domain emit points: orders (`_EVENT_COPY` map: paid_activated/delivered/revision/completed/cancelled/deadline_warning), bidding (`request_new_offer`, `offer_accepted`), assignments (`invitation_new`, `assignment_new`), payments (`payment_failed`, `payout_paid`), messaging (`message_new`); `deliver_notification` q2 task idempotent via `pushed_at`/`emailed_at` (realtime push best-effort + plain-text email per category preference) |
| Preferences | per-category email toggles; `account` category immutable-on (service-enforced); `GET/PUT /me/notification-preferences` |
| Email seam | `EMAIL_BACKEND_MODE` console/smtp/brevo; `BrevoEmailBackend` (stdlib urllib, raises without key); retries ride django-q2 |
| Unsubscribe | public `GET /api/v1/unsubscribe?token=…` — signed stateless token (60-day), confirmation page; `account` tokens protected; bad tokens 400 |
| Pruning | `manage.py prune_notifications [--days 90]` (idempotent; schedule via q2 `Schedule` in prod) |
| Frontend | `/messages` inbox + `/messages/{id}` thread page (typing indicator, connection pill, attachment upload/download via signed URLs); bell + toasts in the app shell; `MessageThreadButton` entry points on order workspace, request offers, opportunities detail |
| Deferred (recorded, not silent) | `request_new_matching` fan-out + daily digest (matching loop doesn't emit yet); `payout_scheduled` / `order_auto_approve_warning` emissions; per-message report button + on-platform policy banner (Phase 9 moderation wave); chat deadline proposal (dropped from scope); order-group WS timeline hints |
| Tests | +34 backend (**282 total**: messaging suite — threads/authz/read-state/WS stack incl. 4401/4403/REST-vs-WS payload parity/chat-file access; notifications suite — funnel idempotency, preferences incl. account immutability, unsubscribe round-trip, prune); FE lint/typecheck/vitest 40/build + bundle budgets green; import-linter layers (messaging top, notifications bottom) 2 kept/0 broken |
| Verified live | local e2e on seeded dev data: full order cycle → thread open → WS chat (broadcast + typing + read) → notifications rows + bell data → console emails via `qcluster` → unsubscribe flow (200/protected/400) |
| Key commits | `b66d381` (backend), `ff85028` (FE + unsubscribe + prune) |

## Phase 9 — completion record (Files, Reviews & Disputes)

**Status: ✅ complete.** R2-compatible file storage behind `FILE_STORAGE` (local stays the free dev default), the review system with BR-39 recency-weighted aggregates, the admin-mediated dispute lifecycle whose money outcomes reuse the Phase 7 refund/payout/ledger services (zero new financial code), Phase 9 moderation hooks (report button + BR-35 grounds-gated audited thread view + policy banner copy), and the Phase 6 backlog items (overdue flagging, file retention cleanup, deadline-proposal services).

| Area | What exists |
|---|---|
| Files/storage | `FILE_STORAGE=r2` → django-storages `s3.S3Storage` (private ACL, s3v4, path style, endpoint from `R2_ACCOUNT_ID`/`R2_ENDPOINT_URL`); downloads: `grant_download()` remains the ONLY gate, transport = 5-min presigned GET (R2) or signed-token streaming (local); `dispute_evidence` purpose (10 MB pdf/png/jpg/jpeg, Dispute→order participant traversal); `legal_hold` flag; `files.retention_cleanup` (briefs 30d post-cancel/expiry, order files 12m post-end) + `files.tasks.retention_cleanup` q2 wrapper |
| Reviews | `apps/reviews`: student-only submit on completed order (1-1, `duplicate_review`), rating 1–5 + optional sub-scores + body 20–5000; edit until expert reply (`review_already_answered`); exactly one immutable expert reply + private `expert_rating_of_student`; staff hide/unhide with aggregate recompute; BR-39 weighted aggregate `0.5**(age_days/365)` written to `ExpertProfile.rating_avg/rating_count` on every relevant write (zero-review → null/0) |
| Disputes | `apps/disputes`: 1-1 order, 7 reasons, BR-40 window (active/delivered/revision_requested or ≤7d after completion; `completed→disputed` transition added to the order machine); state machine open→under_review⇄awaiting_response→resolved→closed, services-only with `select_for_update` + audit rows; evidence via own `dispute_evidence` uploads; dispute threads (`context_type="dispute"`, participant-derived, read-only at resolution) |
| Resolution (BR-41) | Django admin `_resolve` (outcome + optional refund amount + notes ≥20) → `disputes.resolve`: full → `payments.issue_refund` (reason `dispute_resolution`) + void unsettled payout; partial/split → refund ≤ refundable−1 + audited payout adjustment (`payout.adjusted_dispute`); release → unfreeze; no_fault → restore `prior_order_status`. **No direct ledger writes from dispute code** — every money movement rides Phase 7 services; staff-only; audited |
| Freeze | `Order.has_open_dispute` (denormalized, order-row locked on both sides): `schedule_payout` skips, `settle_payout` raises `payout_frozen`, `payout_sweeper` excludes; race-tested (dispute-vs-settlement both orders) |
| Moderation | `MessageReport` (one open per message+reporter, idempotent), POST `/me/messages/{id}/report`; `admin_view_thread` now REQUIRES grounds (open dispute flag or open report; `no_moderation_grounds` otherwise) and audits `moderation-inspection`; FE policy banner on order/dispute threads + per-message report dialog; moderation queue/dashboard stays Phase 10 |
| Orders backlog | `DeadlineProposal` (propose/accept→extends `delivery_due_at`/decline/withdraw; audit events `deadline_proposed`/`deadline_extended`) + `flag_overdue` (>24h past deadline, deduped) + `orders.tasks.overdue_flagging` q2 wrapper; chat proposal card remains a documented non-goal |
| API | reviews: POST/GET `/me/orders/{id}/review`, PATCH `/me/reviews/{id}`, POST `/reviews/{id}/reply`, GET `/me/reviews`, GET `/experts/{slug}/reviews` (public, weighted aggregate); disputes: POST/GET `/me/orders/{id}/dispute`, GET `/me/disputes/{id}`, POST `/me/disputes/{id}/evidence`; messaging: POST `/me/messages/{id}/report`; int-pk review/order routes, UUID dispute/message routes |
| Frontend | order workspace: review section (composer/stars/sub-scores/edit/reply per role) + dispute section (window-gated composer with evidence upload, status card with outcome/resolution/evidence download/add, dispute-thread button); expert "Reviews" nav page (received reviews + one-time reply); public expert profile: weighted rating line + reviews feed; messaging: report button + BR-34 policy banner; dispute context in inbox labels |
| Notifications | new funnel categories: `dispute_opened`, `dispute_resolved`, `review_new`, `review_reply`, `order_overdue_flagged`, `order_deadline_proposed`, `order_deadline_extended` |
| Env | `.env.example` + `docs/architecture/environments.md`: `R2_*` (bucket/account/endpoint/keys/region) + `R2_PRESIGN_TTL_SECONDS`; `FILE_STORAGE=r2` optional — local dev/CI stay free; env-docs CI gate green |
| Docs sync | workflows (reviews/disputes/messaging/files/payments) + architecture (api, database, background-jobs, environments, files-storage) as-built; disputes admin/template surfaces documented |
| Deferred (recorded, not silent) | `request_new_matching` fan-out + digest (unchanged from Phase 8); chat-based deadline proposal card (service exists; UI non-goal); order-group WS timeline hints; dispute detail page as standalone route (workspace panel chosen); moderation queue + expert `rating_of_student` surfacing = Phase 10 decisions |
| Tests | backend **333 passed** (+51: disputes 22 — window/freeze/sweeper/races/outcomes/ledger-identity/lifecycle/evidence-authz/thread/REST embeds; reviews 15 — eligibility/one-per-order/edit-until-reply/single-reply/hidden-recompute/weighted-math/public+received endpoints; files +R2 storage/presign/retention/legal-hold/evidence-traversal; messaging moderation grounds gate); FE vitest **58 passed** (+18: review eligibility/composer validation/role boundaries, dispute window gating/composer/status, report flow + banner); ruff+format clean; import-linter 2 kept/0 broken; bundle budgets green; CI 4/4 |
| Key commits | `fd90947` (backend core), `b8323d4` (backend embeds + received-reviews), `07e8d04` (frontend), `8b19135` (docs sync), completion commit (roadmap + handoff) |

## Phase 10 — completion record (Admin & Analytics)

**Status: ✅ complete.** The owner/operator layer: a dense operations portal over the Phase 0–9 data — KPI dashboard, moderation queue, dispute triage, audit viewer, financial reconciliation, users overview, and an audited PlatformConfig editor — with Django admin retained for triage/approvals/resolution (ADR-0010 split documented in admin-journey.md).

| Area | What exists |
|---|---|
| KPI dashboard | `/portal` — marketplace/financial/quality/communication groups + trend bars; ranges today/7d/30d/custom (UTC, `[from,to)`, server-evaluated); every metric defined in observability.md §KPI dictionary naming its exact source (GMV = succeeded payments; commission/payable = ledger aggregates; **no money recomputed outside ledger/payment tables**) |
| Moderation | `/portal/moderation` — `MessageReport` queue (status/reason filters); review actions `dismiss` / `confirm_hide` via `portal.services.moderation` → messaging's audited `set_message_hidden` (idempotent; `report_not_open` guard); reviewer + timestamp persisted (`MessageReport.reviewed_by/at`, migration 0003); **no account suspension/warning** (no such service — recorded decision) |
| Disputes | `/portal/disputes` — triage queue (status/reason/amount/order links); resolution deep-links the Django admin resolve form executing the Phase 9 service path — **no duplicated financial logic** |
| Audit viewer | `/portal/audit` — actor/action/object/time filters over `AuditEvent`; append-only everywhere (view has no write methods) |
| Reconciliation | `/portal/finance` — read-only checks: per-order ledger identity (reuses `payments.ledger_check`), refund-rows↔REFUND-ledger parity, unsettled-payouts↔expert-credit parity, succeeded-payment charge coverage, refunded_minor↔refund-rows, failed webhooks; no repair buttons (fixes = existing admin service actions) |
| Config | `core.PlatformConfig` singleton (database.md plan realized): BR-17 rates, BR-18/30 floors, BR-40 window — data-migration-seeded from the historical constants; domain code reads via `apps.core.services`; `/portal/config` writes ONLY via `portal.services.config_editor` (whitelist + bounds + `platform.config_updated` audit before/after; `default_currency` immutable); admin = write, support = read (403 on write, tested) |
| Users | `/portal/users` — verified/role/expert-status/aggregate counts; edits stay in Django admin |
| API | `/api/v1/ops/*` (api.md section): staff-gated (`IsSupport\|IsAdmin`; config write admin-only) — anon 401, students 403, support-write-config 403 all tested |
| Charts | dependency-free inline SVG trend bars (Recharts deferred — 220 kB budget decision, admin-journey.md); tables scroll-contain on mobile |
| Seed | `seed_demo` portal funnel: completed order (+payout, review+reply), open dispute, resolved dispute with full refund, off-platform report — idempotent (unique-state guarded), service-driven, dev/test-guarded |
| Tests | backend **340 passed** (+14 portal: authz 401/403/support-vs-admin, KPI math vs fixtures, moderation idempotency, config validation/audit/domain-behavior, reconciliation detection + clean pass); FE vitest **68 passed** (+10: KPI cards, trend bars, range control, money formatting, moderation queue actions/filters/guards); lint/format/import-linter/migrations/env-docs clean; bundle budgets green; CI 4/4 |
| Deferred (recorded, not silent) | Recharts (budget decision); account warning/suspension service (business-rule change); `/portal/orders` + `/portal/expert-applications` (Django admin deep-links chosen); export/CSV of audit (post-MVP); expert `rating_of_student` surfacing (private per BR-37) |
| Key commits | `dfefc87` (docs checkpoint), `a031fe1` (docs-first plan), `6e637cb` (backend), `c2471e6` (FE), `64f75d9` (docs sync), completion commit (roadmap + handoff) |

## Phase 11 — completion record (Security, Testing & Performance)

**Status: ✅ complete.** Security/reliability hardening verified by an expanded test estate, dependency auditing in CI, a Playwright E2E pack that runs the four golden journeys against the real compose stack, enforced performance budgets — and, the phase's defining work: the E2E pack was made to exercise the *real* application, which surfaced and fixed seven genuine product defects the unit suites could not see.

| Area | What exists |
|---|---|
| Docs-first audit | `docs/architecture/security-audit-phase11.md` — findings F-1..F-8 with dispositions (F-1/3/4/5 fixed in-phase; F-2 CSP ships report-only, enforcement = Phase 12 pre-launch gate; F-6 ongoing; F-7 Phase 12; F-8 documented). No material change preceded the audit doc (`5cb067e`) |
| Authorization matrix | `backend/apps/portal/tests/test_authorization_matrix.py` — parametrized role × endpoint × expectation across all apps (Phase 10 `/ops` surfaces included) |
| Backend hardening | ops write-throttles (`THROTTLE_OPS_WRITE`), concurrency race suites (DomainError/OperationalError asserts), security posture fixes (`7187e52`) |
| FE security + a11y | security headers on Next (`next.config.ts`: CSP report-only, Permissions-Policy, nosniff, DENY, referrer policy; HSTS prod-only) + Radix drawer a11y (`b509286`); FE never the authz layer |
| Dependency audit | `pip-audit` + `npm audit` CI gates (fail on high/critical; documented suppressions); patched postcss pin |
| E2E pack | Playwright journeys 01 student funnel (register→verify→request→offer→select→pay→deliver→approve→review), 02 dispute (self-sufficient order build → dispute+evidence → thread → admin take-case → BR-41 refund → outcome asserted), 03 managed service (managed submit → in_review → direct assignment in admin → accept → pay), 04 admin/portal (dashboard→moderation→disputes→audit→reconciliation→config→users) + smoke; shared `e2e/helpers.ts` (hydration-retry register/login, q2 delivery-log token polling, `ADMIN_BASE` origin) |
| Compose smoke wiring | worker stdout streamed to the e2e delivery log (`docker compose logs -f worker > /tmp/hem-mail.log`); dev backend runs `runserver` (daphne ASGI) — raw uvicorn serves no `/static/`, which silently no-oped Django-admin bulk actions; diagnostics artifact uploaded on failure; failure dump ships error context + admin request lines + mail tail |
| Performance | query-count budgets enforced (`apps/portal/tests/test_query_budgets.py`: feed/directory ≤12, threads/order detail ≤14, KPIs ≤40); bundle budgets enforced post-build (`scripts/check-bundle.mjs`); `docs/architecture/performance.md` baseline written with the measured snapshot (159–172 kB first-load, all budgets respected) |
| Real defects found by E2E (all fixed app-side with regressions) | taxonomy `{terms}` contract crash on every RequestForm mount; `not_applied` excluded from `isApplicationEditable` (first-time applicants could never see the apply form); multipart upload field `uploaded_file` → `file` + `{attachment:{id}}` unwrap (dispute evidence, chat attachments, delivery uploads never worked from the UI); `credential_ids` JSON list wrapped as a single UUID → 500 (malformed ids now the 400 envelope); `mode` dropped by the create-path allowlist (managed requests silently created as open — BR-06/BR-19); dispute admin change form TemplateSyntaxError 500 (invalid `{{ … if False }}` expression) |
| Tests | backend pytest **367 passed**; FE vitest **70 passed**; lint/typecheck/build/bundle budgets green; ruff+format clean; import-linter kept; `makemigrations --check` clean; env-docs gate green; **Playwright 6/6 locally (2.9 m, CI retries)**; CI **4/4** |
| Env/docs | env-docs gate green (36 vars documented); `docs/architecture/testing.md` E2E environment contract (stack origins, delivery log, admin base URL, hydration retries, seed dependencies); CSP report-only decision recorded |
| Deferred (recorded, not silent) | CSP enforcement (Phase 12 pre-launch gate, needs nonced inline bootstrap); audit F-7 items (Phase 12); ongoing F-6 |
| Key commits | `5cb067e` (audit docs-first) → `7187e52` (backend hardening) → `b509286` (FE headers/a11y) → `57570f1` (E2E+perf+audits) → `941ac41`/`414b039`/`01285ec`/`649e77e` (e2e repair chain) → `e89ca44`/`649eba3`/`79f1905`/`f839b62`/`4cecb9c`/`e8517b7` (e2e-exposed defect fixes + wiring) → completion commit (roadmap + handoff) |
| CI | run **`36127464977`** — ✓ 4/4 on `e8517b7` (Backend · Frontend · Docs sync · Compose smoke) |

### Phase 11 follow-up fixes — branch `arena/01a0d790-knowledge-marketplace` (PR → `arena/01a0cd90-knowledge-marketplace`)

Found while verifying the E2E pack against real application behavior; each fixed at the root with regressions, on top of `0e20b75`.

| Area | Fix |
|---|---|
| Owner triage form (Django admin, ADR-0010) | The direct-assignment add form required four values `assign_direct` computes (expert-name snapshot, currency, 24h expiry, deciding admin) and silently discarded what the owner typed (typed EUR / a 2030 expiry / another admin → stored USD / now+24h / the acting admin, reported success); the expert picker listed every user. Now: service inputs only (request, expert, amount, deadline, scope note); picker = `service_requests.eligible_experts()` (approved + available, labelled `expert:<slug>`); admin LogEntry + message reference the created row. Journey 03 no longer fakes those inputs. |
| Delivery file uploads | Still posted with a raw relative `fetch("/api/v1/files")` → the Next origin in dev/compose and the split deploy (`POST :3000/api/v1/files` → 404): every delivery with a file failed. Now uses the shared `uploadFile` client (API origin + credentials + backend contract). |
| Regression coverage | Dispute resolution form renders and executes from the admin (the `e89ca44` template fix had no test); every registered admin page renders for the owner over the seeded dataset. |
| Tests | backend pytest **373 passed** (+6); FE vitest **71 passed** (+1); ruff/format/import-linter/`makemigrations --check`/env-docs green; build + bundle budgets green; Playwright **6/6** locally on the runserver compose mirror (`CI=1`) |
| Deferred (recorded) | `SessionProvider` maps any `/api/v1/me` failure (429 / 5xx / network) to signed-out, so the app layout redirects to login. Observed under the dev per-user throttle during back-to-back E2E attempts; needs a UX decision (retry/backoff vs. error state) → Phase 12 hardening. |
| Commits | `1f6b415` (triage form) → `6d83225` (admin regressions) → `7916549` (delivery upload) → `4ef2353` (journey 03) |
| CI | run **`36128869883`** — ✓ 4/4 on `4ef2353` (Backend · Frontend · Docs sync · Compose smoke) |
