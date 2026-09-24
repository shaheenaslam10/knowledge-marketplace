# API Architecture

> Status: ✅ through Phase 8 (auth, profiles, experts, taxonomy, files, requests, offers, managed, orders, payments, messaging, notifications) · Last updated: Phase 8 completion

## Conventions

- Base path `/api/v1/` (URL versioning; v2 would be additive-new, not breaking-in-place).
- Auth: JWT via httpOnly cookies (`hm_access`/`hm_refresh` — see [authentication](authentication.md)); `Authorization: Bearer` also accepted for scripts/tests. Deny-by-default: every endpoint is `IsAuthenticated` unless it opts into `AllowAny`.
- IDs: UUIDs in URLs. Pagination: cursor-based (`?cursor=&page_size=`, max 100). Filtering: django-filter query params. Sorting: `?ordering=`.
- Errors: uniform envelope `{"error": {"code", "message", "details"}}` — codes are stable strings consumed by the frontend (see [backend error handling](backend.md)).
- Mutating requests require header `X-Requested-With: XMLHttpRequest` (CSRF defense-in-depth) — enforced by middleware for cookie-authed requests.
- OpenAPI 3 at `/api/schema/` (drf-spectacular) → generates frontend types. **The schema is the contract.** Auth endpoints carry request/response schemas; cookie auth is documented as the `cookieAuth` scheme (`hm_access`).
- Rate limits (DRF throttle, per-env): anon 30/min, authed 120/min; **auth scope 10/min** (`THROTTLE_AUTH`); offer/message creation 30/min.
- Idempotency: unsafe money-adjacent endpoints accept `Idempotency-Key` header (stored, deduped 24h).

## Endpoint catalog (MVP)

### Auth & account — `/api/v1/auth`, `/api/v1/me` — ✅ **implemented (Phase 2)**

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | email+name+password → account (student role) + verification email + auto-login cookies; enumeration-safe (existing email ⇒ identical 201, owner re-emailed) |
| POST | `/auth/verify-email` | signed token, 24 h TTL, single-use/idempotent |
| POST | `/auth/token` | login → sets cookies; generic `401 invalid_credentials`; records `last_login_ip` |
| POST | `/auth/token/refresh` | rotate + blacklist; reuse ⇒ `401 token_invalid`; inactive user refused |
| POST | `/auth/logout` | blacklists refresh, clears cookies; idempotent, anonymous-safe |
| POST | `/auth/resend-verification` | authed; throttled |
| POST | `/auth/password/reset` | enumeration-safe: identical response always |
| POST | `/auth/password/reset/confirm` | single-use; blacklists all user tokens |
| POST | `/auth/password/change` | authed; verifies current password; kills all sessions |
| GET/PATCH | `/me` | profile + roles dict |
| POST | `/me/deactivate` | self-service deactivation (immediate: per-request `is_active`) |

Deferred to their phase: `/me/student-profile` (Phase 3+ domain profiles).

### Experts — `/api/v1/experts` — ✅ **application/directory implemented (Phase 3)**
| Method | Path | Notes |
|---|---|---|
| GET | `/experts` | ✅ public directory: approved + public + active experts only; `q` search, `subject`/`skill` slug filters, `rating_min`; cursor pagination. No private fields ever |
| GET | `/experts/{slug}` | ✅ public profile (same visibility rules; suspended/opted-out → 404). Reviews sub-resource arrives Phase 9 |
| GET | `/experts/apply-info` | ✅ public requirements + taxonomy reference for the apply form |
| GET | `/me/expert-application` | ✅ own application + lifecycle status (`not_applied` when none) |
| POST | `/me/expert-application` | ✅ create application (draft) |
| PATCH | `/me/expert-application` | ✅ partial edit — draft/submitted/rejected only (locked under review) |
| POST | `/me/expert-application/submit` | ✅ validates attestations + ≥1 credential + verified email → `submitted` |
| GET/PATCH | `/me/expert-profile` | ✅ own expert profile / availability + visibility (approval required) |
| POST | `/experts/apply` | superseded by the `/me/expert-application` trio (draft → edit → submit) |
| GET | `/me/earnings` | ledger-derived earnings + payout status (Phase 7) |
| GET | `/me/payouts` | payout history (Phase 7) |
| GET | `/public/stats` | homepage counters (later phase) |

### Taxonomy — `/api/v1/taxonomy`
| GET | `/subjects` (tree), `/skills?q=` | public |

