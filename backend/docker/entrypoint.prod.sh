#!/bin/sh
# Production entrypoint (docker-compose.prod.yml, ADR-0016).
#
# Order matters and is deliberate:
#   1. production safety checks  — refuse to start on a dangerous config
#      (dev SECRET_KEY, console email, self-confirm payments...). Failing here
#      costs a failed deploy; failing later costs an incident.
#   2. migrate                   — forward-only, additive-first by policy.
#   3. collectstatic             — into the volume Caddy serves at /static/*.
#   4. exec the server           — PID 1, signals work, no shell wrapper.
#
# Only the API container runs this. The worker waits on /readyz so migrations
# never run concurrently.
set -e

echo "entrypoint: waiting for database"
attempts=0
until python manage.py showmigrations >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "entrypoint: database not reachable after $attempts attempts" >&2
    python manage.py showmigrations
    exit 1
  fi
  sleep 2
done

echo "entrypoint: production safety checks"
python manage.py check --deploy --tag production --fail-level WARNING

echo "entrypoint: migrate"
python manage.py migrate --noinput

echo "entrypoint: collectstatic"
python manage.py collectstatic --noinput --clear

echo "entrypoint: starting $*"
exec "$@"
