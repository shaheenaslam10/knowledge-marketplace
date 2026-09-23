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
- **Decision:** Channels 5 on uvicorn; `InMemoryChannelLayer`; MVP runs exactly one ASGI process; WS pushes are refetch hints, never source of truth; Redis channel layer is the documented scale-out (settings-only).
- **Consequences:** zero cost; single-process constraint recorded in deployment/runbooks.

## ADR-0004 — JWT in httpOnly cookies (SimpleJWT), email+password first
- **Context:** Next.js + Django on separate origins/ports; XSS/CSRF concerns; OAuth later.
- **Decision:** SimpleJWT access 15m + rotating refresh 7d, httpOnly Secure SameSite=Lax cookies; same registrable domain requirement; custom-header CSRF defense; refresh reuse detection revokes family; OAuth behind `accounts.services` seam post-MVP.
- **Consequences:** no token storage in JS; frontend/API must share a registrable domain (constraint documented for hosting choices).

## ADR-0005 — PaymentGateway abstraction; Stripe Connect (separate charges & transfers) + manual fallback
- **Context:** Marketplace money flows need provider escrow semantics (no fake escrow); Stripe unsupported in Pakistan (owner region); experts may be in unsupported countries.
- **Decision:** Adapter interface with two implementations: Stripe Connect (charges on platform account → transfers on completion; refunds via Stripe) and ManualGateway (external transfer, admin-confirmed, identical ledger/order gating). Selected per-environment via `PAYMENT_GATEWAY`.
- **Consequences:** launchable from any country; Stripe integration still first-class; ledger + order state machine are gateway-agnostic (one implementation).

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
