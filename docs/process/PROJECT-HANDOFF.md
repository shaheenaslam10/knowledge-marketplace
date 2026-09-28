# PROJECT HANDOFF — operational continuation document

> **Permanent project rule:** this file is the single continuation document for any new AI agent or developer (Arena, ChatGPT, Gemini, human). It is updated at every phase completion and whenever a plan/architecture/business-rule change is discovered — **before or with** the implementation, never silently. Detailed evidence lives in the linked documents; this file stays a fast, accurate map.
>
> Last updated: **2026-09-28 (Phase 12 deployment architecture prepared & verified — NOT deployed; plus a post-Phase-12 completeness audit that closed four dead notification types and the missing public pricing/SEO surface)**

---

## START HERE

```text
Current phase:      Phase 12 — Production Deployment  ⚠️ PARTIALLY COMPLETE
                    Deployment architecture is prepared, verified and committed.
                    NOTHING IS DEPLOYED. Staging and production do not exist.
                    Remaining work is OWNER ACTION (host, domain, R2, email,
                    uptime monitor), not code — see "BLOCKED ON OWNER" below.
Working branch:     arena/01a0e69d-knowledge-marketplace  (this session's branch)
                    NOTE: earlier handoffs named arena/01a0cd90-…; that branch is an
                    ancestor. This branch fast-forwarded from it — no work was lost.
Latest commit:      see `git log -1` (Phase 12 chain listed in roadmap-phases.md)
Read first:         docs/process/roadmap-phases.md  → "Phase 12 — Production Deployment
                                                       (record)" — honest acceptance status
                    docs/architecture/deployment.md → runbook + owner actions
                    docs/architecture/backup-recovery.md → restore-drill evidence
Since then:         A full-codebase completeness audit ran against the four
                    experiences. It found and FIXED two real gaps (details in
                    "Post-Phase-12 audit" below): four declared-but-never-emitted
                    notification types, and a platform that charged 15%/20%
                    commission while disclosing it on no public page.
Next task:          Owner provisions a host + domain, then:
                      ./scripts/deploy.sh --env staging     (smoke must pass)
                      ./scripts/deploy.sh --env production
                    Then run one live order cycle in manual-payment mode and
                    mark Phase 12 complete in the roadmap.
Do not start:       Stripe activation (no credentials; seam stays non-functional),
                    Redis/Elasticsearch (prohibited), new features/modes/providers,
                    rebuilding Phases 0-11
```


---

## Current project state

| Field | Value |
|---|---|
| Project | Hybrid Expert Marketplace (`knowledge-marketplace`) — three-experience marketplace: open bidding, managed service, one shared order/payment pipeline |
| Current phase | **Phase 12 — Production Deployment ⚠️ architecture prepared, NOT deployed** |
| Next phase | Complete Phase 12 by deploying — blocked on owner-provided infrastructure (scope below) |
| Branch | `arena/01a0e69d-knowledge-marketplace`. Earlier handoffs named `arena/01a0cd90-…`; this branch fast-forwarded from its head (`5decba4`), so that history is fully contained here. `arena/01a0d790-…` is a byte-identical spent PR branch. |
| Latest commit | Phase 12 chain on top of `5decba4`: `f2e0958` (ADR-0016/0017, docs-first) → `d30ec9e` (enforced CSP + legal pages) → `ac38165` (safety checks, ops_report, host routing) → `96d09bf` (backup/restore) → `3dd45cd` (compose + Caddy + prod image) → `30495d5` (deploy/rollback/smoke + CD + CI gate) → completion commit |
| Latest verified CI | Phase 11 canonical: run `36224637860` ✓ 4/4 on `3bd92b7`. **Phase 12 CI run recorded in the final report / roadmap.** CI now has **5** jobs (Backend · Frontend · Docs sync · Deploy config · Compose smoke) |
| Working tree | Verify on takeover: `git status` + `git fetch && git log origin/arena/01a0e69d-knowledge-marketplace -1` |
| Test baseline | backend pytest **426 passed**; frontend vitest **115 passed** (21 files); ruff+format clean; import-linter 2/2; `makemigrations --check` clean; env-docs gate green (37 vars); production build + bundle budgets green. **Smoke test 22/22 against a real `config.settings.prod` stack.** Playwright E2E **6/6** as of Phase 11 (not re-runnable in the current sandbox — no Docker) |
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

