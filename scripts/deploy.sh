#!/usr/bin/env bash
#
# Deploy to staging or production (docs/architecture/deployment.md, ADR-0016).
#
#   scripts/deploy.sh --env staging
#   scripts/deploy.sh --env production --ref v1.2.3
#
# Sequence — each step is a gate, and any failure stops before traffic moves:
#
#   1. refuse to deploy a dirty or unknown tree
#   2. record the CURRENT release so rollback has a target
#   3. pre-deploy database backup (production only by default)
#   4. build images
#   5. start the stack — the API entrypoint runs `check --deploy --tag
#      production`, migrations and collectstatic before it will serve
#   6. wait for health
#   7. smoke test
#   8. on smoke failure: roll back automatically, then exit non-zero
#
# Idempotent and safe to re-run. It never edits the database directly and it
# never writes secrets to disk beyond the env file the operator provides.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT=""
REF=""
SKIP_BACKUP=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="${2:?--env needs staging|production}"; shift 2 ;;
    --ref) REF="${2:?--ref needs a git ref}"; shift 2 ;;
    --skip-backup) SKIP_BACKUP=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ "$ENVIRONMENT" == "staging" || "$ENVIRONMENT" == "production" ]] \
  || { echo "usage: $0 --env staging|production [--ref GITREF]" >&2; exit 2; }

ENV_FILE=".env.${ENVIRONMENT}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")
RELEASE_STATE=".deploy-state-${ENVIRONMENT}"

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE (start from .env.prod.example)" >&2; exit 1; }

echo "==> Deploying ${ENVIRONMENT}"

# --- 1. the tree must be trustworthy ------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  echo "!! working tree is dirty — refusing to deploy an unreproducible state" >&2
  git status --short >&2
  exit 1
fi
if [[ -n "$REF" ]]; then
  echo "==> Checking out $REF"
  git fetch --all --tags --quiet
  git checkout --quiet "$REF"
fi
CURRENT_SHA="$(git rev-parse HEAD)"
echo "    release: $CURRENT_SHA ($(git describe --tags --always))"

# --- 2. remember what we are replacing ----------------------------------
PREVIOUS_SHA=""
[[ -f "$RELEASE_STATE" ]] && PREVIOUS_SHA="$(cat "$RELEASE_STATE")"
echo "    previous: ${PREVIOUS_SHA:-<none recorded>}"

# --- 3. pre-deploy backup -----------------------------------------------
if [[ "$ENVIRONMENT" == "production" && "$SKIP_BACKUP" -eq 0 ]]; then
  echo "==> Pre-deploy backup"
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
  scripts/backup_db.sh --label "pre-deploy-${CURRENT_SHA:0:8}"
fi

# --- 4/5. build and start ------------------------------------------------
echo "==> Building images"
"${COMPOSE[@]}" build

echo "==> Starting stack (entrypoint runs safety checks, migrate, collectstatic)"
"${COMPOSE[@]}" up -d --remove-orphans

# --- 6. wait for health --------------------------------------------------
echo "==> Waiting for the API to become healthy"
for attempt in $(seq 1 60); do
  state="$("${COMPOSE[@]}" ps --format json api 2>/dev/null | grep -o '"Health":"[a-z]*"' | head -1 || true)"
  if [[ "$state" == '"Health":"healthy"' ]]; then
    echo "    healthy after ${attempt} checks"
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "!! API never became healthy" >&2
    "${COMPOSE[@]}" logs --tail 80 api >&2
    exit 1
  fi
  sleep 5
done

# --- 7. smoke ------------------------------------------------------------
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
echo "==> Smoke test"
if scripts/smoke_test.sh --api "https://${API_DOMAIN}" --web "https://${APP_DOMAIN}"; then
  echo "$CURRENT_SHA" > "$RELEASE_STATE"
  echo "==> Deploy OK — ${ENVIRONMENT} now on ${CURRENT_SHA:0:8}"
  exit 0
fi

# --- 8. automatic rollback ----------------------------------------------
echo "!! Smoke test FAILED" >&2
if [[ -n "$PREVIOUS_SHA" ]]; then
  echo "==> Rolling back to ${PREVIOUS_SHA:0:8}" >&2
  scripts/rollback.sh --env "$ENVIRONMENT" --to "$PREVIOUS_SHA" || \
    echo "!! automatic rollback ALSO failed — manual intervention required" >&2
else
  echo "!! no previous release recorded — cannot auto-roll back" >&2
fi
exit 1
