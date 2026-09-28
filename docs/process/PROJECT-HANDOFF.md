# PROJECT HANDOFF — operational continuation document

> **Permanent project rule:** this file is the single continuation document for any new AI agent or developer (Arena, ChatGPT, Gemini, human). It is updated at every phase completion and whenever a plan/architecture/business-rule change is discovered — **before or with** the implementation, never silently. Detailed evidence lives in the linked documents; this file stays a fast, accurate map.
>
> Last updated: **2026-09-28 (Phase 12 deployment architecture prepared & verified — NOT deployed. Public marketing surface now complete: pricing, subjects, for-experts, about. Blog deliberately out of scope.)**

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
                    The remaining marketing gaps were then closed — /subjects,
                    /subjects/[slug], /for-experts and /about are built and
                    tested. /blog/* is NOT built: mvp-scope.md puts Blog/CMS
                    in the out-of-MVP table, so the public surface is complete.
                    See "Public marketing surface" below.
                    THEN: Playwright E2E was executed for the first time (the
                    sandbox cannot reach the Playwright CDN; a browser was
                    sourced from npm — recipe in "part 2" below). It caught a
                    RELEASE-BLOCKING defect: the enforced nonce CSP was
                    blocking ALL JavaScript on 33 of 45 routes, including
                    /login, /register and every /portal/* page. Prerendered
                    HTML cannot carry a per-request nonce, and 'strict-dynamic'
                    makes 'self' inert. FIXED (ADR-0018) + regression-tested.
                    E2E is now 13/13 and smoke_test.sh 24/24 against a real
                    production build in a real browser.
Next task:          FIRST, in a session that has GitHub connectivity:
                        scripts/recover_branch.sh            # inspect
                        scripts/recover_branch.sh --commit   # reconcile + commit
                    It backs up the tree, re-widens the refspec (.git/config
                    is NOT snapshotted), fetches, resets --mixed onto the real
                    remote tip, and restores any file that would show as
                    deleted. All four paths are fixture-tested. Then review the
                    delta, run the suites, commit, push (never --force).
                    The work is DONE and validated; it is only uncommitted.
                    Three sessions have confirmed this sandbox has NO route to
                    github.com (TCP 443 opens, TLS handshake killed).
                    THEN: owner provisions a host + domain, then:
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
| Test baseline | backend pytest **439 passed**; frontend vitest **143 passed** (25 files); ruff+format clean; import-linter 2/2; `makemigrations --check` clean; env-docs gate green (37 vars); production build + bundle budgets green. **`scripts/smoke_test.sh` 24/24** against a live stack. **Playwright E2E 13/13 — actually executed 2026-09-28 in a real browser against a production build** (4 business journeys + 2 smoke + 7 new CSP-nonce guards). E2E *is* runnable in this sandbox; the recipe is in "Post-Phase-12 audit, part 2" below. |
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

## ⚠️ Git state in the current sandbox — READ THIS FIRST

The sandbox this work was last done in was **re-cloned at the base commit**
(`24437a5`, the README-only initial commit) with the refspec narrowed to
`main`, so the branch history is not present locally. The **files** are all
there — the working tree content equals the last pushed commit `d78196d` plus
the marketing work described below — but they appear as *untracked*.

Two consequences for whoever picks this up:

1. **The remote is authoritative for history.** `arena/01a0e69d-knowledge-marketplace`
   on GitHub has the real 10-commit chain ending at `d78196d`. Do not
   reconstruct history from the local clone.
2. **Do not squash the working tree into one commit on top of `24437a5`.** That
   would diverge from the remote branch and force a destructive push. Fetch the
   real branch first (`git fetch origin '+refs/heads/*:refs/remotes/origin/*'`
   — the default refspec hides `arena/*`), reset the *index* onto `d78196d`
   without touching the working tree, and commit the marketing work as one
   normal commit on top.

The marketing work in this document is therefore **implemented, verified and
saved in the workspace, but not committed** — by choice, to avoid fabricating
history. Everything is reproducible: see the verification commands at the end.

### Recovery attempt 2026-09-28 (later session) — BLOCKED, and why

A second session tried to perform the recovery above and **could not**: this sandbox
has **no network route to GitHub**, not merely an expired token.

```
https://github.com          -> 000        https://registry.npmjs.org -> 200
https://api.github.com      -> 000
https://codeload.github.com -> 000
git fetch  -> fatal: gnutls_handshake() failed: The TLS connection was non-properly terminated.
```

So `d78196d` cannot be fetched, PR #3 cannot be inspected, CI logs cannot be read and
nothing can be pushed **from this sandbox**. One thing was fixed permanently: the fetch
refspec is now widened, so a connected session sees `arena/*` straight away:

```
remote.origin.fetch = +refs/heads/*:refs/remotes/origin/*
```

**Hard evidence for why you must not just `git add . && git commit` here:** `24437a5`
is an initial commit containing **one file, a 1-line README.md**. `git add -An .`
stages **547 files**. A commit here squashes the whole project — phases 0–12 and the
10-commit chain ending at `d78196d` — into a single blob that can only be reconciled
with a force-push. Everything that should be ignored already is (`var/`,
`.ruff_cache/`, `.import_linter_cache/`, `*.tsbuildinfo`, `test-results/`,
`playwright-report/`, `.next/`, `node_modules/`, `.env*`), so the 547 files are all
genuine source.

**Exact steps for the first session that has GitHub connectivity** (the working tree is
already correct — do not re-implement anything):

```bash
git fetch origin '+refs/heads/*:refs/remotes/origin/*'
git log --oneline origin/arena/01a0e69d-knowledge-marketplace | head    # expect d78196d on top
git reset --mixed origin/arena/01a0e69d-knowledge-marketplace           # moves INDEX only, keeps files
git status                                                              # now shows only the real delta
```

`git reset --mixed` rewrites the index and `HEAD`, **not** the working tree, so the
files stay exactly as they are and `git status` collapses from 547 files to just the
marketing + CSP delta. Review that delta, then commit it as one normal commit on top of
`d78196d` and push without force. If the remote branch has moved past `d78196d` (PR #3
may have been merged or closed), reset onto the current remote tip instead and re-run
the suites before committing.

This was **rehearsed in a scratch repository** rather than trusted from memory. With the
full tree on disk and `HEAD` at the base commit, three untracked files collapsed to the
true delta — one `M`, one `??` — with unchanged files dropping out of `git status`
entirely, the working tree byte-identical, and all history reachable.

> ⚠️ **One hazard the rehearsal exposed.** After the reset, any file that exists in
> `d78196d` but is *missing* from this working tree shows up as ` D` (deleted), and a
> reflexive `git add -A` would commit that deletion. Before staging, run
> `git status --porcelain | grep '^ D'` — **it must be empty.** If it is not, those
> files were lost from the sandbox and must be restored with
> `git checkout -- <path>` before committing.


---

## Public marketing surface (2026-09-28) — completed

The public site is now feature-complete except for the blog.

| Route | State |
|---|---|
| `/`, `/how-it-works`, `/experts`, `/experts/[slug]`, `/pricing` | shipped earlier |
| `/terms`, `/privacy`, `/academic-integrity` | shipped earlier |
| **`/subjects`**, **`/subjects/[slug]`**, **`/for-experts`**, **`/about`** | **shipped now** |
| `/blog/*` | **deliberately not built** |

**Why no blog.** `docs/product/mvp-scope.md` lists "Blog/CMS for SEO content" in
the *out-of-MVP* table, rationale "Directory + subject pages first", and the
repository has no blog model, content API, CMS, markdown pipeline or admin
content management. Building one would mean inventing a system the product
explicitly deferred — so the subject pages that the same rationale prioritises
were built instead. This is a boundary, not a gap.

**New backend surface:** `GET /api/v1/subjects` and `GET /api/v1/subjects/{slug}`
(both `AllowAny`), implemented in `apps.experts` rather than `apps.taxonomy`
because they count experts and import-linter places experts above taxonomy.
Both reuse `directory_queryset()`, so a subject page cannot advertise an expert
the directory itself would hide.

**Two defects found by live verification, not by unit tests:**

1. Subject *parents are categories*, which have no landing page — the first cut
   linked them and produced a guaranteed 404. They render as a label now.
2. `/for-experts` reused the pricing API's student-facing copy ("you post a
   request and experts bid") on a page written for suppliers.

The three rules that make these pages correct — never prerender, cache the data
not the route, never cache a failure — now live once in
`frontend/src/lib/api/public.ts` instead of being re-derived per page. It
returns `{ data, notFound }` so a page can distinguish "backend says this does
not exist" (→ `notFound()`) from "backend unreachable" (→ degrade in place);
conflating them would delete real pages during an outage.

**A latent flaky test was found and fixed** while verifying:
`test_slug_uniqueness` indexed an unordered queryset (`ExpertProfile` has no
`Meta.ordering`), so it passed in isolation and failed intermittently in a full
run. This is very likely the cause of the previously unexplained CI failures on
`d78196d`, where a job failed on a SHA that passed the same job elsewhere. Fixed
by ordering on `pk`; no other instance of the pattern exists in the suite.

**Verified live** against a `config.settings.prod` stack: 23 internal URLs
crawled, **0 broken links**; every sitemap URL 200 and indexable; empty subjects
`noindex` *and* absent from the sitemap; canonical/`robots.txt` host is the
production hostname; with the API down and a cold cache every page returns 200,
degrades honestly and invents no numbers.

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

Still absent: `/blog/*` (out-of-MVP by decision — see "Public marketing surface"
above) and OG **image** generation for profiles. `/for-experts`, `/about`,
`/subjects` and `/subjects/[slug]` have since been built.

---

## Post-Phase-12 audit, part 2 (2026-09-28) — E2E finally executed; release-blocking CSP defect found and fixed

### Finding 3 — the enforced nonce CSP blocked ALL JavaScript on 33 of 45 routes

**Severity: release-blocking.** In a production build, `/login`, `/register`, `/account`,
`/orders`, `/messages`, `/experts`, `/requests`, `/offers`, `/assignments`,
`/opportunities`, every `/expert/*` and every `/portal/*` page executed **no JavaScript
at all**. Nothing hydrated; React forms fell back to native GETs.

**Mechanism.** ADR-0017's policy is `script-src 'self' 'nonce-<n>' 'strict-dynamic'`.
`'strict-dynamic'` makes browsers **ignore `'self'`**, so the per-request nonce is the
only thing that can authorise a script. A statically prerendered route is built at
`npm run build` — no request, no nonce — so its script tags ship bare and the browser
refuses all of them.

**Why every existing gate missed it.** The failure is invisible to anything that does not
execute JavaScript. SSR HTML was correct, the CSP header was correct, and the response was
`200`. Curl sweeps and link crawls passed. Middleware unit tests assert header strings.
`scripts/smoke_test.sh` did compare the header nonce against the document — but only on
`/`, which happened to be the one marketing route already rendering on demand. And the
Playwright suite had **never actually been run**: it had only ever been pointed at the dev
server, where `enforce = NODE_ENV === "production"` is false, so the policy is report-only
*and* carries `'unsafe-inline'`.

**Fix (ADR-0018):** `frontend/src/app/layout.tsx` awaits `headers()`, opting every document
route into on-demand rendering. One central switch instead of `force-dynamic` in ~40 files,
and new routes are covered automatically. Security posture is unchanged — still enforcing,
still no `unsafe-inline`/`unsafe-eval` in `script-src`. Static prerendering is simply not
available to document routes while the policy is enforced; nothing working was traded away,
because those pages were inert.

**Regression coverage added:** `frontend/e2e/csp-nonce.spec.ts` (every executable script
carries the policy nonce, on 6 routes, plus a real hydration check asserting zero
CSP-blocked requests) and a hardened `scripts/smoke_test.sh` that samples `/`, `/login`
and `/about`. The hardened gate was verified to fail on the pre-fix HTML, not just pass on
the fixed HTML.

### How to actually run E2E in this sandbox (it works — this is not theoretical)

Network egress is restricted to the npm registry, so `npx playwright install` **cannot**
work (`cdn.playwright.dev`, `storage.googleapis.com`, `playwright.azureedge.net`,
`github.com` are all unreachable). A browser can still be obtained from npm:

```bash
mkdir -p /tmp/chrometry && cd /tmp/chrometry && npm i @sparticuz/chromium
node -e "require('@sparticuz/chromium').default.executablePath().then(console.log)"   # -> /tmp/chromium
# its bundled libs must be unpacked too (brotli): al2023.tar.br, swiftshader.tar.br, fonts.tar.br -> /tmp/chromelibs
export LD_LIBRARY_PATH=/tmp/chromelibs/lib:/tmp/chromelibs                            # the lib/ subdir matters
```

`playwright.config.ts` already honours `E2E_CHROMIUM_PATH` (with `--no-sandbox`) for
exactly this case. Playwright 1.55 drives this Chromium (153) without complaint.

**Stack the journeys require — all four conditions matter:**

1. **API on port `:8000`.** The browser bundle has `http://localhost:8000` baked in at
   build time; the API cannot be moved to another port without rebuilding the frontend.
2. **`manage.py runserver` (Daphne), not `uvicorn`.** Django serves no static files under
   ASGI by design — Caddy serves `/static/*` in production from the shared `staticfiles`
   volume. Under `uvicorn` the Django admin has no CSS/JS, so `actions.js` never loads,
   the select-all checkbox selects nothing, and every admin-driven journey step fails.
3. **CORS and email must point at the real web port.** `CORS_ALLOWED_ORIGINS` defaults to
   `FRONTEND_URL` = `http://localhost:3000`; serving the web on `:3100` without overriding
   it means every browser API call is blocked and no form ever submits.
4. **`PYTHONUNBUFFERED=1` (or `stdbuf -oL`) on both API and worker.** The E2E helper scrapes
   the verification link out of the process log; piping Python through `tee` block-buffers
   stdout and the token never arrives within the 30s poll.

```bash
# API (+ static + WS), console email -> log
cd backend && PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings.dev \
  DATABASE_URL="postgres://postgres@/hem_dev?host=/home/user/pgdata" ALLOWED_HOSTS='*' \
  FRONTEND_URL='http://localhost:3100' CORS_ALLOWED_ORIGINS='http://localhost:3100' \
  stdbuf -oL /home/user/.venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload 2>&1 | stdbuf -oL tee -a /tmp/hem-mail.log
# worker (same env) -> same log
... manage.py qcluster 2>&1 | stdbuf -oL tee -a /tmp/hem-mail.log
# web: NEXT_PUBLIC_API_URL must be set at RUNTIME too, or middleware computes connect-src 'self'
cd frontend/.next/standalone && NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0 \
  SERVER_API_URL=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=http://localhost:8000 \
  NEXT_PUBLIC_WS_URL=ws://localhost:8000 node server.js
# run
cd frontend && E2E_CHROMIUM_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/chromelibs/lib:/tmp/chromelibs \
  E2E_BASE_URL=http://localhost:3100 E2E_ADMIN_BASE_URL=http://localhost:8000 \
  E2E_DELIVERY_LOG=/tmp/hem-mail.log npx playwright test e2e --reporter=list
```

### Finding 4 — `frontend/Dockerfile`'s `prod` stage is not self-sufficient (benign, recorded not changed)

The `prod` stage sets only `NODE_ENV`/`NEXT_TELEMETRY_DISABLED`; the `NEXT_PUBLIC_*`
`ENV` lines live in the `build` stage and do not carry over. `connectSources()` in the
middleware reads them from the **runtime** environment, so the bare image would emit
`connect-src 'self'` and block every browser API call. `docker-compose.prod.yml` passes
them as runtime `environment:` (lines ~145-151), so the supported deployment path is
correct — but `docker run` on the image alone is not. Left as-is deliberately; changing it
would duplicate configuration that compose already owns.

### Verified test baselines after the fix (all actually executed this session)

| Gate | Result |
|---|---|
| backend `pytest` | **439 passed** |
| frontend `vitest` | **143 passed / 25 files** |
| `tsc --noEmit` | clean |
| `eslint src e2e --max-warnings 0` | clean |
| `ruff check` / `ruff format --check` | clean (264 files) |
| `lint-imports` | 2 contracts kept |
| production build | clean; all document routes `ƒ` |
| **Playwright E2E** | **13/13 passed** (4 journeys + 2 smoke + 7 CSP guards) |
| `scripts/smoke_test.sh` | **24 passed, 0 failed** |

---

## Session 3 (2026-09-28) — GitHub still unreachable; expert-directory SEO closed

**Git recovery attempted again and still blocked.** Re-tested rather than assumed. The
block is an **SNI-based egress allowlist**, not an auth problem and not a routing
failure: DNS resolves (`140.82.116.3`), TCP 443 **opens**, then the TLS handshake is
killed — `openssl s_client` reports *"no peer certificate available"* and reads 0 bytes,
while `registry.npmjs.org` returns a valid cert (`Verify return code: 0 (ok)`). No proxy
is configured. So fetch/push/PR/CI remain impossible from this sandbox, and the recovery
procedure documented above is still the correct first action for a connected session.

**Product work completed: expert-directory SEO (roadmap Finding 6).** The previous
session found that `/experts` and `/experts/[slug]` shipped the generic site title with
no canonical and no structured data, despite being in `sitemap.ts` and despite the docs
claiming otherwise. Fixed **without touching either tested client component** by adding a
sibling server `layout.tsx` in each segment — the profile layout fetches through a new
`getPublicExpert()` on the shared `fetchPublic` helper and emits `generateMetadata` plus
`ProfilePage`/`Person` JSON-LD. Unknown expert or dead API → `noindex, follow`, no
JSON-LD, no invented name; `aggregateRating` only when real reviews exist. Client bundles
unchanged.

**A full Part 11 state matrix** (every area classified Complete / Partially complete /
Missing / Intentionally out of MVP / Owner provisioning required / Production
verification required) is at the end of `roadmap-phases.md`.

### The four states, kept strictly separate

| | State |
|---|---|
| **Repository** | Feature-complete and locally validated. **Uncommitted** — 547 files would stage here because `24437a5` is a 1-file base |
| **CI** | **Unknown.** Not reachable from this sandbox. Do not describe any CI result as verified until the logs are read |
| **Deployment preparation** | Complete and verified locally (compose, Caddy, prod image, deploy/rollback/smoke scripts, backup + restore drill) |
| **Staging** | **Does not exist.** Never deployed, never tested |
| **Production** | **Does not exist.** Never deployed |

### Verified this session

pytest **439** · vitest **143 / 25 files** · eslint 0 warnings · tsc clean · ruff +
format · import-linter 2/2 · `makemigrations --check` clean · production build clean
(45 dynamic routes, only `/robots.txt` static) · bundle budgets respected · env-docs 37 ·
**Playwright E2E 13/13** · **smoke 24/24** · sitemap 18/18 all 200.

---

## Session 4 (2026-09-28) — connectivity re-tested; recovery is now a tested script

**GitHub still unreachable — third independent confirmation.** Same signature: DNS
resolves, TCP 443 opens, TLS handshake is killed (`no peer certificate available`,
0 bytes read) while `registry.npmjs.org` presents a valid certificate. It is an
SNI-based egress allowlist. `git ls-remote` fails with `gnutls_handshake() failed`.

**Two environment facts that change the recovery advice:**

1. **`.git/config` is excluded from workspace snapshots.** The widened fetch refspec
   set in session 3 was gone by session 4 — back to `+refs/heads/main:...`. Any
   instruction that assumes a persisted refspec is wrong; it must be re-widened every
   session. The working tree *does* persist, which is why the recovery now lives in a
   **script in the repo** rather than in prose.
2. **The whole toolchain is ephemeral.** `.venv`, `.pgvenv`, `pgdata`,
   `node_modules`, `.next` and the `/tmp` Chromium were all gone at session start.
   Only the 550-file source tree survived. Budget a rebuild before any validation.

### Egress is a package-registry allowlist (session 5 finding)

Session 5 characterised the block precisely instead of only retrying HTTPS. **Every**
transport to GitHub is reset — `ssh git@github.com` (port 22 and 443) returns
`kex_exchange_identification: Connection reset by peer`, `git://` resets, and HTTP,
TLS 1.2 and TLS 1.3 all return `000`. Five retries spaced over 100 s all failed.

The decisive test was widening the probe beyond GitHub:

| Host | Result |
|---|---|
| `pypi.org`, `registry.npmjs.org` | **200** |
| `github.com`, `gitlab.com`, `bitbucket.org` | 000 |
| `google.com`, `cloudflare.com` | 000 |

So this sandbox reaches **package registries only**. It is not GitHub-specific
hostility and there is no alternate host, mirror or tunnel to route through — a push
from this environment class is impossible, and no amount of retrying will change it.
Delivering the code requires an execution environment with general network egress.

### Session 6 — TWO blockers, not one (important for whoever provisions the next session)

A session was started on the assumption that it had general GitHub egress. It did not,
and it surfaced a second blocker that had been hidden behind the first:

```
GH_TOKEN = "arena-egress-dummy-token"      <- a literal placeholder
gh auth status -> X github.com: authentication failed
                  The github.com token in GH_TOKEN is no longer valid.
registry.npmjs.org -> 200      github.com -> 000
```

So the next session needs **both**:

1. **general network egress** (not the package-registry-only allowlist), and
2. **a real GitHub credential** — the sandbox injects a dummy token, so even with
   egress restored, `git push` would fail on authentication.

Checking `gh auth status` and `echo $GH_TOKEN` at session start is the fastest way to
tell a genuinely connected environment from one that only claims to be: if the token
reads `arena-egress-dummy-token`, delivery will fail regardless of network state.

### `scripts/recover_branch.sh` — the blocked operation, made safe and tested

Run `scripts/recover_branch.sh` to inspect, `--apply` to reconcile. It re-widens the
refspec, fetches, verifies the remote branch exists, reports whether `d78196d` and
`5decba4` are ancestors, **tars every git-relevant file before mutating anything**,
runs `git reset --mixed` (index + HEAD only — files are never touched), then guards the
one hazard that could silently destroy work: any file present in the remote tree but
missing on disk is restored with `git checkout --` and re-verified, so a ` D` entry can
never reach `git add -A`. It never runs `reset --hard`, `clean`, or a force-push.

`--commit` (session 5) takes it all the way to a commit, so the connected session runs
**one command** and the only remaining step is `git push`. It carries two guards:

* **squash guard** — refuses to commit if the pending delta exceeds
  `RECOVER_MAX_DELTA` (default 200). A whole-project delta means `HEAD` is still the
  truncated base, and committing would create exactly the blob this script exists to
  prevent.
* **staged-deletion guard** — re-checks after `git add -A` and aborts if any deletion
  was staged.

Six paths were exercised against purpose-built fixture repositories:

| Path | Result |
|---|---|
| Success (`--apply`) | Untracked tree collapsed to the true delta; files identical to the remote dropped out; `node_modules` stayed ignored; backup written |
| Success (`--commit`) | Commit landed **on top of the real chain** (`new → tip → phases → initial`), working tree clean, fast-forward so a normal push succeeds |
| File missing on disk | Detected, restored from the remote tree, re-verified to 0 deletions |
| Squash guard | Refused at 13 files vs limit 3; nothing staged, nothing committed |
| Branch absent on remote | Aborted; `HEAD` unchanged |
| No connectivity | Aborted at fetch; `HEAD` unchanged, 550 files untouched (re-verified against the real repo) |

This is the first action for the next session that has GitHub access:

```bash
scripts/recover_branch.sh            # inspect
scripts/recover_branch.sh --commit   # backup, fetch, reset --mixed, guard, commit
git push origin arena/01a0e69d-knowledge-marketplace   # never --force
```

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