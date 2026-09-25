# Testing Strategy

> Status: ✅ Phase 1–3 suites live (141 backend tests) · Last updated: Phase 3

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

**Phase 3 additions (43 tests):**

| Suite | Covers |
|---|---|
| `experts/test_services.py` | full lifecycle state machine (apply→submit→review→approve/reject→suspend→reinstate, resubmission counts), invalid-transition refusals, staff-only transitions, attestation + credential + verified-email submit gates, slug uniqueness, role wiring (`expert: true` iff approved; stale-relation cache caught by tests — role check is a query) |
| `experts/test_api.py` | directory visibility (approved+public+active only; suspended → 404; opt-out), q/rating/subject filters, pagination, private-field leak checks, application ownership (`/me/expert-application` has no id lookup at all), locked edits under review, rejection reason visibility, credential ownership validation, envelope codes |
| `files/test_files.py` | per-purpose allowlists, size caps, magic-byte sniffing (HTML-in-disguise rejected), sha256 dedupe, access matrix (anon/stranger/uploader/staff), signed-token tamper/expiry, audited staff credential views, avatar public streaming with nosniff |
| `taxonomy/test_taxonomy.py` | idempotent terms, per-kind unique slugs + collision suffixes, category-parent constraints, public list API filters |
| `audit/test_audit.py` | actor/object/request-id capture, null-actor system events, append-only semantics |
| `accounts/test_student_profile.py` | self-service upsert onboarding, unknown-interest validation, anonymous 401s |
| `seed/test_seed.py` | all personas (approved/submitted/under_review/rejected/suspended/not-applied), idempotent double-run, dev/test guard |

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

### E2E environment contract (journeys 01–04)

- **Stack**: tests assume the compose stack is already up (Next :3000, Django :8000
  via `runserver` — daphne ASGI with static serving so the admin's JS works; raw
  uvicorn serves no `/static/`, which broke admin bulk actions in early smoke runs —
  worker qcluster) — `docker compose up --build -d`, then `cd frontend && npm run e2e`.
- **Verification emails**: the dev email backend is `console`; the q2 **worker** prints
  each message to its container stdout. Helpers in `frontend/e2e/helpers.ts` poll the
  delivery log at `$E2E_DELIVERY_LOG` (default `/tmp/hem-mail.log`) and extract the
  `verify-email?token=…` link. In CI the compose-smoke job streams the log:
  `docker compose logs -f worker > /tmp/hem-mail.log &`.
- **Django admin origin**: the admin lives on the API origin (`http://localhost:8000`,
  override `E2E_ADMIN_BASE_URL`) — Next never serves `/admin` in dev or compose.
- **Hydration**: specs retry fill/submit until the client app is interactive
  (`helpers.register` / `login` loops) — pre-hydration DOM input is wiped on mount.
- **Seed dependency**: journeys 02/04 consume seeded dispute-eligible orders and the
  moderation report; `seed_demo` is idempotent, so reruns recreate what a previous
  journey consumed.

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
