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
| 8 | Cost | Celery/Redis default temptation | django-tasks DB queue (ADR-0002) — zero infra, transactional enqueue |
| 9 | Cost | S3-by-default temptation | R2 free tier, zero egress (ADR-0006); S3-compatible swap path |
| 10 | Cost | Admin SPA would burn weeks | Django admin customized (ADR-0010) — sufficient for owner ops MVP |
| 11 | Integrity | Academic-integrity exposure | Product-enforced policy: attestation, categories, expert reporting, moderation ladder (BR-10..14); ToS gate before launch (P13) |
| 12 | Docs | Docs must stay synchronized | Doc-sync rule in development-workflow + CI reminder in PR template; env-vars doc-check script planned P1 |

## Verdict

**Approved to implement Phase 1.** Constraint register to respect during build: single ASGI process; webhooks-only money mutations; service-layer-only cross-app calls; env var additions must update docs; no new external service without costs-table entry.
