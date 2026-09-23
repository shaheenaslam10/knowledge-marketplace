# API Architecture

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Conventions

- Base path `/api/v1/` (URL versioning; v2 would be additive-new, not breaking-in-place).
- Auth: JWT via httpOnly cookies (`see authentication.md`); `Authorization: Bearer` also accepted for scripts/tests.
- IDs: UUIDs in URLs. Pagination: cursor-based (`?cursor=&page_size=`, max 100). Filtering: django-filter query params. Sorting: `?ordering=`.
- Errors: uniform envelope `{"error": {"code", "message", "details"}}` — codes are stable strings consumed by the frontend (see [backend error handling](backend.md)).
- Mutating requests require header `X-Requested-With: XMLHttpRequest` (CSRF defense-in-depth) — enforced by middleware for cookie-authed requests.
- OpenAPI 3 at `/api/schema/` (drf-spectacular) → generates frontend types. **The schema is the contract.**
- Rate limits (DRF throttle, per-env): anon 30/min, authed 120/min; auth endpoints 10/min; offer/message creation 30/min.
- Idempotency: unsafe money-adjacent endpoints accept `Idempotency-Key` header (stored, deduped 24h).

## Endpoint catalog (MVP)

### Auth & account — `/api/v1/auth`, `/api/v1/me`
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | email+password+name → verification email |
| POST | `/auth/verify-email` | token |
| POST | `/auth/token` | login → sets cookies |
| POST | `/auth/token/refresh` | rotation |
| POST | `/auth/logout` | blacklists refresh |
| GET/PATCH | `/me` | profile |
| GET/PATCH | `/me/student-profile` | |
| POST | `/auth/password/reset` · `/auth/password/reset/confirm` | email flow |

### Experts — `/api/v1/experts`
| Method | Path | Notes |
|---|---|---|
| GET | `/experts` | public directory: filters (subject, rating_min, price, q), pagination |
| GET | `/experts/{slug}` | public profile + published reviews (paginated sub-resource `/reviews`) |
| POST | `/experts/apply` | submit application (multipart: profile + credential file) |
| GET/PATCH | `/me/expert-profile` | own profile/availability |
| GET | `/me/earnings` | ledger-derived per-order earnings + payout status |
| GET | `/me/payouts` | payout history |
| GET | `/public/stats` | homepage counters (experts, orders, subjects) |

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

### Files — `/api/v1/files`
| POST | `/files` | authed | multipart upload (purpose + context ids validated) |
| GET | `/files/{id}/download-url` | authorized | → presigned (R2) or signed stream URL |
| GET | `/files/{id}/download?token=` | signed token | local/dev streaming |

### Reviews & disputes — `/api/v1/reviews`, `/api/v1/disputes`
| POST | `/orders/{id}/review` | student | once, completed |
| POST | `/reviews/{id}/reply` · `/reviews/{id}/report` | | |
| POST | `/orders/{id}/dispute` | participant | opens dispute |
| GET | `/disputes/{id}` + `/disputes/{id}/messages` · POST message | participants/admin | |

### Health & ops
| GET | `/healthz` (app+db), `/readyz` (migrations applied) | public | for load balancers/uptime |

## Admin back office

Not REST in MVP — **Django admin** (ADR-0010) covers: expert approval, managed triage actions, moderation, dispute resolution, refund/payout actions, PlatformConfig, audit viewer, KPI dashboard. Any endpoint that proves awkward in admin gets promoted to a `/api/v1/admin/*` REST surface post-MVP **using the same service layer**.

## Versioning & deprecation policy

Additive changes anytime; breaking changes require `/api/v2` + a deprecation window; the OpenAPI schema diff runs in CI to flag breaking changes against the committed snapshot.
