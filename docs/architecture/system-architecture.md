# System Architecture

> Status: 📐 Phase 0 — approved baseline · Last updated: 2026-09-23

## Architectural style: modular monolith (mandated)

One Django application (HTTP + WebSocket + background workers as processes of the same codebase), one PostgreSQL database, one Next.js frontend. **No microservices, no Kubernetes, no service mesh.** The monolith is *modular*: business domains are isolated Django apps with explicit allowed dependencies (see [backend.md](backend.md)), so any high-load module can be extracted into a service later without a rewrite — the seam is the service-layer API + database schema, not an afterthought.

## High-level view

```mermaid
flowchart LR
    subgraph Client
        B[Browser<br/>responsive web]
    end
    subgraph AppHost["App host (single small VM / free tier)"]
        subgraph FE["Next.js (SSR + SPA)"]
            PUB[Public/SEO pages]
            APP[Dashboards & flows]
        end
        subgraph BE["Django (modular monolith)"]
            ASGI[ASGI: HTTP + WebSockets<br/>uvicorn + Channels]
            WKR[Worker: DB-backed task queue<br/>django-q2 qcluster]
            ADM[Django Admin back office]
        end
        PG[(PostgreSQL<br/>single source of truth)]
        DISK[(Local volume: uploads in dev)]
    end
    subgraph Externals
        STRIPE[Stripe Connect<br/>seam — not active<br/>(ManualGateway active)]
        R2[Cloudflare R2<br/>private object storage]
        MAIL[Email API<br/>Brevo/SMTP]
    end
    B -->|HTTPS| PUB
    B -->|HTTPS /api| ASGI
    B -->|WSS| ASGI
    ASGI --> PG
    WKR --> PG
    WKR --> MAIL
    WKR --> R2
    ASGI --> R2
    ASGI --> STRIPE
    PG -. backups .-> R2
```

**Key simplification:** the background worker and the ASGI server are the *same codebase, different process/command*. The channel layer for WebSockets is in-memory within the single ASGI process (MVP runs one ASGI process; scale-out swaps in Redis — one settings change, documented in [realtime.md](realtime.md)). There is **no Redis, no Celery, no Elasticsearch, no third-party realtime service** in the MVP. Phase 1 implements this topology as specified (compose services: db, backend, worker/qcluster, frontend).

## Runtime processes (production)

| Process | Command | Count (MVP) | Notes |
|---|---|---|---|
| Web/WS | `uvicorn config.asgi:application` | 1 | must stay 1 until Redis channel layer is enabled |
| Worker | `python manage.py qcluster` | 1 (4 worker processes) | django-q2 ORM broker (Postgres) |
| Scheduler | django-q2 `Schedule` model (admin-managed) executed by the worker | — | sweepers: auto-approve, TTLs, payouts |
| Frontend | `next start` (Node) | 1 | SSR + static |
| Postgres | container/managed | 1 | only real stateful component |

## Request paths

1. **Browser → Next.js (SSR)** for public/SEO pages and app shell; server components fetch backend REST directly (server-to-server, session-less using a service token or plain public endpoints).
2. **Browser → Django REST** (`/api/v1/*`) for all authenticated data/actions (JWT httpOnly cookies).
3. **Browser → Django Channels** (`/ws/*`) for chat + notification pushes.
4. **Stripe → Django webhooks** (`/api/v1/payments/webhook/stripe`) — the only writer of payment state changes.
5. **Django → R2** presigned URL generation (never browser→R2 without an authorized, short-lived URL).

## Module map (domains → Django apps)

| Domain | App | Owns |
|---|---|---|
| Identity & roles | `accounts` | User, StudentProfile, auth flows, role state |
| Expert supply | `experts` | ExpertProfile, application/approval, earnings view |
| Taxonomy | `taxonomy` | Subject, Skill (shared vocabulary) |
| Demand | `service_requests` | ServiceRequest + visibility rules |
| Open matching | `bidding` | Offer lifecycle |
| Managed matching | `assignments` | PoolInvitation, DirectAssignment |
| Fulfilment | `orders` | Order, Delivery, state machine, timers |
| Money | `payments` | Gateway adapters, Payment/Payout/Refund, Ledger, webhooks, PlatformConfig-owned rates |
| Communication | `messaging` | Thread, Message, WS consumers |
| Content | `files` | Attachment, secure access |
| Engagement | `notifications` | Notification, preferences, fan-out |
| Trust | `reviews`, `disputes`, `audit` | Reputation, mediation, immutable audit trail |
| Foundation | `core` | base models/utilities, health, shared settings |

Rationale for boundaries + dependency rules: [backend.md](backend.md). Consolidations vs the raw suggestion in the brief (students/experts folded into accounts/experts profiles; commissions into payments; admin into Django admin + analytics views) are justified in ADR-0001.

## Data flow invariants

- PostgreSQL is the **only** source of truth (orders, money, messages, files metadata). Object storage holds bytes; Stripe holds payment state mirrors.
- Money state changes originate **only** from webhook processing or admin/service-layer actions — never from client-supplied status.
- Every state transition that matters is: transactional (row-locked), validated (illegal → 409), notified (domain events), and audited where sensitive.

## Environments

| Env | Purpose | Backend | Frontend | DB | Files | Payments |
|---|---|---|---|---|---|---|
| local dev | dev machines | runserver/uvicorn | `next dev` | Docker Postgres | local disk | Stripe test / manual mode |
| staging (optional, same VM) | pre-prod checks | same image | same | separate DB | R2 bucket (staging) | Stripe test |
| production | users | same image | same | managed Postgres (Neon) or VM container | R2 bucket | Stripe live / manual |

Config differences live **only** in environment variables (12-factor) — see [environments.md](environments.md).

## Technology ledger (with the cost-first rationale)

| Concern | Choice | Why / alternative rejected |
|---|---|---|
| Framework | Django 5.2 LTS + DRF | batteries included, admin = free back office |
| DB | PostgreSQL 16 | single source of truth; FTS + trigrams built in |
| Queue | django-q2 (ORM broker — Postgres) | no Redis/Celery infra; ADR-0002 |
| Realtime | Channels 4.3.x + in-memory layer | free; swap to Redis layer at scale |
| Auth | SimpleJWT (httpOnly cookies) | battle-tested; no sessions table needed |
| Files | local dev / Cloudflare R2 | R2 free tier 10 GB, zero egress fees vs S3 |
| Email | Brevo free 300/day | transactional email without server reputation pain |
| Frontend | Next.js 15+ (App Router) + TS + Tailwind | SSR for SEO + typed API client |
| Payments | Stripe Connect (seam; **ManualGateway active** until owner verification) | marketplace payments w/o fixed cost |
| Deploy | single small VM w/ Docker Compose (or Fly.io/Railway free-ish tiers) | one box, one compose file |
| Monitoring | structured logs + Sentry free tier (optional) | no paid APM |

Every line item's costs, free tiers and migration paths: [operations/costs.md](../operations/costs.md).
