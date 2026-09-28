# Architecture Decision Records (ADR)

> Format: **Context → Decision → Consequences.** Superseded ADRs are marked, never deleted.

## ADR-0001 — Modular monolith with service-layer seams
- **Context:** Brief mandates no microservices/K8s; but frontend/business logic must not become tightly coupled, and future extraction is desired.
- **Decision:** One Django codebase; business domains = apps with an acyclic dependency graph; all cross-domain writes go through owning app's `services.py` (the future RPC surface); import-linter enforces in CI. `students`/`experts` are role/profiles on `accounts`/`experts` (one identity), `commissions` folded into `payments` (ledger shares one transaction boundary), `admin` is Django admin + `analytics` (owner back office, not a domain).
- **Consequences:** extraction later = freeze a service interface; slight indirection cost now (service calls instead of model pokes). Accepted.

## ADR-0002 — Database-backed task queue, no Redis/Celery
- **Context:** Brief forbids Redis-for-queues at MVP; needs retries, schedules, visibility.
- **Decision (Phase 0):** `django-tasks` (DEP-0004 reference) over Postgres.
- **Amended (Phase 1, readiness check):** the published `django-tasks` package (0.12.0) ships **only dummy/immediate backends — no database backend or worker process** (upstream repo also gone). Technical impossibility vs this ADR. **Revised decision: `django-q2` (1.11.x) with the ORM broker** — pure-Postgres queue, `qcluster` worker, built-in Schedule model (recurring/sweeper jobs) and Django-admin visibility, actively maintained, no Redis. Re-evaluate if/when Django vendors a production database-backed `django.tasks` (LTS line permitting) — the seam is our `apps/*/tasks.py` wrappers, so migration stays local.
- **Consequences:** worker command is `python manage.py qcluster`; tasks must be idempotent; django-q2 `retry` must exceed `timeout` (enforced by warning in settings); recurring jobs use django-q2 Schedules (admin-manageable) instead of a separate cron.

