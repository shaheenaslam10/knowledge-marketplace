# Development Phases, Dependencies & Acceptance Criteria

> Status: Phase 1 ✅ complete · Last updated: Phase 1
> Sequence follows the brief's suggested order (no deviations needed — dependencies confirmed consistent). Each phase: deliverables → acceptance criteria → "runs locally" proof. Doc updates happen **inside** each phase.

## Phase overview

| Phase | Name | Depends on | Core deliverables |
|---|---|---|---|
| 0 | Architecture & Documentation | — | ✅ this docs set, ADRs, review |
| 1 | Project Foundation | 0 | ✅ monorepo scaffolds (backend+frontend), Docker Compose, CI, `.env.example`, health endpoints, seed command, lint/test gates, worker pipeline, OpenAPI, error envelope, gateway interface |
| 2 | Authentication & Roles | 1 | register/verify/login/reset, JWT cookies, role model, admin groups, audit middleware, throttles |
| 3 | Student/Expert Profiles | 2 | ✅ profiles, taxonomy, expert application+approval (admin), files app (credentials, avatars), public expert directory API |
| 3.5 | Design & experience architecture (docs) | 3 | ✅ three-experience structure (ADR-0013), design system + motion + component selection (ADR-0014); implementation = design-foundation slice of Phase 4 |
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

**Revised sequence (Phase 3.5 refinement, owner direction):** design architecture ✅ → design system ✅ (docs; implementation = Phase 4 slice) → **marketplace domain → marketplace UX → managed-service UX → payments → communication → admin operations → final visual/performance polish.** The marketplace foundation stays the next functional phase; **no major user-facing marketplace screens are built before the design-system foundation exists in code** (tokens, shadcn base kit, Motion runtime, three experience shells — the design-foundation slice opens Phase 4 and can proceed in parallel with backend domain work). Marketing-site content depth grows with the marketplace-UX and polish phases; the operations portal ships as scaffolding until the admin-operations phase (Django admin remains the ops tool, ADR-0010).

## Per-phase acceptance criteria (summary — detailed gates)

- **Every phase:** backend `pytest` green + frontend `build` green in CI; `docker compose up` gives a working app; README updated; docs updated; committed & pushed with clear message; demo-able via seed data.
- **Phase 4+ (design gate, from 3.5):** new user-facing screens consume the design-system tokens/primitives (no ad-hoc styling systems), vendored patterns are recorded in component-selection.md, and CI bundle checks stay within design-system.md §Performance.
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