### Requests — `/api/v1/requests`
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/requests` | student | mode-specific validation + integrity attestation |
| GET | `/requests` | student | own list (filters: status, mode) |
| GET | `/requests/{id}` | owner / expert-visible / admin | field-level visibility per viewer |
| PATCH | `/requests/{id}` | owner | while editable (BR-07) |
| POST | `/requests/{id}/cancel` | owner | |
| POST | `/requests/{id}/re-open` | owner | expired → open (once, BR-08) |
| GET | `/requests/{id}/offers` | owner | |
| GET | `/opportunities` | expert | open requests board (filters, FTS) |
| POST | `/requests/{id}/report` | any authed | integrity/moderation report |

### Offers — `/api/v1/offers`
| POST | `/requests/{id}/offers` | expert | one per expert (BR-15) |
| PATCH | `/offers/{id}` | expert | while pending |
| DELETE | `/offers/{id}` | expert | withdraw |
| POST | `/offers/{id}/accept` | student(owner) | → creates Order (transactional) |
| POST | `/offers/{id}/decline` | student(owner) | |
| GET | `/me/offers` | expert | |

### Managed — `/api/v1/invitations`, `/api/v1/assignments`
| GET | `/me/invitations` | expert | pool invitations |
| POST | `/invitations/{id}/accept` · `/decline` | expert | first-accept wins |
| GET | `/me/assignments` | expert | direct assignments |
| POST | `/assignments/{id}/accept` · `/decline` | expert | 24h TTL |
| GET | `/requests/{id}/quote` | student | managed quote view |
| *(admin triage actions)* | via Django admin → services | admin | approve_pool / assign / reject |

### Orders — `/api/v1/me/orders` (Phase 6 implementation)
| GET | `/me/orders` | participant | cursor-paginated; each row carries `role` (student/expert) + status/source/price |
| GET | `/me/orders/{id}` | participant | full workspace payload: meta, counterparty, commission split, revisions, timers, `events` timeline, `deliveries` (with files) |
| POST | `/me/orders/{id}/deliveries` | expert | JSON: summary (≥20 chars) + `attachment_ids` (uploaded via `/files`, purpose `delivery`) |
| POST | `/me/orders/{id}/request-revision` | student | `{note}` required (≥10 chars); pauses auto-approval, +7d due date |
| POST | `/me/orders/{id}/approve` | student | completes the order (auto-approval does the same after 72h) |
| POST | `/me/orders/{id}/cancel` | participant | pre-payment: either party w/ reason; post-payment: support only (BR-26..28) |
| *(deadline proposal/accept)* | via chat thread | student | deferred — dropped from Phase 8 scope (backlog with Phase 9) |

### Payments — `/api/v1` (Phase 7 shipped)
| POST | `/me/orders/{id}/pay` | student (owner) | starts payment on the active gateway; amounts from the booked order only |
| POST | `/me/orders/{id}/payment/confirm` | student (owner) | **dev-only** (`PAYMENT_DEV_SELF_CONFIRM`), manual rails: simulated "transfer arrived" → active |
| GET | `/me/earnings` | expert | ledger-derived earned / paid-out / available (BR-32) |
| GET | `/me/payouts` | expert | payout history |
| POST | `/payments/webhooks/{provider}` | provider (signed) | **public**, signature-verified before storage, event-id idempotent |
| *(admin confirm/refund/settle)* | via Django admin service actions | staff | manual-rails operator flows (BR-26..28) |

> Payment status also rides on the order detail payload (`payment` block: status, amounts, refunded, failure reason; instructions for students on manual rails). `extend-deadline` was dropped from Phase 8 scope (backlog).

### Messaging — `/api/v1/me/threads` + WS — ✅ **implemented (Phase 8)**
| GET | `/me/threads` | ✅ participant | inbox cards (counterpart, preview, per-thread unread, read-only flag) |
| POST | `/me/threads/open` | ✅ participant | `{context_type, order_id \| request_id}` → lazy create-or-fetch thread id |
| GET | `/me/threads/{id}` | ✅ participant | full history; **marks the thread read** |
| POST | `/me/threads/{id}/messages` | ✅ participant | `{body, attachment_id?}` — REST send / offline fallback |
| POST | `/me/threads/{id}/read` | ✅ participant | read receipt (watermark) |
| WS | `/ws/threads/{id}/` | ✅ participant | realtime `message.send`/`typing`/`read`; broadcasts `message.new`; close 4401 unauth / 4403 non-participant |

*Chat-based deadline proposal (`extend-deadline`) was dropped from the Phase 8 scope during implementation — it is backlog, tracked with the Phase 9 disputes/moderation wave.*

### Notifications — `/api/v1/me/notifications` — ✅ **implemented (Phase 8)**
| GET | `/me/notifications` | ✅ authed | latest 50 + unread count |
| POST | `/me/notifications/{id}/read` · `/me/notifications/read-all` | ✅ authed | read state |
| GET/PUT | `/me/notification-preferences` | ✅ authed | per-category email toggle (`account` immutable) |
| GET | `/unsubscribe?token=…` | 🌐 public | one-click email opt-out (signed token; renders confirmation page) |
| WS | `/ws/notifications/` | ✅ authed | `notification.push` → client refetch + toast |


### Files — `/api/v1/files` — ✅ **foundation implemented (Phase 3)**
| POST | `/files` | ✅ authed | multipart upload; purposes `credential` (pdf/png/jpg ≤10 MB, private) + `avatar` (png/jpg/webp ≤2 MB, public); content sniffing, sha256 dedupe |
| GET | `/files/{id}` | ✅ uploader/staff | metadata |
| GET | `/files/{id}/download-url` | ✅ authorized | 5-min signed token (R2 presigned arrives with the Phase 9 adapter); staff views of private credentials are audited |
| GET | `/files/{id}/download?token=` | ✅ signed token / public | local streaming; `Content-Disposition` + `nosniff` |
Other purposes: `request_brief` (Phase 4), `message` (Phase 8 — 5 MB pdf/png/jpg/jpeg/txt, thread-participant download authorization), `delivery` (Phase 6) are live; `dispute_evidence` lands Phase 9.

### Reviews & disputes — `/api/v1/reviews`, `/api/v1/disputes`
| POST | `/orders/{id}/review` | student | once, completed |
| POST | `/reviews/{id}/reply` · `/reviews/{id}/report` | | |
| POST | `/orders/{id}/dispute` | participant | opens dispute |
| GET | `/disputes/{id}` + `/disputes/{id}/messages` · POST message | participants/admin | |

### Taxonomy — `/api/v1/taxonomy` — ✅ **implemented (Phase 3)**
| GET | `/taxonomy/terms` | public | shared reference data; `kind`, `parent`, `q` filters. Curated via Django admin; seeded demo tree |

### Student profile — ✅ **implemented (Phase 3)**
| GET | `/me/student-profile` | authed | `{"profile": null}` until onboarding (self-service — never approval-gated) |
| PATCH | `/me/student-profile` | authed | idempotent create/update; display name, bio, interest ids (taxonomy subject/skill) |

### Marketplace — ✅ **implemented (Phase 4)**
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/me/requests` | student's own requests (cursor pagination, `status` filter) / create draft |
| GET/PATCH | `/me/requests/{id}` | owner only; PATCH draft-only (`request_locked` otherwise) |
| POST | `/me/requests/{id}/publish` | requires `attested: true` (BR-10); draft→open + 30d TTL |
| POST | `/me/requests/{id}/cancel` · `/reopen` | BR-09 / BR-08 (reopen once) |
| GET | `/requests` | **expert feed**: eligible open requests only; `q`, `subject`, `skill`, `category`, `pricing_type`, `deadline_before`, `budget_min` filters |
| GET | `/requests/{id}` | owner/staff/eligible expert; blind bidding (`bidding`: count + own status only); selected expert keeps access; increments view_count |
| POST | `/requests/{id}/offers` | expert submit (min amount BR-18; one per request BR-15; ≤20 pending; net preview BR-17) |
| GET | `/me/offers` · PATCH `/me/offers/{id}` · POST `/me/offers/{id}/withdraw` · `/resubmit` | expert offer management (pending editable; withdrawn resubmittable while open) |
| GET | `/me/requests/{id}/offers` | owner: offers + expert public cards (never private data) |
| POST | `/me/requests/{id}/offers/{offer_id}/accept` | **transactional selection** → offer accepted, siblings declined, request `matched`, Order `awaiting_payment` |
| POST | `/me/requests/{id}/offers/{offer_id}/decline` | owner declines pending offer (optional reason) |