| 11 — Security, Testing & Performance | Docs-first security audit (`security-audit-phase11.md`, F-1..F-8 dispositions); authorization-matrix suite (role × endpoint across all apps); backend hardening (ops write-throttles, concurrency race suites); FE security headers (CSP report-only → Phase 12 enforcement gate) + a11y; pip-audit + npm-audit CI gates; Playwright E2E pack — 4 golden journeys over the real compose stack with shared hydration/mail helpers; query budgets (feed/directory ≤12, threads/order ≤14, KPIs ≤40) + bundle budgets + `performance.md`; compose smoke wired to the q2 worker delivery log; **7 real product defects found by E2E and fixed app-side with regressions** (taxonomy contract, first-time apply gate, upload field/response contract, credential_ids JSON, managed `mode` on create, dispute-admin template 500, compose static serving) | `5cb067e`, `7187e52`, `b509286`, `57570f1`, `e89ca44`, `649eba3`, `79f1905`, `f839b62`, `4cecb9c`, `e8517b7`, `3bd92b7` (PR #1 follow-up merge) | ADR-0006 unchanged; CSP enforcement deferred with recorded rationale (F-2) | **Deferred:** CSP enforcement + F-7 → Phase 12 gates; F-6 ongoing; ~~`SessionProvider` treats non-401 `/me` failures (429/5xx) as signed-out~~ **fixed in Phase 12** (401/403 sign out; 429/5xx/network retry with backoff then an `unreachable` state). Follow-up fixes (triage form, delivery upload, admin regressions) merged via PR #1 → `3bd92b7` (canonical CI `36224637860` ✓ 4/4) |

| 12 — Production Deployment | ⚠️ **architecture prepared and verified; NOT deployed.** `docker-compose.prod.yml` (db/api/worker/web/caddy; Postgres publishes no port) + `deploy/Caddyfile` (auto-TLS, static volume, WS timeouts); `deps-prod` image stage (no dev deps in prod) + fail-closed `entrypoint.prod.sh`; `apps/core/checks.py` (`hem.E001`–`E012`/`W001`–`W006`) refusing dev-grade config at boot; `deploy.sh`/`rollback.sh` (auto-rollback; forward-only additive-first migration policy) and `smoke_test.sh` (22 checks, **22/22 against a real prod-settings stack**); encrypted backups + **restore drill passed incl. BR-33 on restored rows**; `ops_report` CLI (9 signals, non-zero exit); **enforced nonce CSP — closes audit F-2**; legal pages + footer; host-aware routing (ADR-0013); `deploy.yml` CD with a GitHub-Environment approval gate; CI `deploy-config` job + both-directions assertion of the safety gate; `SessionProvider` transient-failure fix | `f2e0958`, `d30ec9e`, `ac38165`, `96d09bf`, `3dd45cd`, `30495d5` | **ADR-0016** (single-host Caddy + compose; staging = same compose, different env file), **ADR-0017** (nonce CSP in middleware) | **Blocked on owner actions only** — host, domain, R2, email sender, uptime monitor. Residual: `style-src 'unsafe-inline'` (styled-jsx, ADR-0017); `scripts/reset_prod.py` intentionally not built (guard moved inside `seed_demo`); restore drilled on seeded dev data, not staging data; Playwright + compose-smoke not runnable in the sandbox (no Docker) |

**Major plan changes so far** (all documented before/with implementation): django-tasks → django-q2 (ADR-0002 amendment); payments layering inversion via domain signal (ADR-0005 amendment); no PaymentAttempt/Transaction tables; ledger identity formalized; payout settlement manual-by-design; Stripe explicitly not production-ready until the checklist in `docs/workflows/payments.md` is verified.

---

## Post-Phase-12 audit (2026-09-28) — two real gaps found and closed

Phase 12 left the deployment architecture ready but nothing deployed. Rather than
idle on owner action, a read-only completeness audit ran over the whole codebase
(18 backend apps, 37 frontend pages, all `ops/*` routes, the E2E suite, every
`notify()` call site). Most of it came back clean: **0 TODO/FIXME markers**, 7
`ops/*` routes matched to 7 portal pages with no orphans, 4 E2E journeys matching
the docs, and commission rates correctly `PlatformConfig`-backed. Two findings were
real, and both are now fixed.

### Finding 1 — four notification types were declared but never emitted (commit `7e97faf`)

`CATEGORY_FOR_TYPE` declared 24 notification types. Four had no emit site anywhere,
so the feature was dead: users simply never received them. Naive grepping is
misleading here — `_EVENT_COPY` maps *event keys* to *notification types*, so the
alias map has to be resolved before calling a type dead.

| Type | Now emitted from | Recipient |
|---|---|---|
| `request_new_offer` | `bidding/services.py::submit()` | student — no amount in the payload (BR-15) |
| `payout_scheduled` | `payments/services.py::schedule_payout()` | expert |
| `payout_failed` | `payments/services.py::mark_payout_failed()` | expert |
| `order_auto_approve_warning` | `orders/services.py::auto_approve_warning()`, hourly | student, T-24h before the 72h auto-approve (BR-24) |

The auto-approve warning is a new hourly job following the existing
`deadline_reminder()` template, deduped through a persisted `auto_approve_warned`
`OrderEvent` so a restart or overlapping run cannot double-notify. Migration `0008`.
12 wiring tests live in **`apps/portal/tests/`**, not `apps/notifications/tests/` —
import-linter enforces layering on test files too, and cross-app tests must sit in
the top layer.

`request_new_matching` remains the one genuine deferral: it needs matching fan-out
plus a daily digest, which is post-MVP scope.

### Finding 2 — commission was charged but never publicly disclosed

The platform takes 15% (open bid) / 20% (managed) and disclosed it **nowhere a
prospective user could see**. `/pricing` was specified in `seo-ux.md`,
`frontend.md` and `web-experiences.md` since Phase 0 but never built, and
`/how-it-works` never mentions fees. For a marketplace this is a trust and
arguably a consumer-disclosure problem, not a missing nice-to-have.

Shipped:

- **`GET /api/v1/platform/pricing`** (`AllowAny`) — rates and money floors read live
  through `apps.core.services`, so the published number cannot drift from the number
  charged. Operational config (auto-approve windows, reminder schedules) is
  deliberately excluded; a test asserts it does not leak.
- **`/pricing`** — commission cards, thresholds, FAQ, FAQPage JSON-LD, and an honest
  degraded state that invents no numbers when the API is unreachable.
- **`sitemap.ts`** — specified since Phase 0, never built. Static routes + every
  approved expert profile via cursor pagination.
- **`robots.ts`** — previously allowed `/` and nothing else, advertising every
  authenticated surface as crawlable. Now disallows the `(app)`/`(portal)` groups,
  `/api/` and the auth screens, and points at the sitemap.

**Three bugs were caught by live end-to-end verification that the unit tests could
not see** — worth remembering, because the pattern will recur:

1. `/pricing` was prerendered at build time. The web image builds with no API
   reachable, so the build baked the "rates unavailable" state into the HTML and ISR
   kept serving it. The page is now `force-dynamic` with a data-layer cache.
2. The 1h cache meant an operator's rate change stayed invisible for an hour while
   orders booked at the new rate. TTL is now 60s — commission is fixed at booking
   time, so an hour is too long to be wrong about money.
3. `min_offer.display` returned a bare float (`5.0`, rendering as "5"). It now uses
   the project's canonical `format_money()` (`"5.00 USD"`).

A fourth apparent bug — `robots.txt` baking `localhost:3000` — turned out to be a
local-build artifact only: `docker-compose.prod.yml` passes `NEXT_PUBLIC_SITE_URL`
as a required (`:?`) build arg. Verified by rebuilding with the arg set.

Still absent and deliberately **not** built (marketing surface, no product behaviour,
docs place them in "Phase 4+"): `/for-experts`, `/about`, `/subjects/[slug]`,
`/blog/*`, and OG image generation.

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
| Single host, Docker Compose + Caddy; no PaaS lock-in; Postgres swappable to Neon by changing `DATABASE_URL` | free-first; auto-TLS with no cert management; one compose file is the whole deploy | ADR-0016 |
| Staging = the **same** compose file with a different env file; `DEPLOY_ENV` separates volumes/networks | staging only predicts production if it is the same code path | ADR-0016 |
| CSP is **enforcing** with a per-request nonce (middleware sets it on request *and* response) | closes audit F-2; report-only is a canary, not a destination | ADR-0017 |
| Migrations are **forward-only and additive-first**; rollback restores code, not data | makes a code rollback safe against a newer schema | `docs/architecture/deployment.md` |
| A deployment **fails closed**: dev-grade config refuses to boot | a broken production is worse than a refused one | `apps/core/checks.py` |
| Docs-as-source-of-truth; Discover → Document → Implement → Test → Update handoff → Commit → Push | process rule | `docs/process/development-workflow.md`, this file |

---

## NEXT PHASE

### Finish Phase 12 — the remaining work is provisioning, not programming

**State.** The deployment architecture is built, committed and verified.
Staging and production have **never been deployed**, because no hosting,
domain, object-storage, email or payment credentials exist in this project.
Those three states are tracked separately on purpose — see
`docs/architecture/deployment.md` §Deployment status. Do not report this phase
as complete until a real environment is reachable.

**What already exists (verify, do not rebuild).**

| Piece | File |
|---|---|
| Topology | `docker-compose.prod.yml` (db/api/worker/web/caddy; Postgres publishes no port) |
| Ingress + TLS | `deploy/Caddyfile` |
| Prod image + boot gate | `backend/Dockerfile` (`deps-prod`, `prod`), `backend/docker/entrypoint.prod.sh` |
| Fail-closed config checks | `backend/apps/core/checks.py` (`hem.E001`–`E012`, `hem.W001`–`W006`) |
| Deploy / rollback | `scripts/deploy.sh`, `scripts/rollback.sh` |
| Post-deploy verification | `scripts/smoke_test.sh` (22 checks; 22/22 locally) |
| Backups | `scripts/backup_db.sh`, `scripts/restore_backup.sh` (**drill passed**) |
| Ops signals | `manage.py ops_report` (9 signals, non-zero exit on anomaly) |
| CD | `.github/workflows/deploy.yml` |
| Env template | `.env.prod.example` |

### BLOCKED ON OWNER — nothing below can be done from inside this repository

| # | Action | Unblocks |
|---|---|---|
| 1 | Provision a host (Hetzner CX22 ≈ €4/mo, or Oracle Always Free) | everything |
| 2 | Register a domain; point `www`/`app`/`admin`/`api` at the host **before** the first deploy (Caddy needs resolving DNS for ACME) | TLS, CORS, cookies |
| 3 | Create a Cloudflare R2 bucket + API token | `hem.E011` blocks boot on `FILE_STORAGE=local` |
| 4 | Verify an email sender domain (SPF/DKIM) at Brevo or Resend | `hem.E010` blocks boot on console email |
| 5 | Fill `.env.staging` / `.env.production` from `.env.prod.example` (every `CHANGE_ME`), `chmod 600` | the deploy |
| 6 | Repo secrets `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`/`DEPLOY_PATH`, vars `API_DOMAIN`/`APP_DOMAIN`, and `staging`+`production` Environments with required reviewers on production | CD + the approval gate |
| 7 | UptimeRobot monitor on `https://api.<domain>/healthz` (keyword `"database": true`) | acceptance criterion |
| 8 | Backup cron + store `BACKUP_PASSPHRASE` in a password manager | durability |

**Then, in order.**

1. `./scripts/deploy.sh --env staging` — must end with `SMOKE PASSED`.
2. Run the Playwright pack against staging.
3. `./scripts/deploy.sh --env production`.
4. Confirm the uptime monitor is green.
5. **Live order cycle in manual-payment mode** (P12 acceptance): request → offer
   → selection → manual payment confirm → delivery → approval → ledger check via
   `manage.py ops_report`.
6. Re-run the restore drill against a real backup from the deployed database.
7. Update the roadmap's Phase 12 acceptance table and this file; commit; CI green.

**Do not implement (standing constraints).**
- Stripe activation (owner-gated; no credentials exist, the seam stays non-functional)
- Redis, Elasticsearch, data warehouses, paid SaaS, microservices
- New features, business-rule changes, AI matching, visual redesign

**Acceptance criteria (unchanged).** Staging + production reachable over HTTPS
with enforced security headers; restore drill passed with documented evidence
(✅ already met); uptime monitor green; live order cycle completed in
manual-payment mode; all standard gates green; CI green on the final commit;
roadmap + this handoff updated in the completion commit.

---

## When taking over this project (continuation protocol)

1. Read `docs/process/PROJECT-HANDOFF.md` (this file) — START HERE box first.
2. Read `docs/process/roadmap-phases.md`: header status + the current-phase completion record + the next-phase row.
3. Read the architecture/ADR documents listed in the NEXT PHASE section (ADR-0016 deployment topology and ADR-0017 nonce CSP are the newest).
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
