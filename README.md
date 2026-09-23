# Hybrid Expert Marketplace

> Working title. A two-sided platform where students get academic/learning help through an **Open Marketplace** (experts bid, student picks) or a **Managed Service** (the platform triages and assigns), with payments, delivery, reviews and disputes handled end-to-end.

**Status: Phase 3 complete + Phase 3.5 design/product architecture adopted.** Profiles, expert lifecycle, taxonomy, credential files and the public expert directory are live; the product now targets a three-experience structure (marketing / app / portal) with a formal design system (see docs/design/). Custom email-based user model, JWT-in-httpOnly-cookie auth (register / login / refresh-rotation / logout / verify / password reset & change / deactivate), role & permission foundations (student / verified / staff / support / admin; expert slot reserved), admin user management, and the auth UI foundation run locally and are verified in CI. See [docs/architecture/authentication.md](docs/architecture/authentication.md) and the [phase record](docs/process/roadmap-phases.md).

---

## What's inside

```text
/
├── frontend/           # Next.js 15 + TypeScript + Tailwind 4 (App Router, domain-oriented)
│   └── src/app/(public) · src/features · src/components/ui · src/lib · e2e
├── backend/            # Django 5.2 LTS + DRF modular monolith
│   ├── config/         # settings/{base,dev,test,prod}, urls, api router, asgi (HTTP+WS)
│   ├── apps/core/      # shared kernel: health, error envelope, money, request-id, seeds
│   ├── apps/payments/  # PaymentGateway interface (provider-agnostic seam — ADR-0005)
│   └── docker/         # container entrypoints (db-wait migrate / worker)
├── docs/               # Product, workflows, architecture, operations, process — START HERE
├── scripts/            # run_tests.sh · check_env_docs.py (CI doc-sync gate)
├── .env.example        # every environment variable, documented
├── docker-compose.yml  # db + backend + worker + frontend (clean-checkout runnable)
└── README.md
```

## The two business models (one pipeline)

1. **Open Marketplace** — student posts a request → eligible experts submit offers → student accepts one → platform handles payment (commission taken).
2. **Managed Service** — student submits a request → admin triages → platform publishes it to the expert pool *or* assigns a specific expert → platform manages order, communication, payment, delivery, commission.

Both converge on a single Order lifecycle — [docs/workflows](docs/README.md).

## Tech stack (cost-first: ≈ $0–6/month fixed at MVP scale)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 |
| Backend | Django 5.2 LTS + DRF, **modular monolith** (import-linter-enforced boundaries) |
| Database | PostgreSQL 16 (only source of truth) |
| Background jobs | **django-q2 with the ORM (Postgres) broker — no Redis, no Celery** (ADR-0002) |
| Realtime | Django Channels foundation on one ASGI process (in-memory layer; Redis = documented scale-out) |
| Payments | `PaymentGateway` interface + registry (Stripe Connect adapter + manual mode land in Phase 8; never hard-coded) |
| Files | Local disk in dev → Cloudflare R2 in prod (Phase 10) |
| Email | console backend now; Brevo/SMTP adapters with notifications (Phase 9) |
| Deploy | Docker Compose on a single small VM / free-tier host |

Full rationale: [docs/operations/costs.md](docs/operations/costs.md) · ADRs: [docs/process/adrs.md](docs/process/adrs.md)

---

## Local development

### Prerequisites

- **Docker + Docker Compose** (recommended path), **or** Python 3.11+/3.12, Node 20+, and a PostgreSQL 16 for the non-Docker path.
- **No paid services are required locally** (payments use the manual-gateway placeholder; email prints to the console).

### Quick start (Docker — works on a clean checkout)

```bash
git clone https://github.com/shaheenaslam10/knowledge-marketplace.git
cd knowledge-marketplace
docker compose up --build          # db + backend (auto-migrates) + worker + frontend
```

Optional environment overrides: `cp .env.example .env` and edit — compose picks it up automatically (dev defaults are baked in, so this step is optional).

Then open:

| Surface | URL |
|---|---|
| Frontend (shows live backend status) | http://localhost:3000 |
| API root | http://localhost:8000/api/v1/ |
| OpenAPI schema / Swagger UI | http://localhost:8000/api/schema/ · /api/schema/swagger-ui |
| Health / readiness probes | http://localhost:8000/healthz · /readyz |
| Django admin | http://localhost:8000/admin/ |

### Seed / demo data

```bash
docker compose exec backend python manage.py seed_demo
```

Creates eight demo accounts (**never real credentials; dev/test only**, guarded unless `--force`), each expert persona in a different lifecycle state (ADR-0012):

| Account | Password env (default) | State |
|---|---|---|
| `admin@demo.local` | `DJANGO_SEED_ADMIN_PASSWORD` (`admin-demo-1234`) | superuser → `/admin/` (admins are provisioned, never self-enrolled) |
| `student@demo.local` | `DJANGO_SEED_DEMO_PASSWORD` (`demo-password-1234`) | student with completed onboarding |
| `expert@demo.local` | same demo password | **approved** expert — visible in `/experts` |
| `expert.applicant@demo.local` | same | application **submitted** (awaiting review) |
| `expert.review@demo.local` | same | application **under review** |
| `expert.rejected@demo.local` | same | **rejected** (with reviewer reason; resubmittable) |
| `expert.suspended@demo.local` | same | **suspended** expert (hidden from directory, student access kept) |
| `noapply@demo.local` | same | never applied (`not_applied`) |