### Managed assignments — ✅ **implemented (Phase 5)**
| Method | Path | Notes |
|---|---|---|
| GET | `/me/pool-invitations` | expert's invitations: request summary, platform-set quote, budget reference, TTL |
| POST | `/me/pool-invitations/{id}/accept` | first-accept wins (row-locked); optional advisory `expected_amount`; creates the Order (`managed_pool`) at the quote |
| POST | `/me/pool-invitations/{id}/decline` | optional reason |
| GET | `/me/assignments` | expert's direct assignments: proposed price/scope/deadline, TTL |
| POST | `/me/assignments/{id}/accept` | creates the Order (`managed_direct`) at the proposed price |
| POST | `/me/assignments/{id}/decline` | optional reason → back with the owner (BR-21) |
Owner triage (approve pool / assign direct / supersede / reject / set quote) is **Django admin only** (ADR-0010) — no public API surface by design; every action is staff-guarded and audited server-side.

### Health & ops
| GET | `/healthz` (app+db), `/readyz` (migrations applied) | public | for load balancers/uptime |

## Admin back office

Not REST in MVP — **Django admin** (ADR-0010) covers: expert approval, managed triage actions, moderation, dispute resolution, refund/payout actions, PlatformConfig, audit viewer, KPI dashboard. Any endpoint that proves awkward in admin gets promoted to a `/api/v1/admin/*` REST surface post-MVP **using the same service layer**.

## Versioning & deprecation policy

Additive changes anytime; breaking changes require `/api/v2` + a deprecation window; the OpenAPI schema diff runs in CI to flag breaking changes against the committed snapshot.
