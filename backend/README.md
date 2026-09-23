# Backend — Hybrid Expert Marketplace

Django 5.2 LTS + DRF **modular monolith**. Architecture docs: [docs/architecture/backend.md](../docs/architecture/backend.md).

```text
config/          project wiring (settings, urls, asgi, api router) — not a business domain
apps/
  core/          shared kernel: base models, money utils, health, error envelope, request IDs
  payments/      Phase 1: PaymentGateway interface + adapter registry ONLY (no models, no flows)
```

Domain apps (`accounts`, `experts`, `service_requests`, `bidding`, `assignments`, `orders`,
`messaging`, `files`, `notifications`, `reviews`, `disputes`, `audit`, `analytics`, `taxonomy`)
materialize in their roadmap phases — never create them empty.

## Local commands (see repo README for full setup)

```bash
python manage.py migrate          # apply migrations
python manage.py runserver        # dev server (ASGI via daphne — WS works)
uvicorn config.asgi:application --reload   # alternative dev server
python manage.py qcluster         # background worker (django-q2, database-backed — no Redis)
python manage.py seed_demo        # demo/seed data foundation
python manage.py worker_smoke     # enqueue + await a task — proves the worker pipeline
pytest                            # test suite (uses real Postgres)
ruff check . && ruff format --check .      # lint
lint-imports                      # modular-monolith dependency rules
```

## Rules (enforced by import-linter + review)

- Business logic lives in `apps/<domain>/services.py`, never in views/serializers/tasks/admin actions.
- Cross-app writes go through the owning app's service layer (dependency rule: `core < domain apps`).
- No Redis, no Celery. Background jobs = django-q2 with the ORM (Postgres) broker.
