# Backend Architecture — Django Modular Monolith

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Layout

```text
backend/
├── config/                     # project (not a business domain)
│   ├── settings/               # base.py, dev.py, test.py, prod.py
│   ├── urls.py                 # mounts /api/v1/, /admin/, /ws/
│   ├── asgi.py                 # Channels routing (HTTP+WS, uvicorn)
│   └── wsgi.py                 # for tooling that needs WSGI
├── apps/
│   ├── core/                   # shared kernel: base models, money utils, health, PlatformConfig
│   ├── accounts/               # User, StudentProfile, registration/auth, role state
│   ├── experts/                # ExpertProfile, application/approval, availability, earnings view
│   ├── taxonomy/               # TaxonomyTerm (category/subject/skill/tag) — shared reference data
│   ├── service_requests/       # ServiceRequest + visibility
│   ├── bidding/                # Offer
│   ├── assignments/            # PoolInvitation, DirectAssignment
│   ├── orders/                 # Order, Delivery + state machine + timer jobs
│   ├── payments/               # gateway adapters, Payment/Payout/Refund, LedgerEntry, WebhookEvent
│   ├── messaging/              # Thread, Message, WS consumers
│   ├── files/                  # Attachment + secure access
│   ├── notifications/          # Notification, NotificationPreference, fan-out tasks
│   ├── reviews/                # Review + aggregates
│   ├── disputes/               # Dispute + resolution execution hooks
│   ├── audit/                  # AuditLog + middleware
│   ├── analytics/              # read-only aggregates for admin KPIs (no user data writes)
│   └── seed/                   # top layer: seed_demo (accounts cannot import domain apps)
├── manage.py
├── pyproject.toml        # deps + ruff + import-linter + pytest config (single source)
└── docker/               # container entrypoints (dev compose; db-wait/worker wait)
```

## The dependency rule (enforced by import-linter in CI)

```text
core ← accounts ← experts (also → taxonomy/files/audit sidecars) · seed on top
             ↓
   service_requests ← bidding / assignments
             ↓
           orders ← payments / disputes / reviews
messaging / files / notifications / audit: used by all domain apps (sidecar services)
analytics: read-only over everything
```

Concrete rules:

1. **Domain apps never import each other's models directly** — they call the owning app's **service layer** (`apps/<domain>/services.py`) or receive IDs. Direct cross-app model imports are allowed only in the *downward* direction shown above (e.g., `orders` may import `accounts`; `bidding` may not import `orders` — it calls `orders.services.create_order_from_offer(...)`).
2. **`core` imports nothing from domain apps.**
3. **Sidecars** (messaging, files, notifications, audit) expose narrow services; they never import domain apps.
4. **Serializers/views** may compose read models across apps (`selectors.py` per app for queries).
5. The only file allowed to wire everything: `config/urls.py` + `config/settings`.

This keeps future extraction seams clean (ADR-0001): each app's service functions are the would-be RPC surface.

## App anatomy (every domain app)

```text
apps/orders/
├── models.py          # entities + enums (TextChoices), constraints
├── services.py        # ALL business logic entry points (transactions, row locks, events)
├── selectors.py       # read/query compositions for API
├── api/
│   ├── serializers.py
│   ├── views.py       # thin: authn/authz → service/selectors
│   └── permissions.py
├── tasks.py           # background jobs (django-q2 wrappers → services)
├── admin.py           # customized Django admin (actions call services)
├── tests/             # unit (services) + API tests
└── apps.py
```

Rules: views contain no business logic; services are transaction boundaries (`atomic`, `select_for_update` where contended); admin actions call services (never mutate ad hoc); tasks call services; services emit notifications/audit via sidecar services.

## Cross-cutting services (in `core` / sidecars)

| Service | Contract |
|---|---|
| `core.services.money` | minor-unit math, currency formatting, allocation splits |
| `core.services.config` | PlatformConfig typed accessors with cache + invalidation |
| `notifications.services.notify(user, type, ctx)` | the only way to create notifications |
| `audit.services.log(actor, action, obj, before, after, request)` | the only way to write audit rows |
| `files.services.grant_download(user, attachment)` | the only file-access gate |
| `payments.gateway` | `PaymentGateway` protocol: `create_payment`, `capture_webhook_event`, `refund`, `transfer`, `account_link` |

## Technology & libraries (pinned in `pyproject.toml`)

| Library | Purpose |
|---|---|
| Django 5.2 LTS, DRF | core |
| `psycopg[binary]` | Postgres driver (v3) |
| `django-q2` (ORM broker) | DB-backed queue + scheduler; worker `manage.py qcluster` — no Redis (ADR-0002) |
| `channels` (4.3.x) + `uvicorn[standard]` | ASGI + WebSockets |
| `djangorestframework-simplejwt` | auth tokens |
| `django-filter`, `drf-spectacular` | filtering, OpenAPI schema |
| `django-cors-headers` | CORS allowlist |
| `django-storages[boto3]` | R2/S3-compatible storage backend |
| `argon2-cffi` | password hashing |
| `python-magic`, `bleach` | file sniffing, text sanitization |
| `stripe` | official SDK (gateway adapter) |
| `django-environ` | env parsing |
| dev: `pytest`, `pytest-django`, `factory-boy`, `ruff`, `import-linter`, `django-stubs[compatible-mypy]` | quality gates |

## Error handling & response envelope

- Custom DRF exception handler → uniform body:
```json
{ "error": { "code": "order_not payable", "message": "Human-readable", "details": { "field": ["problem"] } } }
```
- Domain services raise typed exceptions (`core.exceptions.DomainError` subclasses) mapped to HTTP codes centrally. Unhandled → 500 with correlation ID (see [observability](observability.md)).

## API surface

Full endpoint catalog: [api.md](api.md). Conventions: `/api/v1/`, UUID public ids, cursor pagination, role-scoped querysets, OpenAPI 3 schema at `/api/schema/` (source for the frontend's generated typed client).