## ADR-0003 — Django Channels + in-memory channel layer (single ASGI process)
- **Context:** Realtime needed for chat/notifications; must stay free; simplest reliable architecture.
- **Decision:** Django Channels (4.3.x current) on uvicorn; `InMemoryChannelLayer`; MVP runs exactly one ASGI process; WS pushes are refetch hints, never source of truth; Redis channel layer is the documented scale-out (settings-only). Phase 1 addition: WS handshake origins are validated against `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (channels' built-in validator only knows `ALLOWED_HOSTS`, which would break the documented cross-subdomain deployment).
- **Consequences:** zero cost; single-process constraint recorded in deployment/runbooks.

## ADR-0012 — Role-specific onboarding on one shared User (Phase 3 refinement)

> Note: renumbered from a colliding ADR-0011 (ADR-0011 was already the Brevo email adapter, Phase 0).
- **Context:** One `User` (ADR-0001) serves three roles, but the three roles need different onboarding: students self-serve, experts require credential review, admins must never self-enroll. Product decision (owner clarification, Phase 3).
- **Decision:** Keep the single `accounts.User` (no role user tables). Separate the domain artifacts: `accounts.StudentProfile` (self-service onboarding, no approval), `experts.ExpertApplication` (the review artifact carrying the lifecycle state, credentials, reviewer bookkeeping) and `experts.ExpertProfile` (the live public profile, created only at approval). Lifecycle: `not_applied → draft → submitted → under_review → approved/rejected` (rejected resubmittable) `; approved ⇄ suspended`. Admin/Owner accounts are provisioned exclusively via Django admin/management (`createsuperuser`, seed) — there is no public "apply as admin" flow. Staff transitions are service-layer state-machine moves with audit rows + decision emails.
- **Consequences:** registration stays simple; the review workflow can evolve (SLAs, re-reviews) without touching auth; the application is an immutable-ish review record while the profile evolves freely; `expert` role derives from application status (one source of truth for role, directory, and eligibility).

## ADR-0004 — JWT in httpOnly cookies (SimpleJWT), email+password first
- **Context:** Next.js + Django on separate origins/ports; XSS/CSRF concerns; OAuth later.
- **Decision:** SimpleJWT access 15m + rotating refresh 7d, httpOnly Secure SameSite=Lax cookies; same registrable domain requirement; custom-header CSRF defense; refresh reuse detection revokes family; OAuth behind `accounts.services` seam post-MVP.
- **Consequences:** no token storage in JS; frontend/API must share a registrable domain (constraint documented for hosting choices).
- **Implemented (Phase 2) — refinements recorded here, not silently changed:**
  - Deny-by-default DRF (`IsAuthenticated` global) with explicit `AllowAny` opt-ins; cookie-first authentication with Bearer fallback for scripts.
  - Per-request `is_active` enforcement (custom `ActiveUserJWTAuthentication` + refresh-view check) — deactivated users lose access immediately, closing the stateless-access window.
  - Enumeration-safe by construction: register with an existing email returns the same generic 201 and re-sends verification to the owner; password-reset request always answers identically.
  - Rotation blacklists the used refresh; **reuse returns `401 token_invalid`** (the token is already blacklisted). Whole-*family* revocation on reuse-detection stays a documented future hardening (needs token-family tracking); per-user *all-token* kill exists for password change/reset and deactivation.
  - Brute-force: `auth` throttle scope (default 10/min/IP) instead of per-account exponential backoff (deferred, documented in authentication.md).
  - Argon2id-first hashing; 10-char floor enforced both by validator and serializer (test settings swap hashers for speed — a contract test pins the real config).

## ADR-0005 — PaymentGateway abstraction; Stripe Connect (separate charges & transfers) + manual fallback
- **Context:** Marketplace money flows need provider escrow semantics (no fake escrow); Stripe unsupported in Pakistan (owner region); experts may be in unsupported countries.
- **Decision:** Adapter interface with two implementations: Stripe Connect (charges on platform account → transfers on completion; refunds via Stripe) and ManualGateway (external transfer, admin-confirmed, identical ledger/order gating). Selected per-environment via `PAYMENT_GATEWAY`.
- **Consequences:** launchable from any country; Stripe integration still first-class; ledger + order state machine are gateway-agnostic (one implementation).
- **Amended (Phase 7 — payments domain implemented, still no Stripe credentials):**
  - `apps.payments` remains a **lower layer** (commission config is imported downward by bidding/assignments/orders). Cross-app references to orders are string FKs (DB integrity, zero Python imports). Order activation inverts through a payments → orders **domain signal** (`payment_confirmed`) received by `apps.orders`, which reruns its own `mark_paid` machine inside the confirmation transaction — payments never imports upward, and the seam stays the single activation path for gateway confirmations, webhook events and admin actions alike.
  - `StripeGateway` ships as a **registered but non-functional seam** (explicit configuration error listing missing settings). The `stripe` SDK is deliberately **not** a dependency: local dev, tests and CI run green without credentials. Before production activation an owner-level verification of operating country, business entity, bank account, supported currencies, marketplace/payout availability, KYC, fees, refund behavior and webhook requirements is mandatory (checklist in `docs/workflows/payments.md`) — none of these are assumed.
  - ManualGateway is the **development/test provider and operator-confirmed fallback**: full lifecycle simulation (pay → confirm → activate → payout → refund) with deterministic references and HMAC-signed simulated webhook events. Simulated records are always labeled gateway `manual` — they are never presented as real card transactions.

## ADR-0006 — Cloudflare R2 for production files (not S3)
- **Context:** Prefer free/low-cost storage; deliveries can be sizeable; egress fees are the killer.
- **Decision:** R2 (10GB free, zero egress) via django-storages; local FileSystemStorage in dev; permission-checked presigned GETs (5 min).
- **Consequences:** S3-compatible escape hatch intact; small-provider risk accepted (abstraction keeps swap trivial).

## ADR-0007 — Postgres-native search (FTS + trigram); no external search service
- **Context:** Must avoid Elasticsearch-class infra at MVP.
- **Decision:** `search_vector` GIN + `pg_trgm` for expert names; filters via django-filter; Meilisearch container is the documented upgrade (same API contract).
- **Consequences:** zero cost, one less system; relevance tuning is coarser — accepted.

## ADR-0008 — UUID public identifiers + human order numbers
- **Context:** Enumeration attacks, URL aesthetics.
- **Decision:** UUID4 exposed in URLs/APIs for user-facing entities; sequential `ORD-YYYY-NNNNNN` display number for orders (public, non-secret); internal BigAutoFields never exposed.
- **Consequences:** no existence leaks via ids; slightly larger indexes — fine.

## ADR-0009 — Integer minor units + single currency (MVP)
- **Context:** Money correctness; multi-currency complexity.
- **Decision:** All amounts `BigInteger` minor units + ISO currency char; platform-level `default_currency` (USD for Stripe mode; PKR acceptable in manual mode); commission snapshots onto orders.
- **Consequences:** float bugs impossible; multi-currency deferred with schema untouched (per-row currency already supported).

## ADR-0010 — Django Admin as the owner back office (MVP)
- **Context:** Admin dashboards required; speed and cost matter.
- **Decision:** Customized Django admin (queues, actions via service layer, audit viewer, KPI index) instead of building an admin SPA; REST admin API deferred until needed.
- **Consequences:** back office in days not weeks; permission groups + audited actions; UX is utilitarian by design.

## ADR-0011 — Email via Brevo free tier behind adapter
- **Context:** Transactional email deliverability without running mail servers.
- **Decision:** `EmailBackend` adapter: console (dev) / Brevo API (prod) / SMTP (fallback); per-category unsubscribe.
- **Consequences:** provider swap = env change; volume cap visible in costs triggers.

## ADR-0013 — Three web experiences, one application (product structure)
- **Context:** The platform needs a premium public marketing website, a role-aware marketplace application (students and experts together), and an internal operations portal — without forking into three codebases or systems.
- **Decision:** One repository, one Next.js app, one backend/API. Experiences are separated by **route groups + experience shells**: `(marketing)` (www), `(auth)`+`(app)` (app.), `(portal)` (admin., under `/portal/*` in single-server dev/preview). URLs are the contract; subdomains are a deploy-time mapping enforced by host-aware middleware. One shared design system feeds all three; ESLint import boundaries keep experience code from cross-importing; Django admin remains the ops tool until the portal phase (ADR-0010 stands). Escape hatch if marketing deps bloat the bundle: Next Multi-Zones in the same repo, adopted only against the performance budget.
- **Consequences:** single build/CI/deploy path and one design system; experience teams cannot drift visually; the portal ships as scaffolding only until its phase; prod reverse proxy must map the three hosts to one app origin.

## ADR-0014 — Design system & motion stack (shadcn/ui base, Motion, curated Aceternity, no WebGL at launch)
- **Context:** The product must feel premium/AI-era — closer to a modern SaaS product than a tutoring portal — across three experiences with different motion and density profiles, without compromising performance or inventing every component from scratch.
- **Decision:** Build a product-specific design system on **Tailwind v4 CSS-first tokens** (`@theme`), documented in docs/design/design-system.md. Component foundation: **shadcn/ui** (Radix primitives) vendored into `src/components/ui` and customized to our tokens — never the stock look. Motion: **Motion for React (`motion/react`)** as the single animation system (one package, one API; no CSS keyframe duplicates, no second library). Marketing storytelling: selectively **vendored Aceternity UI patterns** (hero spotlight/beams, bento features, text reveals, testimonials, CTA) adapted to tokens and audited for bundle cost — installed component-by-component, never as a package dump. Visual/3D strategy: SVG/CSS/Canvas first (network/matching visuals, gradient light-fields, floating UI panels); **React Three Fiber explicitly deferred** unless a hero concept demonstrably justifies its JS cost against the budget. Icons: Lucide. Charts (admin, later): Recharts via the shadcn chart pattern.
- **Consequences:** accessibility primitives come from Radix for free; animations are transform/opacity-only by rule; `prefers-reduced-motion` is a first-class requirement; vendored components carry an audit note (source + adaptations + performance) in docs/design/component-selection.md; design drift between experiences is caught in design review against the docs.

## ADR-0015 — Marketplace domain boundaries, selection protocol, managed convergence (Phase 4)
- **Context:** Phase 4 needs the request→offer→selection foundation without building payments/messaging/managed-service, and without a second data model for managed flows later.
- **Decision:** Apps follow docs/architecture/database.md exactly: `service_requests` (brief + lifecycle), `bidding` (offers + selection), `orders` (pipeline anchor). Selection = one transaction: `select_for_update` on offer+request, re-validate server-side (owner, pending, request open, expert still approved/available/active), accept offer, auto-decline siblings, request→`matched`, create Order(`awaiting_payment`, commission snapshot). Order creation is the **single convergence factory**: managed service later assigns via the same factory with `source=managed_pool|managed_direct` — no new model. Layer chain: seed > bidding > orders > payments > service_requests > experts > accounts > taxonomy > files > audit > core. Commission/min-offer/TTL constants live in module code (payments.config) until the PlatformConfig singleton (payments phase). Deviations recorded in database.md: ServiceRequest/Offer use UUID pks (non-enumerable URLs); Order.expert_id is the user pk (BigInt) + name/slug snapshot (ADR-0001); `search_vector`/full-text deferred until query patterns justify it (simple PostgreSQL filters shipped).
- **Consequences:** race-safe selection is testable in isolation; payments phase unlocks order transitions without schema churn; managed-service UX plugs into existing services.

## ADR-0016 — Production deployment topology: single-host Caddy + compose, provider-portable (Phase 12)
- **Context:** Phase 12 must take the verified Phase 0–11 system to a reproducible production deployment. The architecture constrains the answer more than any hosting fashion does: ADR-0003 pins **one ASGI process** (in-memory channel layer, no Redis), ADR-0002 pins a **database-backed** task queue (the worker needs the same Postgres, not a broker), and ADR-0013 needs **three hostnames mapped onto one Next.js origin**. Serverless/edge platforms (Vercel functions, Cloud Run scale-to-zero, Render free tier) break at least one of those: they multiply or recycle processes, which silently shreds the in-memory channel layer and WebSocket affinity. The owner also has no cloud credentials provisioned and a free-first/low-cost-first mandate.
- **Decision:** **One small always-on host running the existing compose stack behind Caddy**, expressed as `docker-compose.prod.yml` + `deploy/Caddyfile` in this repository. Caddy terminates TLS (automatic Let's Encrypt) and is the single ingress that maps the three experiences to one Next origin and routes `/api/*`, `/admin/*`, `/ws/*`, `/static/*` to Django. Services: `caddy`, `web` (Next standalone), `api` (uvicorn, one process), `worker` (qcluster), `db` (Postgres 16) — the same topology already proven by the CI compose smoke, so there is no second architecture to maintain.
  - **Host is a parameter, not a decision.** Any Docker-capable VM satisfies it (Hetzner CX22 ≈ €4/mo, Oracle Cloud Always Free, Fly.io, a DigitalOcean droplet). Documented in `deployment.md` with a recommendation, not hardcoded anywhere in the repo.
  - **Postgres is swappable by one env var.** `db` runs in-compose by default (free); pointing `DATABASE_URL` at **Neon free** moves to provider-managed PITR with zero code change. `backup_db.sh`/`restore_backup.sh` cover the in-compose case; PITR covers the Neon case. Both documented in `backup-recovery.md`.
  - **Staging is the same compose file with a different env file and a different hostname** — no separate stack, no drift. Isolation is enforced by `DEPLOY_ENV`, separate database, separate R2 bucket prefix, and `noindex` on non-production hosts.
- **Consequences:** deploy/rollback are ordinary shell operations on artifacts that CI already exercises; the in-memory channel layer and the ORM broker keep working because the process model is unchanged; the free-first constraint holds (one ~€4/mo box, or $0 on Oracle free); scaling out later means the documented Redis switch (ADR-0003), not a replatform. The tradeoff accepted: no autoscaling and seconds of downtime on deploy (container restart) — explicitly fine at MVP, blue/green noted as post-MVP.
- **Not chosen:** Kubernetes/Helm (absurd at this scale), Vercel for the app shell (splits the origin, complicates cookie/CSRF and WS routing for no gain while the API still needs a host), Render free tier (sleeps — kills WebSockets and the worker), Terraform (one host; the compose file *is* the infrastructure description).

## ADR-0017 — Nonce-based enforced CSP at the edge middleware (Phase 12, closes audit F-2)
- **Context:** Phase 11 shipped CSP **report-only** on both Django and Next (`security-audit-phase11.md` F-2) because Next.js injects inline bootstrap/hydration scripts that a strict policy blocks, and the escape hatch used until now — `script-src 'unsafe-inline' 'unsafe-eval'` — makes the policy worthless against XSS. Enforcement was deferred to Phase 12 as a pre-launch gate.
- **Decision:** Generate a **per-request nonce in the Next.js middleware** (Web Crypto, base64), pass it to the renderer via the `x-nonce` request header (Next reads it and stamps `nonce=` on its own inline scripts), and emit the CSP as a **response** header from the same middleware so the nonce in the policy and the nonce in the HTML always match. Production policy: `script-src 'self' 'nonce-<n>' 'strict-dynamic'` — no `unsafe-inline`, no `unsafe-eval`. Development keeps `'unsafe-eval'` (React Refresh requires it) and stays report-only, so the enforcing policy is a production/staging property that cannot break local DX.
  - `style-src` **keeps `'unsafe-inline'`**, deliberately and documented: React sets inline `style` attributes and Next inlines critical CSS; nonced styles would require abandoning both. This is a known, accepted residual — it does not weaken script execution control, which is what F-2 is about.
  - Django keeps its own policy for API/admin responses and flips to **enforcing by default** (`CSP_REPORT_ONLY=False`), with the Django admin path still exempt (`django.contrib.admin` relies on inline handlers). The env var remains, so an operator can drop back to report-only during a canary without shipping code.
  - The static CSP header previously emitted from `next.config.ts` is **removed** — two sources of one header is how nonce mismatches happen. `next.config.ts` keeps only the static, nonce-free headers (nosniff, frame-options, referrer-policy, permissions-policy, HSTS).
- **Consequences:** an injected `<script>` without the per-request nonce does not execute in staging/production; the middleware matcher had to widen from the auth-redirect prefixes to all document routes (static assets and `_next` excluded), so the redirect logic is now explicitly a no-op for unmatched paths (already true — `resolveRoute` returns null); `'strict-dynamic'` means `'self'` is ignored for scripts by modern browsers, which is intended (the nonce becomes the only root of trust and script loading flows through Next's own loader). Covered by middleware unit tests and by the deployment smoke test, which asserts an enforcing `Content-Security-Policy` containing a nonce and **not** containing `unsafe-inline`.
