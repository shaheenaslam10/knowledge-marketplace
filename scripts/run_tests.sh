#!/usr/bin/env bash
# Run the full local test suite (backend + frontend unit).
# Prefers the running docker compose stack; falls back to local toolchains.
set -euo pipefail
cd "$(dirname "$0")/.."

running() { docker compose ps --status running --services 2>/dev/null | grep -q "^$1$"; }

echo "== backend: ruff + import-linter =="
if running backend; then
  docker compose exec -T backend ruff check .
  docker compose exec -T backend ruff format --check .
  docker compose exec -T backend lint-imports
else
  (cd backend && python -m ruff check . && python -m ruff format --check . && lint-imports)
fi

echo "== backend: pytest (needs PostgreSQL; DATABASE_URL or compose db) =="
# pytest-django creates/destroys test_<dbname> automatically from DATABASE_URL.
if running backend; then
  docker compose exec -T backend pytest
else
  (cd backend && pytest)
fi

echo "== frontend: lint + typecheck + unit =="
if running frontend; then
  docker compose exec -T frontend npm run lint
  docker compose exec -T frontend npm run typecheck
  docker compose exec -T frontend npm test
else
  (cd frontend && npm run lint && npm run typecheck && npm test)
fi

echo "== all green =="
