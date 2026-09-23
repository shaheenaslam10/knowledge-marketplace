# Testing Strategy

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Principles

- The **service layer** carries the business rules → deepest coverage there (state machines, money math, permissions).
- Tests are part of the definition of done per phase; CI blocks merge on red.
- Local dev uses the same Postgres engine as prod (docker) — no sqlite divergence for tests either (transactions per test).

## Backend

| Layer | Tooling | Focus |
|---|---|---|
| Unit | pytest | money allocation, state-machine transition tables, config, envelope |
| Service/integration | pytest + pytest-django + factory-boy | full flows with real Postgres: request→offer→accept→order→pay(mocked gateway)→deliver→approve→payout; first-accept-wins race; auto-approve timers (freezed time); webhook idempotency |
| API/authorization | APIClient | per-role matrix tests (guest/student/expert/other-student/admin × sensitive endpoints → expect 401/403/404), envelope shape, pagination, throttling smoke |
| WebSockets | Channels test communicator | connect auth, participant-only send, broadcast fan-out |
| Tasks | django-tasks test harness | enqueue-on-state-change, idempotent re-run, retry paths |
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
