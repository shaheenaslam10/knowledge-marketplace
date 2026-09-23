# Hybrid Expert Marketplace

> Working title. A two-sided platform where students get academic/learning help through an **Open Marketplace** (experts bid, student picks) or a **Managed Service** (the platform triages and assigns), with payments, delivery, reviews and disputes handled end-to-end.

**Status: Phase 0 — architecture & documentation complete. Implementation proceeds phase-by-phase (see the roadmap below). Everything documented runs locally from this repository as each phase lands.**

---

## What's inside

```text
/
├── frontend/     # Next.js + TypeScript + Tailwind (App Router, domain-oriented)
├── backend/      # Django + DRF modular monolith (config/ + apps/)
├── docs/         # Product, workflows, architecture, operations, process — START HERE
├── scripts/      # setup / seed / deploy / restore helpers
├── .env.example  # every required environment variable, with safe placeholders
├── docker-compose.yml
└── README.md
```

## The two business models (one pipeline)

1. **Open Marketplace** — student posts a request → eligible experts submit offers → student accepts one → platform handles payment (commission taken).
2. **Managed Service** — student submits a request → admin triages → platform publishes it to the expert pool *or* assigns a specific expert → platform manages order, communication, payment, delivery, commission.

Both converge on a single Order lifecycle — see [docs/workflows](docs/README.md#workflows-product-behaviour).

## Tech stack (cost-first: ≈ $0–6/month fixed at MVP scale)

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | Django 5.2 LTS + Django REST Framework, **modular monolith** |
| Database | PostgreSQL 16 (only source of truth) |
| Background jobs | **django-tasks (database-backed queue — no Redis)** |
| Realtime | Django Channels / WebSockets, in-memory layer (single ASGI process; Redis = documented upgrade) |
| Files | Local disk in dev → **Cloudflare R2** in prod (free tier, zero egress), signed access |
| Payments | **Stripe Connect** (separate charges & transfers) + manual-gateway fallback mode |
| Email | Brevo free tier behind an adapter (console backend locally) |
| Deploy | Docker Compose on a single small VM / free-tier host |

Full rationale per choice: [docs/operations/costs.md](docs/operations/costs.md) · ADRs: [docs/process/adrs.md](docs/process/adrs.md)

## Local development (quick start)

Prerequisites: **Docker + Docker Compose** (recommended path), or Python 3.11+ and Node 20+ to run services natively. No paid services are required locally (Stripe test mode / console email).

```bash
git clone <this repo> && cd knowledge-marketplace
cp .env.example .env            # fill values as you like; defaults work for local dev
docker compose up --build       # starts db + backend + worker + frontend
```

Then:

```bash
# in the backend container (or locally with a venv):
python manage.py migrate        # apply migrations
python manage.py seed_demo      # demo students/experts/requests/orders (safe, idempotent)
```

- Frontend: http://localhost:3000 · API: http://localhost:8000/api/v1/ · Django admin: http://localhost:8000/admin/
- Demo accounts (after seeding): listed in `scripts/seed_demo.py` output / [docs](docs/architecture/testing.md).

### Running without Docker

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
cp ../.env.example ../.env      # adjust DATABASE_URL to your local Postgres
python manage.py migrate && python manage.py runserver
python manage.py process_tasks  # background worker (second terminal)

# frontend
cd frontend && npm install && npm run dev
```

Full instructions, env vars, migrations, seed data, troubleshooting: **[README sections below](#setup-in-detail)** and [docs/architecture/environments.md](docs/architecture/environments.md).

## Testing

```bash
cd backend && pytest                    # backend suite (real Postgres)
cd frontend && npm run lint && npm test # lint + unit
docker compose -f docker-compose.yml run e2e   # Playwright golden paths (Phase 12+)
```

## Documentation

**[docs/README.md](docs/README.md)** is the index. Start with: product overview → business rules → user journeys → system architecture → roadmap phases. Documentation is a first-class deliverable and is updated in the same phase as any change it describes.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture & documentation | ✅ done |
| 1 | Project foundation (scaffolds, compose, CI, env, seeds) | ⏳ next |
| 2–3 | Auth & roles · profiles & expert approval | 📐 planned |
| 4–6 | Requests · open bidding · managed assignment | 📐 planned |
| 7–8 | Orders & delivery · payments & commissions | 📐 planned |
| 9–11 | Messaging & notifications · files/reviews/disputes · admin & analytics | 📐 planned |
| 12–13 | Security/testing/performance · production deployment | 📐 planned |

Details & acceptance criteria: [docs/process/roadmap-phases.md](docs/process/roadmap-phases.md).

## License / ownership

Proprietary — all rights reserved by the project owner until decided otherwise.
