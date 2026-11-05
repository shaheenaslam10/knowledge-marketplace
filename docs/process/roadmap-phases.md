# Development Phases, Dependencies & Acceptance Criteria

> Status: **Phase 11 ✅ complete · Next: Phase 12 (Production Deployment)** · Last updated: Phase 11 final integration (PR #1 merged as `3bd92b7`; canonical CI `36224637860` ✓ 4/4)
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
| 11 | Security, Testing & Performance | all | ✅ docs-first security audit (F-1..F-8, dispositions recorded), authorization-matrix suite, backend hardening (ops throttles, concurrency races), CSP/headers (CSP report-only; enforcement = Phase 12 gate), pip-audit + npm-audit CI gates, Playwright E2E pack (4 journeys + smoke over compose), query-count budgets + bundle budgets + `docs/architecture/performance.md`, compose smoke 4/4; follow-up fixes (triage form, delivery upload) merged via PR #1 → `3bd92b7` |
| 12 | Production Deployment | 11 | ✅ **deployment architecture prepared and verified; not yet deployed to a host** — `docker-compose.prod.yml` + `deploy/Caddyfile` (ADR-0016), prod-only image stage + fail-closed `entrypoint.prod.sh`, `deploy.sh`/`rollback.sh`/`smoke_test.sh` (22 checks, run green against a real prod-settings stack), encrypted backups + **restore drill passed incl. BR-33 on restored rows**, production safety checks `hem.E001-E012`/`W001-W006`, `ops_report` CLI signals, **enforced nonce CSP (closes audit F-2)**, legal pages, host-aware routing (ADR-0013), CD workflow + CI `deploy-config` job. Blocked on owner actions only: host, domain, R2, email, uptime monitor |

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

### Phase 11 follow-up fixes — merged into `arena/01a0cd90-knowledge-marketplace` via PR #1 (`3bd92b7`)

Found while verifying the E2E pack against real application behavior; each fixed at the root with regressions, on top of `0e20b75`. Developed on `arena/01a0d790-knowledge-marketplace` and integrated by PR #1 as merge commit `3bd92b7` (parents `da043cb` + `cf47dbd`; commit history preserved, nothing force-pushed).

| Area | Fix |
|---|---|
| Owner triage form (Django admin, ADR-0010) | The direct-assignment add form required four values `assign_direct` computes (expert-name snapshot, currency, 24h expiry, deciding admin) and silently discarded what the owner typed (typed EUR / a 2030 expiry / another admin → stored USD / now+24h / the acting admin, reported success); the expert picker listed every user. Now: service inputs only (request, expert, amount, deadline, scope note); picker = `service_requests.eligible_experts()` (approved + available, labelled `expert:<slug>`); admin LogEntry + message reference the created row. Journey 03 no longer fakes those inputs. |
| Delivery file uploads | Still posted with a raw relative `fetch("/api/v1/files")` → the Next origin in dev/compose and the split deploy (`POST :3000/api/v1/files` → 404): every delivery with a file failed. Now uses the shared `uploadFile` client (API origin + credentials + backend contract). |
| Regression coverage | Dispute resolution form renders and executes from the admin (the `e89ca44` template fix had no test); every registered admin page renders for the owner over the seeded dataset. |
| Tests | backend pytest **373 passed** (+6); FE vitest **71 passed** (+1); ruff/format/import-linter/`makemigrations --check`/env-docs green; build + bundle budgets green; Playwright **6/6** locally on the runserver compose mirror (`CI=1`) |
| Deferred (recorded) | `SessionProvider` maps any `/api/v1/me` failure (429 / 5xx / network) to signed-out, so the app layout redirects to login. Observed under the dev per-user throttle during back-to-back E2E attempts; needs a UX decision (retry/backoff vs. error state) → Phase 12 hardening. |
| Commits | `1f6b415` (triage form) → `6d83225` (admin regressions) → `7916549` (delivery upload) → `4ef2353` (journey 03) → `cf47dbd` (docs record) → merged as `3bd92b7` |
| CI (branch) | run **`36128869883`** — ✓ 4/4 on `4ef2353`; PR #1 merge-result run `36222723033` — ✓ 4/4 |
| Integration | Pre-merge audit: canonical already held every other Phase 11 fix (security, performance, E2E repairs); its only commit not on the branch (`da043cb`) was docs — no duplicate or obsolete implementation, no conflicts. The exact merge tree was verified locally before merging: backend **373 passed** + ruff/format/import-linter/migrations/pip-audit; FE lint/typecheck/audit/vitest **71**/build/bundle budgets; env-docs; Playwright **6/6** on the compose-smoke mirror. `3bd92b7` landed with that identical tree. |
| CI (final canonical) | run **`36224637860`** — ✓ 4/4 on `3bd92b7` (Backend · Frontend · Docs sync · Compose smoke) |

---

## Phase 12 — Production Deployment (record)

> **Status: deployment architecture prepared, verified and committed. Nothing is
> deployed.** No hosting, DNS, object-storage, email or payment credentials
> exist in this project, so staging and production remain unreached. Every
> claim below was executed locally in this repository; nothing is inferred from
> a commit message, and no external service was activated.

### The three states, kept apart deliberately

| Stage | State |
|---|---|
| Deployment architecture prepared | ✅ done and verified |
| Staging deployed | ❌ blocked on owner actions (host + domain) |
| Production deployed | ❌ blocked on the same |

| Area | What shipped |
|---|---|
| Docs-first | **ADR-0016** (single-host Caddy + compose, Postgres swappable to Neon, staging = same compose + a different env file) and **ADR-0017** (nonce CSP in middleware, `style-src 'unsafe-inline'` residual) written and committed **before** any implementation, per the handoff's Phase 12 item 1 |
| Topology | `docker-compose.prod.yml` — db/api/worker/web behind `caddy`. Caddy is the only service publishing ports; **Postgres publishes none**, closing audit F-7's exposure item structurally. `name: hem-${DEPLOY_ENV}` gives staging and production separate volumes/networks on one host. `${VAR:?}` guards fail the deploy on a missing secret instead of at runtime |
| Ingress/TLS | `deploy/Caddyfile` — automatic Let's Encrypt, static files served straight off the collectstatic volume with immutable caching, 3600 s proxy timeouts on the API host for long-lived WebSockets (ADR-0004), apex→www redirect |
| Image | `backend/Dockerfile` gains a `deps-prod` stage installing without the `[dev]` extra — pytest/ruff are no longer shipped to production |
| Boot gate | `backend/docker/entrypoint.prod.sh`: wait for DB → `check --deploy --tag production --fail-level WARNING` → `migrate` → `collectstatic` → exec. **Fail-closed**: a misconfigured container refuses to boot |
| Safety checks | `apps/core/checks.py` — `hem.E001`–`E012`, `hem.W001`–`W006`. Gated on `DEPLOY_ENV`, because `config.settings.prod` is loaded by staging *and* production and cannot tell them apart |
| Deploy/rollback | `scripts/deploy.sh` (refuse dirty tree → record release → pre-deploy backup → build → health → smoke → **auto-rollback on failure**), `scripts/rollback.sh` (code only; forward-only/additive-first migration policy documented — a bad migration is a restore, not a rollback) |
| Smoke | `scripts/smoke_test.sh` — 22 assertions incl. **CSP enforcing, nonce present, header nonce matching the rendered document**, no `unsafe-inline`/`unsafe-eval`, auth boundary on `/api/v1/me` + `/api/v1/ops/kpis`, legal pages. Exit 1 ⇒ roll back |
| CSP (audit **F-2 CLOSED**) | `frontend/src/middleware.ts` mints a per-request nonce and sets the policy on **both** the request and the response — Next reads the nonce from the request header. `SECURITY_HEADERS_CSP_REPORT_ONLY` now defaults to **False** |
| Backups | `scripts/backup_db.sh` (`pg_dump -Fc` → AES-256 → SHA256 sidecar → retention → off-host hook) and `scripts/restore_backup.sh` (checksum **before** decrypt → restore → row counts → **BR-33 ledger identity on restored rows**) |
| Monitoring | `manage.py ops_report` implemented (it had been documented for two phases without existing), reusing `reconciliation_report()` so CLI and portal cannot disagree; nine signals, **non-zero exit** when any needs attention. Uptime/Sentry wiring documented as owner actions |
| Legal | `/terms`, `/privacy`, `/academic-integrity` on the marketing experience, linked from the footer |
| Host routing | ADR-0013's three-experience host map implemented in middleware; redirects only when all three host vars are set, so dev/CI keep serving every path from one origin |
| CD | `.github/workflows/deploy.yml` — refuses commits CI has not passed, runs inside a GitHub Environment (required reviewers = the approval gate), external smoke over real DNS/TLS, auto-rollback. Stops at preflight with an explicit error when deployment secrets are absent rather than appearing to succeed |
| CI | new **`deploy-config`** job (compose + Caddy validation, every shell script parsed); the Backend job now asserts the production safety checks **in both directions** so the fail-closed gate cannot be quietly neutered |
| Phase 11 carry-over fixed | `SessionProvider` mapped *any* `/api/v1/me` failure to signed-out, so a 429/5xx/network blip ejected a live session. Now 401/403 sign out immediately while transient failures retry with backoff and surface an `unreachable` state with a retry action |

### Verification actually performed

| Check | Result |
|---|---|
| Backend pytest | **407 passed** (373 baseline + 34 new) |
| ruff / format / import-linter / `makemigrations --check` | ✅ / ✅ / 2 contracts kept / no changes |
| Frontend eslint / tsc / vitest | ✅ / ✅ / **102 passed** (19 files) |
| Production build + bundle budgets | ✅ |
| env-docs gate | ✅ 37 vars |
| **Smoke test against a real stack** under `config.settings.prod` | **22 passed, 0 failed** |
| **Safety checks, dangerous config** | refused — `hem.E001/E008/E010/E011`, `W002×2`, `W006`, exit 1 |
| **Safety checks, correct config** | passed, exit 0 |
| **Safety checks, local dev** | inert, exit 0 |
| **Restore drill** | **passed** — 541 objects, BR-33 `identity_violations 0`; negative paths (wrong passphrase / corrupted archive / missing file) each fail distinctly with 0 leftover databases |
| `ops_report` live run | 9 signals, `payouts.failed 1 [ALERT]`, non-zero exit — the alert path fired on a real anomaly |
| Playwright E2E, compose-smoke | compose-smoke ❌ not runnable locally (Docker absent, apt blocked); rely on CI. **Playwright: superseded 2026-09-28 — E2E IS runnable here** (browser sourced from the npm package `@sparticuz/chromium`; recipe in PROJECT-HANDOFF.md). Executed 13/13 against a production build, and it immediately caught the release-blocking CSP defect recorded below. |

### Acceptance criteria — honest status

| Criterion | Status |
|---|---|
| Staging + production reachable over HTTPS with enforced headers | ❌ **not met** — no host exists. The configuration that produces it is complete and its header posture is verified locally |
| Restore drill passed with documented evidence | ✅ met — [backup-recovery](../architecture/backup-recovery.md#restore-drill-evidence) |
| Uptime monitor green | ❌ not met — needs a public URL; probe + runbook documented |
| Live order cycle in manual-payment mode | ⚠️ exercised end-to-end by the Phase 11 Playwright journeys and the backend suite, **not** against a deployed environment |
| All standard gates green | ✅ locally; CI authoritative |
| Roadmap + handoff updated in the completion commit | ✅ |

**Phase 12 is therefore not complete.** What remains is not code: it is
provisioning a host, a domain, R2, an email sender and an uptime monitor — the
owner actions listed in [deployment.md](../architecture/deployment.md#owner-actions-required-before-a-real-deploy).
Marking it done would misrepresent the state of the product.

### Deviations from the Phase 0 plan (recorded, not silent)

| Plan | Reality | Why |
|---|---|---|
| `scripts/reset_prod.py` to strip seed data | Not built; the guard lives **inside** `seed_demo`, which refuses `DEPLOY_ENV=production` | A cleanup script only helps if someone remembers to run it; a refusal cannot be forgotten |
| Stripe live keys + webhook in the launch checklist | Manual gateway remains the payment path | ADR-0005: no credentials exist, and none were fabricated |
| Restore drill "on staging data" | Drilled on seeded development data | No staging host exists yet. Script path, encryption, checksum, restore and money-integrity verification are all real; only the off-host copy is unproven |

---

## Post-Phase-12 completeness audit (record)

**Why:** Phase 12 ended blocked on owner provisioning. Instead of idling, the whole
codebase was audited against the four experiences to find work that was genuinely
incomplete rather than merely unreported. Full narrative in
[PROJECT-HANDOFF.md](PROJECT-HANDOFF.md#post-phase-12-audit-2026-09-28--two-real-gaps-found-and-closed).

**Came back clean:** 0 TODO/FIXME/HACK markers across 18 backend apps and 37
frontend pages · 7 `ops/*` routes ↔ 7 portal pages, no orphans · 4 Playwright
journeys + smoke matching the docs · commission rates correctly `PlatformConfig`-backed
(`0.1500` / `0.2000`, unchanged — verified, not modified).

**Fixed:**

| # | Finding | Resolution | Commit |
|---|---|---|---|
| 1 | 4 of 24 declared notification types had no emit site — the feature was dead | `request_new_offer`, `payout_scheduled`, `payout_failed` wired at their service call sites; `order_auto_approve_warning` added as an hourly job (migration `0008`), deduped via a persisted `auto_approve_warned` event | `7e97faf` |
| 2 | 15%/20% commission charged but disclosed on no public page; `/pricing` specified since Phase 0, never built | `GET /api/v1/platform/pricing` (`AllowAny`, `PlatformConfig`-backed) + `/pricing` with FAQPage JSON-LD + `sitemap.ts` (also never built) + `robots.ts` hardened to exclude authenticated surfaces | this commit |

**Test deltas:** backend pytest 407 → **426**; frontend vitest 102 → **115**.

**Three defects were caught only by live end-to-end verification**, not by unit
tests — recorded because the pattern will recur in this codebase:

1. Any marketing route that fetches from the API **must not be prerendered**. The web
   image builds with no API reachable, so a build-time fetch bakes the degraded state
   into the HTML and ISR keeps serving it. `/pricing` and `sitemap.ts` are both
   `force-dynamic` for this reason.
2. Cache TTL on a price disclosure is a correctness question, not a performance one.
   Commission is fixed at booking time, so a 1h cache meant orders could book at a
   rate the page never advertised. 60s.
3. `to_major()` returns a float suitable for arithmetic, not display. Use
   `format_money()` for anything a user reads.

**Still deliberately unbuilt** (marketing surface only, docs place them in Phase 4+):
`/for-experts`, `/about`, `/subjects/[slug]`, `/blog/*`, OG image generation, and
`request_new_matching` (needs matching fan-out + daily digest).

---

## Public marketing surface completed (record)

**Why:** the Phase-12 audit listed `/for-experts`, `/about`, `/subjects/[slug]` and
`/blog/*` as the remaining non-owner-blocked gaps. Three were built; the fourth was
found to be an explicit product decision, not an omission.

| Route | Status | Notes |
|---|---|---|
| `/subjects/[slug]` | ✅ built | "Find help in {subject}" over real taxonomy: expert cards, how-it-works snippet, empty state, related subjects, BreadcrumbList + CollectionPage JSON-LD |
| `/subjects` | ✅ built (**addition**) | seo-ux asked for "hub-and-spoke internal links" but never named a hub; without one the spokes were a crawl island |
| `/for-experts` | ✅ built | Commission read live and inverted to "what you keep"; requirements mirror `ExpertApplyInfoView`; FAQPage JSON-LD |
| `/about` | ✅ built | Factual only — no founding story, team, investors or usage claims, because the repository contains no such facts |
| `/blog/*` | ⛔ **not built, by decision** | `mvp-scope.md` lists Blog/CMS in the *out-of-MVP* table ("Directory + subject pages first") and no content architecture exists. Building one would invent a deferred system |

**Backend:** `GET /api/v1/subjects` and `GET /api/v1/subjects/{slug}`, both `AllowAny`,
implemented in `apps.experts` (not `apps.taxonomy` — import-linter places experts
above taxonomy, and these endpoints count experts). Both reuse `directory_queryset()`,
so a subject page can never advertise an expert the directory would hide.

**Test deltas:** backend pytest 426 → **439**; frontend vitest 115 → **142**.

**Caught by live verification, not by unit tests** — the same lesson as the previous
milestone, now with a shared abstraction to stop it recurring:

1. Subject **parents are taxonomy categories**, which have no landing page. The first
   implementation linked them to `/subjects/{parent.slug}`, a guaranteed 404. Parents
   now render as a label. Found by running the page against seeded data.
2. `/for-experts` initially reused the pricing API's `description` fields, which are
   written for students ("you post a request and experts bid") — wrong audience on
   the supply-side page. Only `percent` and `label` are shared now.

The three decisions that made `/pricing` correct (never prerender, cache the data not
the route, never cache a failure) are now implemented once in
`frontend/src/lib/api/public.ts` and reused by all four data-driven marketing pages.

### Latent flaky test found and fixed — likely the CI anomaly from the previous session

Running the full suite repeatedly surfaced `apps/experts/tests/test_services.py::
test_slug_uniqueness` failing intermittently. `ExpertProfile.Meta` declares no
`ordering`, so `ExpertProfile.objects.values_list("slug", flat=True)` has **no
guaranteed row order** — the test's `slugs[1]` assumed insertion order and Postgres
is free to return either row first depending on heap layout. It passes in isolation
and fails only once other tests have churned the table, which is precisely the
signature of the unexplained CI failures on commit `d78196d` (a Backend job failing
on a SHA that passed the same job in another run). Fixed by ordering on `pk`, which
is what the test actually meant. A scan for the same pattern across the suite found
no other instance, and 16 models carry no default ordering, so the class of bug is
worth remembering.

**SEO consistency verified live** against a `config.settings.prod` stack: 23 internal
URLs crawled with **0 broken links**; every sitemap URL returns 200 and is indexable;
empty subjects are `noindex` *and* omitted from the sitemap; canonicals and
`robots.txt` `Host`/`Sitemap` use the production hostname, not localhost; with the API
down and a cold cache every page still returns 200, degrades honestly and invents no
numbers.

### Post-Phase-12 audit — E2E executed for the first time, release-blocking CSP defect found and fixed (2026-09-28)

**What changed:** the Playwright suite had never actually been *run* in this environment
(the sandbox cannot reach `cdn.playwright.dev`, so `npx playwright install` fails).
A browser was obtained from the npm package `@sparticuz/chromium`, which ships binaries
in-package, and the suite was pointed at a **production build** via the pre-existing
`E2E_CHROMIUM_PATH` override in `playwright.config.ts`.

**What it caught immediately:** the enforced nonce CSP was blocking **all JavaScript on
33 of 45 routes**. A statically prerendered page is built without a request, so Next
cannot stamp the per-request nonce; `'strict-dynamic'` then makes `'self'` inert and the
browser refuses every chunk. Affected routes included `/login`, `/register`, `/account`,
`/orders`, `/messages`, `/experts`, `/requests`, `/offers`, `/assignments`,
`/opportunities`, all `/expert/*` and all `/portal/*` — effectively the entire
authenticated product. Pages still returned `200` with correct SSR HTML and a correct
CSP header, so every existing gate passed: curl sweeps, link crawls, middleware unit
tests (header strings), and `scripts/smoke_test.sh` (which compared the nonce only on
`/`, the one route that was already dynamic). This is the concrete reason the phase
record now treats "verified by curl" as insufficient evidence for anything that depends
on client-side execution.

**Fix:** the root layout awaits `headers()`, opting every document route into on-demand
rendering (**ADR-0018**). The ADR-0017 security posture is unchanged — still enforcing,
still no `unsafe-inline`/`unsafe-eval` in `script-src`.

**Two further findings, both benign, both recorded rather than changed:**
- `frontend/Dockerfile`'s `prod` stage does not re-declare the `NEXT_PUBLIC_*` env vars,
  so the image is not self-sufficient — the middleware would compute `connect-src 'self'`
  and block API calls. `docker-compose.prod.yml` does pass them as runtime `environment:`,
  so the supported deployment path is correct; running the bare image is not.
- Django serves no static files under ASGI by design (no whitenoise); Caddy serves
  `/static/*` from the shared `staticfiles` volume. Locally this means the Django admin
  has no CSS/JS under `uvicorn`, which breaks admin-driven E2E steps — `manage.py
  runserver` (Daphne, `DEBUG=True`) is the faithful local substitute.

**Verified after the fix:** backend `pytest` **439 passed**; frontend `vitest` **143
passed / 25 files**; `tsc`, `eslint` (covers `e2e/`), `ruff`, `ruff format`,
`lint-imports` 2/2 all clean; production build clean with all routes `ƒ`;
**Playwright 13/13 green** (4 business journeys + 2 smoke + 7 new CSP guards);
`scripts/smoke_test.sh` **24/24**.

**New regression coverage:** `frontend/e2e/csp-nonce.spec.ts` asserts every executable
script carries the policy nonce and that the app genuinely hydrates with zero
CSP-blocked requests; `scripts/smoke_test.sh` now samples `/`, `/login` and `/about`.

### Recovery-session audit (2026-09-28, later) — Git recovery blocked; two findings recorded

**Git recovery could NOT be performed.** The sandbox has **no network route to
GitHub at all**: `github.com`, `api.github.com` and `codeload.github.com` all return
`000`, and `git fetch` dies with `gnutls_handshake() failed`, while
`registry.npmjs.org` returns `200`. This is a network block, not an expired token, so
fetching `d78196d`, inspecting PR #3, reading CI logs and pushing were all impossible.

One durable improvement was made: the clone's fetch refspec was widened from
`+refs/heads/main:refs/remotes/origin/main` to `+refs/heads/*:refs/remotes/origin/*`,
so the next session with connectivity can see `arena/*` branches immediately.

**Why no commit was created.** `24437a5` is an *initial commit containing exactly one
file* — a 1-line `README.md`. Committing the working tree on top of it would produce a
single 547-file commit that squashes the entire project (phases 0–12, the 10-commit
chain ending at `d78196d`) into one blob, and would diverge from the remote branch such
that only a force-push could reconcile it. That is precisely the destructive rewrite the
recovery procedure in `PROJECT-HANDOFF.md` warns against, so the tree was left
uncommitted. All build/test artifacts, caches, media and env files are correctly
gitignored, so the 547 files are genuine source with nothing to prune.

#### Finding 5 — `test_slug_uniqueness`: mechanism proven locally, CI causation still unverified

The ordering hypothesis was tested rather than assumed. In Postgres, updating a row
rewrites its tuple at the heap tail, which flips the order an unordered sequential scan
returns:

```
fresh heap          -> ayra-k, ayra-k-2
after UPDATE row 1  -> ayra-k-2, ayra-k     <- slugs[1] becomes "ayra-k"
ORDER BY pk         -> ayra-k, ayra-k-2     (stable)
```

With the pre-fix code, `slugs[1].startswith("ayra-k-")` fails in the second case, and the
approval flow the test exercises does update the profile row — so the flake is fully
explained. The fix (`ExpertProfile.objects.order_by("pk")`) then ran **25/25 green** in
isolation and the module ran clean five times in a row.

**Status: mechanism demonstrated, CI causation NOT verified.** The failing CI jobs
(`36394737886`, `36396612154`, `36397172392`) could not be inspected from this sandbox.
Do not mark the CI anomaly closed until those logs are read.

#### Finding 6 — expert directory pages have no server-side SEO (documentation was wrong)

`frontend.md` claimed `/experts` and `/experts/[slug]` render with `generateMetadata`,
JSON-LD and canonical. They do not: both files begin with `"use client"` and fetch in a
`useEffect`. Measured against a production build:

| Route | canonical | JSON-LD | `<title>` |
|---|---|---|---|
| `/experts` | 0 | 0 | generic site title |
| `/experts/[slug]` | 0 | 0 | generic site title |
| `/subjects/python` | 1 | 2 | per-page |
| `/pricing`, `/for-experts` | 1 | 2 | per-page |
| `/about`, `/subjects` | 1 | 0 | per-page |

So every expert profile — the core indexable content of a directory marketplace, and a
route listed in `sitemap.ts` — shares one generic title and description. The pages do
render correctly after hydration (verified in a real browser: `h1` = "Ayra K.", working
`/subjects/python` and `/subjects/statistics` links), so this is an **indexing gap, not a
broken page**. The documentation has been corrected to describe reality.

**RESOLVED (same day, following session).** Fixed without touching either tested
client component: a **sibling server `layout.tsx`** was added in each segment.
`experts/layout.tsx` carries static directory metadata; `experts/[slug]/layout.tsx`
fetches the expert via a new `getPublicExpert()` on the shared `fetchPublic` helper
(no duplicated fetch logic) and emits `generateMetadata` + `ProfilePage`/`Person`
JSON-LD, then renders `{children}` unchanged.

Measured after the fix, against a production build:

| Route | canonical | JSON-LD | `<title>` |
|---|---|---|---|
| `/experts` | 1 | 0 | "Find an expert — browse the vetted directory" |
| `/experts/ayra-k` | 1 | 1 | "Ayra K. — Python, data analysis, statistics tutoring" |

Honest-data rules: unknown expert / unreachable API → `robots: noindex, follow`, no
JSON-LD, no fabricated name, and the body still renders its own "This expert profile is
not available" state (verified in a real browser). `aggregateRating` is emitted **only**
when real reviews exist — for `ayra-k` it published `5.0 / 1 review`, matching the page.
Client bundles unchanged (`/experts` 2.69 kB, `/experts/[slug]` 3.16 kB). Regression
suites after the change: pytest 439, vitest 143/25, tsc, eslint, build, budgets,
E2E 13/13, smoke 24/24, sitemap 18/18 all 200. **Now Complete.**

## Part 11 — whole-repository state matrix (2026-09-28, evidence-based)

Classification is one of **Complete · Partially complete · Missing · Intentionally
out of MVP · Owner provisioning required · Production verification required**.
"Complete" here means *implemented and locally verified*; it does **not** mean
CI-verified or deployed — see the CI and deployment rows.

| Area | Status | Evidence / note |
|---|---|---|
| Phases 0–11 | Complete | Per-phase records above; pytest 439, vitest 143/25 green |
| Phase 12 — deployment architecture | Complete | compose + Caddy + prod image + deploy/rollback scripts |
| Phase 12 — staging deployed | Owner provisioning required | No host/domain exists. **Not deployed** |
| Phase 12 — production deployed | Owner provisioning required | **Not deployed** |
| Backend API | Complete | 54 registered v1 route patterns; OpenAPI served; error envelope |
| Subjects API + pages | Complete | `GET /subjects`, `/subjects/{slug}` in `apps.experts`; categories 404; parent never linked |
| Student journey | Complete | E2E `01-student-funnel` green: request → offer → select → pay → deliver → approve → review |
| Expert journey | Complete | apply → review → approve → profile; E2E covers acceptance + earnings |
| Managed / direct assignment | Complete | E2E `03-managed` green: submit → assign → accept → payment |
| Order / payment lifecycle | Complete | Manual gateway active; pay → confirm → ledger → payout → refund |
| Commissions | Complete | 15% open / 20% managed in `core/services.py` L19–20; publicly disclosed on `/pricing` + `/for-experts`; **unchanged** |
| Stripe | Intentionally out of MVP | Prepared, non-functional seam; no credentials by standing constraint |
| Admin / owner portal | Complete | E2E `04-admin-portal` green across KPIs, moderation, disputes, audit, reconciliation, config |
| Auth / authorization | Complete | JWT-in-httpOnly-cookie, role gates, middleware; smoke asserts 401 boundaries |
| Notifications / email | Complete | 14 distinct notification types observed at runtime; console/SMTP/Brevo adapters; per-category preferences |
| File handling | Complete | Local disk dev → R2 adapter prod; presigned downloads |
| Security | Complete | Enforced nonce CSP (ADR-0017/0018), security headers, audit F-2/F-7 closed |
| Rate limiting | Complete | DRF Anon + User + Scoped throttles configured; auth views scoped |
| Audit logging | Complete | 57 `audit_log()` call sites across 11 apps |
| SEO | Complete | Per-page metadata/canonical/OG across marketing + expert routes; JSON-LD on pricing, subject, for-experts, expert profile; sitemap 18/18 → 200; robots hardened |
| Blog / CMS | Intentionally out of MVP | `mvp-scope.md` L44 — "Directory + subject pages first". No `/blog` route exists |
| Responsive UI | Complete | Design system + Tailwind breakpoints; not re-audited this session |
| Backend tests | Complete | 439 passed; `test_slug_uniqueness` 25/25 after the ordering fix |
| Frontend tests | Complete | 143 passed / 25 files; eslint 0 warnings; tsc clean |
| E2E | Complete | 13/13 in a real browser against a production build |
| Deployment smoke | Complete | `scripts/smoke_test.sh` 24/24 against the live local stack |
| Compose smoke | Production verification required | Docker absent in this sandbox; CI-only gate |
| **CI** | **Unknown** | Cannot reach GitHub (SNI-blocked). Last known: push run `36394732444` 5/5, three PR-event runs failed/unknown. **Not verified here** |
| **Commit / push of current work** | **Missing** | Tree validated but uncommitted; `24437a5` is a 1-file base, so committing here would squash all history |
| Backups | Complete | `backup_db.sh` + `restore_backup.sh`; restore drill evidence recorded |
| Object storage (R2) | Owner provisioning required | Adapter complete; bucket + token needed |
| Database | Complete | Postgres 16; migrations clean (`makemigrations --check`) |
| Secrets | Owner provisioning required | `.env.staging` / `.env.production` + GH secrets not created |
| Monitoring / uptime | Owner provisioning required | `/healthz` + `/readyz` exist; UptimeRobot not configured |
| CI/CD pipeline | Complete (definition) / Unknown (execution) | 5 jobs defined + deploy workflow; execution unverifiable from here |

### Session 4 re-validation from a wiped environment (2026-09-28)

The sandbox was reset between sessions: `.venv`, `.pgvenv`, `pgdata`, `node_modules`,
`.next` and the `/tmp` Chromium were all gone; only the 550-file source tree survived.
The entire toolchain was rebuilt from scratch and every gate re-run first-hand:

| Gate | Result |
|---|---|
| backend `pytest` | **439 passed** |
| `test_slug_uniqueness` × 25 | **25 passed / 0 failed** |
| ruff · ruff format · import-linter · `makemigrations --check` | clean · 264 formatted · 2 contracts kept · no changes |
| frontend `vitest` | **143 passed / 25 files** |
| `eslint --max-warnings 0` · `tsc --noEmit` | clean · clean |
| production build | clean — **45 dynamic**, 1 static (`/robots.txt`), budgets respected |
| Playwright E2E | **13 / 13** |
| `scripts/smoke_test.sh` | **24 passed, 0 failed** |
| sitemap | **14 / 14 → 200** |
| env-docs gate | 37 vars |
| Docker Compose smoke | **NOT RUN** — Docker is not installed in this sandbox |

**On the sitemap count:** earlier sessions recorded 18/18. This run shows 14/14 because
the dev database was seeded fresh, so the extra expert profiles that accumulated from
previous E2E runs do not exist. Both numbers are correct for their database state; the
invariant that matters — *every URL the sitemap advertises returns 200* — held in both.