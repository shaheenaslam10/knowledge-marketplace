#!/bin/sh
# Worker entrypoint: wait for the API to be migrated/healthy, then start qcluster.
# (Migrations run in the API container — never concurrently here.)
set -e

attempts=0
READYZ_URL="${READYZ_URL:-http://backend:8000/readyz}"
until curl -sf "$READYZ_URL" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    echo "worker entrypoint: $READYZ_URL not ready after $attempts attempts" >&2
    exit 1
  fi
  echo "worker entrypoint: waiting for API ($attempts)..."
  sleep 2
done

exec python manage.py qcluster
