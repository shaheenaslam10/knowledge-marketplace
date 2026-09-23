# Testing Strategy

> Status: ✅ foundation implemented in Phase 1 · **Phase 2 auth suites live** · Last updated: Phase 2

## Principles

- The **service layer** carries the business rules → deepest coverage there (state machines, money math, permissions).
- Tests are part of the definition of done per phase; CI blocks merge on red.
- Local dev uses the same Postgres engine as prod (docker) — no sqlite divergence for tests either (transactions per test).

## Phase 2 auth coverage (`apps/accounts/tests`, 98 total backend tests green)

| Suite | Covers |
|---|---|
| `test_models.py` | user creation, email normalization, `mark_email_verified`, role slots (incl. stable `expert: False`), manager behaviors, real-config password-hash contract (Argon2-first, never plaintext) |
| `test_api_auth.py` | register (auto-login, cookie-only tokens, verification email queued), enumeration-safe register + reset, login/generic invalid-creds/`last_login_ip`, refresh rotation + reuse-blacklist + inactive refusal, logout idempotency, verify-email happy/invalid/resend-auth, reset→confirm→session-kill, password change→session-kill, deactivate (login + refresh refused, access dead per-request), `/me` auth + owner-scoped PATCH, error-envelope codes, **`auth` throttle scope** (injected on views: DRF binds `DEFAULT_THROTTLE_CLASSES`/`THROTTLE_RATES` to classes at import time — a documented DRF gotcha; the test patches view + rate table directly) |
| `test_permissions.py` | role/permission matrix against a probe urlconf with real API + admin mounted: anonymous→401 envelope, authenticated non-staff→403 `permission_denied`, staff/superuser/admin-group/support-group, `IsVerified` |
| `test_ws_auth.py` + `test_consumers_ws.py` | WS scope auth from the `hm_access` cookie (valid/garbage/inactive → AnonymousUser), origin validation, `/ws/ping/`, `/ws/whoami/` echo — `django_db(transaction=True)` because the ASGI middleware opens its own DB connection |

## Backend

| Layer | Tooling | Focus |
|---|---|---|
| Unit | pytest | money allocation, state-machine transition tables, config, envelope |
| Service/integration | pytest + pytest-django + factory-boy | full flows with real Postgres: request→offer→accept→order→pay(mocked gateway)→deliver→approve→payout; first-accept-wins race; auto-approve timers (freezed time); webhook idempotency |
| API/authorization | APIClient | per-role matrix tests (guest/student/expert/other-student/admin × sensitive endpoints → expect 401/403/404), envelope shape, pagination, throttling smoke |
| WebSockets | Channels test communicator | connect auth, participant-only send, broadcast fan-out |
| Tasks | django-q2 `sync=True` mode + `worker_smoke` command | enqueue-on-state-change, idempotent re-run, retry paths |
| Migrations | CI: `makemigrations --check` | schema drift guard |

Coverage gate: **≥85% on orders/payments/assignments/bidding services**, ≥70% overall (configured in coverage.rc; reported in CI).

Stripe interactions are always behind the gateway adapter — tests use a `FakeGateway` plus recorded-payload fixtures for webhook processing; optional live `stripe-mock` container in CI for adapter conformance.

## Frontend

| Layer | Tooling | Focus |
|---|---|---|
| Type safety | `tsc --noEmit` against generated OpenAPI types | contract drift |
| Unit | Vitest + Testing Library | forms/validation, money/date utils, offer cards logic, stores |
| E2E | Playwright (docker-compose stack, Stripe test cards) | golden paths: register→verify→post request (both modes) → offer→accept→pay (4242 card) → deliver→revision→approve→review; admin triage; dispute resolution |
| Lint | ESLint (next/core-web-vitals + TS) | |

E2E runs on every PR against seeded data (`scripts/seed_demo.py --e2e` deterministic mode).

## CI pipeline (GitHub Actions, free)

1. backend: ruff + import-linter + makemigrations --check + pytest (+coverage)
2. frontend: lint + typecheck + vitest + `next build`
3. e2e (Playwright) on PRs touching app code
4. dependency audit (pip-audit, npm audit) — weekly scheduled + on PR
5. OpenAPI schema snapshot diff — flags breaking changes

## Test data

- Factories per model (factory-boy) in `apps/*/tests/factories.py`.
- `scripts/seed_demo.py`: idempotent demo dataset (users, experts w/ ratings, requests both modes, orders in every state, reviews, disputes, ledger) — also the local-dev fixture set documented in README.
- Secrets in tests: none; Stripe keys are test-mode placeholders.
