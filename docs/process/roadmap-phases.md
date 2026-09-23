# Development Phases, Dependencies & Acceptance Criteria

> Status: 📐 Phase 0 (plan) · Last updated: 2026-09-23
> Sequence follows the brief's suggested order (no deviations needed — dependencies confirmed consistent). Each phase: deliverables → acceptance criteria → "runs locally" proof. Doc updates happen **inside** each phase.

## Phase overview

| Phase | Name | Depends on | Core deliverables |
|---|---|---|---|
| 0 | Architecture & Documentation | — | this docs set, ADRs, review |
| 1 | Project Foundation | 0 | monorepo scaffolds, Docker Compose, CI, `.env.example`, health endpoints, seed script skeleton, lint/test gates |
| 2 | Authentication & Roles | 1 | register/verify/login/reset, JWT cookies, role model, admin groups, audit middleware, throttles |
| 3 | Student/Expert Profiles | 2 | profiles, taxonomy, expert application+approval (admin), files app (credentials, avatars), public expert directory API |
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

## Per-phase acceptance criteria (summary — detailed gates)

- **Every phase:** backend `pytest` green + frontend `build` green in CI; `docker compose up` gives a working app; README updated; docs updated; committed & pushed with clear message; demo-able via seed data.
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
