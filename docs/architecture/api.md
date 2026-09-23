# API Architecture

> Status: ✅ Phase 3 (auth, profiles, experts, taxonomy, files) · Last updated: Phase 3

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

### Orders — `/api/v1/orders`
| GET | `/orders` | participant | role-scoped (student/expert view params) |
| GET | `/orders/{id}` | participant/admin | full workspace payload (deliveries, timeline) |
| POST | `/orders/{id}/deliver` | expert | multipart: summary + files |
| POST | `/orders/{id}/revisions` | student | request revision (change list required) |
| POST | `/orders/{id}/approve` | student | complete |
| POST | `/orders/{id}/cancel` | participant | per BR-26 |
| POST | `/orders/{id}/extend-deadline` | student | accept expert's proposal |

### Payments — `/api/v1/payments`
| POST | `/orders/{id}/pay` | student | → PaymentIntent client_secret (or manual instructions) |
| GET | `/payments/{id}` | student | status polling fallback |
| POST | `/payments/webhook/stripe` | Stripe (signed) | **public**, signature-verified, idempotent |
| POST | `/orders/{id}/manual-payment-reference` | student | manual gateway mode |

### Messaging — `/api/v1/threads` + WS
| GET | `/threads` | participant | inbox |
| GET | `/threads/{id}/messages` | participant | paginated history |
| POST | `/threads/{id}/messages` | participant | REST fallback send |
| POST | `/threads/{id}/read` | participant | read receipt |
| WS | `/ws/threads/{id}/` | participant | realtime events |
| WS | `/ws/notifications/` | authed | personal push |

### Notifications — `/api/v1/notifications`
| GET | `/notifications` · POST `/{id}/read` · POST `/read-all` · GET/PATCH `/me/notification-preferences` | |

### Files — `/api/v1/files` — ✅ **foundation implemented (Phase 3)**
| POST | `/files` | ✅ authed | multipart upload; purposes `credential` (pdf/png/jpg ≤10 MB, private) + `avatar` (png/jpg/webp ≤2 MB, public); content sniffing, sha256 dedupe |
| GET | `/files/{id}` | ✅ uploader/staff | metadata |
| GET | `/files/{id}/download-url` | ✅ authorized | 5-min signed token (R2 presigned arrives with the Phase 9 adapter); staff views of private credentials are audited |
| GET | `/files/{id}/download?token=` | ✅ signed token / public | local streaming; `Content-Disposition` + `nosniff` |
Other purposes (`request_brief`, `message`, `delivery`, `dispute_evidence`) land with their phases.

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