Also seeds the demo taxonomy tree (categories → subjects, skills) and private demo credential files. Request/order demo data arrives in Phases 4+.

### Worker (background jobs)

The `worker` compose service runs **`python manage.py qcluster`** (django-q2, database-backed — no Redis) and starts once the API is ready. Prove the pipeline end-to-end:

```bash
docker compose exec backend python manage.py worker_smoke --timeout 30
# → "worker OK: {"echo": "smoke-…", "worker_pid": …}"
```

### Running without Docker

```bash
# 1) PostgreSQL: use your own instance; create an empty database, e.g. `hem`.
# 2) Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../.env.example ../.env                 # set DATABASE_URL=postgres://user:pass@localhost:5432/hem
python manage.py migrate
python manage.py seed_demo
uvicorn config.asgi:application --reload   # HTTP + WebSockets (or: python manage.py runserver)

# 3) Worker (second terminal)
cd backend && source .venv/bin/activate
python manage.py qcluster

# 4) Frontend (third terminal)
cd frontend
npm install
cp .env.example .env.local                 # defaults work for local dev
npm run dev
```

Environment variables: [`.env.example`](.env.example) + [docs/architecture/environments.md](docs/architecture/environments.md) (CI checks the two stay in sync).

## Commands cheat-sheet

| Task | Command |
|---|---|
| Start everything | `docker compose up --build` |
| Migrations | `docker compose exec backend python manage.py migrate` (auto on backend start) |
| Make migrations | `docker compose exec backend python manage.py makemigrations` |
| Seed demo | `docker compose exec backend python manage.py seed_demo` |
| Worker | compose `worker` service · `python manage.py qcluster` |
| Worker check | `python manage.py worker_smoke` |
| Logs | `docker compose logs -f backend` (`worker`, `frontend`, `db`) |
| Full test suite | `./scripts/run_tests.sh` |
| Backend tests | `docker compose exec backend pytest --cov=apps` |
| Frontend tests | `cd frontend && npm run lint && npm run typecheck && npm test` |
| Lint backend | `docker compose exec backend ruff check . && docker compose exec backend lint-imports` |
| E2E smoke | `cd frontend && npx playwright install chromium && npm run e2e` (stack must be up) |
| Reset everything | `docker compose down -v` (destroys local data) |

## Testing & CI

- **Backend:** 43 tests — health/ready probes, OpenAPI contract, uniform error envelope, money math (largest-remainder allocation), payments gateway seam (provider-agnostic protocol + registry), WebSocket consumers through the real ASGI stack, DB-backed task pipeline. Ruff + import-linter dependency contracts + `makemigrations --check`.
- **Frontend:** vitest unit tests (status card, Button, API client envelope parsing), typecheck against strict TS, ESLint, production build, Playwright smoke.
- **CI (GitHub Actions):** `backend` (Postgres service), `frontend`, `docs-sync` (env-var doc gate), `compose-smoke` (clean checkout → `docker compose up --build` → health → API schema → worker_smoke → seed → Playwright).
- Strategy & coverage gates: [docs/architecture/testing.md](docs/architecture/testing.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `backend` container restarts with DB errors | db not healthy yet — entrypoint retries 30×; check `docker compose logs db` |
| Frontend shows **UNREACHABLE** | backend still booting, or `NEXT_PUBLIC_API_URL`/`SERVER_API_URL` wrong — see environments doc |
| Port already in use | set `BACKEND_HOST_PORT` / `FRONTEND_HOST_PORT` / `POSTGRES_HOST_PORT` in `.env` |
| `npm` EACCES inside `frontend/` after running the compose stack (Linux) | the dev container runs as root and writes `frontend/.next` through the bind mount — with the stack stopped: `sudo rm -rf frontend/.next` |
| Playwright can't download browsers | corporate proxy/CDN issue — `npx playwright install chromium` needs network; CI runs it anyway |
| `worker_smoke` times out | `worker` service not running — `docker compose ps`, check `docker compose logs worker` |
| Migrations out of sync | `docker compose exec backend python manage.py makemigrations --check` should be clean in CI; locally run `makemigrations` |

## Documentation

**[docs/README.md](docs/README.md)** is the index: product → business rules (incl. academic-integrity policy) → journeys → architecture → costs → process. Documentation is a first-class deliverable, updated in the same phase as any change it describes (CI-gated where automatable).

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture & documentation | ✅ |
| 1 | Project foundation (scaffolds, compose, CI, env, seeds, worker, OpenAPI, error envelope, gateway seam) | ✅ |
| 2 | Authentication & roles (custom user, JWT cookies, expert applications) | ✅ |
| 3–6 | Profiles · requests · open bidding · managed assignment | 📐 planned |
| 7–8 | Orders & delivery · payments & commissions | 📐 planned |
| 9–11 | Messaging & notifications · files/reviews/disputes · admin & analytics | 📐 planned |
| 12–13 | Security/testing/performance · production deployment | 📐 planned |

## License / ownership

Proprietary — all rights reserved by the project owner until decided otherwise.
