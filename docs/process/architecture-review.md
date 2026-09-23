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

---

# Phase 2 Readiness Review (post-Phase-1, pre-implementation)

> ✅ Completed during the Phase 1 documentation-sync pass (2026-09-23). Scope: verify that nothing in the Phase 1 foundation makes Phase 2 (Authentication & Roles) difficult. **No Phase 2 code written.**

## Verified ready (evidence-based)

| # | Check | Result |
|---|---|---|
| 1 | **Custom-user swap safety** — `AUTH_USER_MODEL = "accounts.User"` must precede any migration that references a user | ✅ safe: zero app migrations exist; no direct `django.contrib.auth.models.User` imports anywhere (only `get_user_model()`); django-q/sessions/admin reference the user lazily. **Constraint: the swap lands in the very first Phase 2 commit.** |
| 2 | Dependencies | `djangorestframework-simplejwt` documented in backend.md's library table; added to `pyproject` in Phase 2's first commit (token-blacklist app brings its own migrations — no conflicts). |
| 3 | Cookie/CORS topology for cross-port local dev | ✅ verified: `localhost:3000 ↔ localhost:8000` is same-*site* (SameSite=Lax flows; ports don't partition cookies on a host) + `CORS_ALLOW_CREDENTIALS` + explicit origin allowlists — matches the documented JWT-in-httpOnly-cookie design; prod requirement (same registrable domain) unchanged. |
| 4 | WebSockets auth seam | ✅ `AuthMiddlewareStack` mounted in `config/asgi.py`; Phase 2 adds the JWT scope-auth middleware exactly where realtime.md says. |
| 5 | Error/throttle/request-id plumbing | ✅ envelope, request-id, `anon`/`user` throttles active — Phase 2 adds the login/token throttle scope on top. |
| 6 | Email for verification/reset in Phase 2 | ✅ console backend active in dev; plain SMTP possible via settings; Brevo adapter stays Phase 9 as documented. |
| 7 | Frontend structure for auth surfaces | ✅ route-group layout `(auth)/(student)/(expert)` already planned in frontend.md; only `src/middleware.ts` guard + pages are new. |
| 8 | Audit middleware (Phase 2 deliverable) | ✅ `audit` app slot reserved by the dependency rules (sidecar service); nothing to refactor. |

## Notes for Phase 2 (no action required now)

- `config/settings/dev.py` disables password validators (seed/demo convenience) — Phase 2 registration must enforce its own minimum rules server-side and not assume validators are on.
- Optional `ADMIN_IP_ALLOWLIST` (mentioned in authentication.md): decide in Phase 2; if implemented, add to `.env.example` + environments.md per the sync rule.
- Role model reminder (ADR-0001): single `User` + `ExpertProfile.status` for expert state; staff permissions via Django groups (`support`, `admin`) — no second user table.

**Verdict: Phase 2 can proceed exactly per the existing documentation — no architectural corrections required.**

---

# Phase 2 Implementation Review (Authentication & Roles)

> ✅ Completed 2026-09-23, before the Phase 2 push. Self-review against the readiness checklist + security focus areas.

| # | Area | Outcome |
|---|---|---|
| 1 | Custom user before dependent migrations | ✅ `accounts.User` + `0001_initial` is the first migration touching a user; `AUTH_USER_MODEL` set in base settings; all references via `get_user_model()` |
| 2 | Token transport | ✅ httpOnly `SameSite=Lax` cookies only (`hm_access`/`hm_refresh`); bodies never carry tokens (asserted by tests); `COOKIE_SECURE` gates `Secure` |
| 3 | Rotation & invalidation | ✅ rotate+blacklist enabled; reuse → `401 token_invalid`; logout idempotent blacklist; password change/reset/deactivate blacklist all outstanding refreshes |
| 4 | Inactive/deactivated users | ✅ per-request `is_active` (auth class + refresh view); login refuses with generic invalid-credentials |
| 5 | Enumeration protection | ✅ register-with-existing-email → generic 201 + owner re-email; reset always identical; login generic `invalid_credentials`; ownership returns 404 policy stands for Phase 3+ selectors |
| 6 | Brute force | ✅ `auth` throttle 10/min/IP on all sensitive endpoints (`429 throttled` envelope); backoff hardening deferred + documented |
| 7 | Passwords | ✅ Argon2id-first; 10-char floor (validator + serializer); CommonPassword/similarity/numeric validators in base; test-speed MD5 isolated to test settings with a config contract test |
| 8 | Authorization | ✅ deny-by-default (`IsAuthenticated` global); role permission classes (`IsAdmin/IsSupport/IsExpert/IsVerified`); probe-urlconf matrix tests incl. admin group vs superuser; WS scope auth → AnonymousUser on bad/inactive |
| 9 | WS compatibility | ✅ `JWTAuthMiddleware` mounted ahead of origin validation; explicit origin allowlist preserved (http/https twins); `whoami` proof endpoint |
| 10 | Admin management | ✅ `ManagedUserAdmin`: search/filter, activate/deactivate/resend actions, no hash exposure; `ADMIN_URL` override supported |
| 11 | Secrets in logs | ✅ log lines carry `user_id` only; no tokens/passwords/cookies logged (code review + explicit logger call sites) |
| 12 | Dependency/layer rules | ✅ import-linter layers corrected to payments < accounts < core (contracts green); `seed_demo` moved to `apps.accounts` to keep core kernel-clean |

**Verdict: Phase 2 satisfies its acceptance criteria; deviations from the Phase 0 design are recorded in ADR-0004 / authentication.md (family revocation and per-account backoff deferred; both documented, neither weakens security).**
