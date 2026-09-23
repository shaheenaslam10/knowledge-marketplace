#!/bin/sh
# Dev entrypoint: wait for the database (retry migrate), then run the command.
set -e

attempts=0
until python manage.py migrate --noinput >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "entrypoint: database not reachable after $attempts attempts" >&2
    python manage.py migrate --noinput  # show the real error
    exit 1
  fi
  echo "entrypoint: waiting for database ($attempts)..."
  sleep 2
done

python manage.py migrate --noinput
exec "$@"
