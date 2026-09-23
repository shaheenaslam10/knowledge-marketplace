# Phase 0 Architecture Review

> Status: ✅ completed 2026-09-23 · Reviewer gate before implementation per workflow.

Review dimensions: consistency, security, feasibility, cost — plus the brief's explicit constraints (modular monolith, no Redis/queue services, database-backed jobs, free-first, Stripe-only-if-necessary, single repo, local runnability).

## Findings & resolutions

| # | Area | Finding | Resolution |
|---|---|---|---|
| 1 | Consistency | Two workflows (open/managed) risked divergent order logic | Single `Order` pipeline with `source` field; matching modules converge on `orders.services.create_order_*` — verified in workflows docs |
| 2 | Consistency | App named `requests` would shadow the pip `requests` lib (breaks Stripe SDK imports) | Domain app named `service_requests` (documented in backend.md) |
| 3 | Security | Session-vs-JWT for cross-subdomain Next+Django | JWT in httpOnly cookies, same registrable domain, SameSite=Lax + custom-header CSRF defense (ADR-0004); documented constraint to keep frontend+API on one domain |
| 4 | Security | Payment state tampering via client | Webhook-only state changes, signature verify, event dedup, server-side amounts (BR-29/33); tests required in P8/P12 |
| 5 | Feasibility | First-accept-wins invitations under concurrency | Row-locked accept transaction; test included in P6 acceptance |
| 6 | Feasibility | In-memory channel layer limits ASGI to 1 process | Accepted + documented constraint (system/realtime/deployment docs) with one-settings-change Redis escape hatch; not a blocker at MVP scale |
| 7 | Feasibility | Stripe unavailable for PK-domiciled platform/experts | Gateway abstraction with Manual fallback (ADR-0005); documented compliance consideration |
| 8 | Cost | Celery/Redis default temptation | DB-backed queue (ADR-0002, package revised in Phase 1 — django-q2/ORM) — zero infra, transactional enqueue |
| 9 | Cost | S3-by-default temptation | R2 free tier, zero egress (ADR-0006); S3-compatible swap path |
| 10 | Cost | Admin SPA would burn weeks | Django admin customized (ADR-0010) — sufficient for owner ops MVP |
| 11 | Integrity | Academic-integrity exposure | Product-enforced policy: attestation, categories, expert reporting, moderation ladder (BR-10..14); ToS gate before launch (P13) |
| 12 | Docs | Docs must stay synchronized | Doc-sync rule in development-workflow + CI reminder in PR template; env-vars doc-check script planned P1 |

## Verdict

**Approved to implement Phase 1.** Constraint register to respect during build: single ASGI process; webhooks-only money mutations; service-layer-only cross-app calls; env var additions must update docs; no new external service without costs-table entry.

---

# Phase 1 Implementation-Readiness Check (pre-coding gate, per owner mandate)

> ✅ Completed 2026-09-23, before any implementation. Scope: verify the Phase 0 docs are consistent with the owner's Phase 1 constraints (provider-agnostic payments, no custom escrow, dependency rules, DB-backed jobs, free-first) and catch technical impossibilities.

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | `django-tasks` (PyPI 0.12.0) ships **no database backend and no worker process** (dummy/immediate only; upstream repository gone) — ADR-0002 as written is unimplementable | blocker | ADR-0002 amended: **django-q2 1.11.x ORM broker** (pure Postgres, qcluster worker, Schedule-based recurring jobs, admin visibility). Redis/Celery still excluded. Worker command documented as `qcluster` everywhere |
| 2 | Docs referenced "Channels 5"; published version line is 4.3.x | minor | Docs corrected to Channels 4.3.x (no design change) |
| 3 | `AllowedHostsOriginValidator` (channels) rejects missing/foreign Origin and validates only against `ALLOWED_HOSTS` — breaks the approved cross-subdomain deployment (app.example.com → api.example.com) | medium | Explicit WS origin allowlist derived from `FRONTEND_URL` + `CORS_ALLOWED_ORIGINS` + `CSRF_TRUSTED_ORIGINS` (config/asgi.py); strict reject on missing Origin |
| 4 | `AUTH_USER_MODEL` swap must precede the first real migration or the change becomes destructive | high (sequencing) | Phase 1 intentionally ships zero concrete user-facing models; default user used only for the seed superuser; Phase 2 introduces `accounts.User` before any dependent migration exists |
| 5 | Payments: Phase 0 docs already mandate the gateway abstraction + manual fallback; re-verified no Phase 1 code imports any provider SDK and no escrow semantics exist in code | pass | `apps/payments/gateway.py` = protocol + registry + `ManualGateway` placeholder; provider selection is env-only (`PAYMENT_GATEWAY`); instructions-only manual mode; no custody logic |
| 6 | Frontend/backend coupling: two different backend URLs needed (browser vs docker-internal RSC fetch) | minor | `NEXT_PUBLIC_API_URL` (browser) + `SERVER_API_URL` (server-side, falls back) documented in environments.md |
| 7 | Cost check: no new external services introduced in Phase 1 (all deps are free/open-source; CI on GitHub Actions free tier) | pass | costs.md unchanged |

**Verdict: ready — implementation of Phase 1 proceeded under these resolutions.**
