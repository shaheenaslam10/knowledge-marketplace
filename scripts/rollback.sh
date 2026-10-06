#!/usr/bin/env bash
#
# Roll back a deployment (docs/architecture/deployment.md).
#
#   scripts/rollback.sh --env production                 # to the recorded previous release
#   scripts/rollback.sh --env production --to <git-sha>  # to a specific release
#
# What rollback does and does NOT do
# ----------------------------------
# The application containers are stateless, so rolling them back is just
# rebuilding an older commit. The DATABASE is not rolled back, and that is
# deliberate: automatically reverting a schema is how you turn an outage into
# data loss.
#
# This is only safe because of a standing policy (deployment.md): migrations
# are FORWARD-ONLY and ADDITIVE-FIRST. A release never drops or renames a
# column that the previous release still reads, so the previous image keeps
# working against the newer schema. A migration that cannot satisfy that must
# ship as a two-release sequence (add + backfill, then remove).
#
# If a migration genuinely must be undone, that is a restore, not a rollback:
# scripts/restore_backup.sh against the pre-deploy dump.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT=""
TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="${2:?}"; shift 2 ;;
    --to) TARGET="${2:?}"; shift 2 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ "$ENVIRONMENT" == "staging" || "$ENVIRONMENT" == "production" ]] \
  || { echo "usage: $0 --env staging|production [--to GITREF]" >&2; exit 2; }

ENV_FILE=".env.${ENVIRONMENT}"
RELEASE_STATE=".deploy-state-${ENVIRONMENT}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE" >&2; exit 1; }

if [[ -z "$TARGET" ]]; then
  [[ -f "$RELEASE_STATE" ]] || { echo "no recorded release to roll back to; pass --to" >&2; exit 1; }
  TARGET="$(cat "$RELEASE_STATE")"
fi

echo "==> Rolling ${ENVIRONMENT} back to ${TARGET}"
git fetch --all --tags --quiet
git checkout --quiet "$TARGET"

echo "==> Rebuilding at ${TARGET:0:8}"
"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> Waiting for health"
for attempt in $(seq 1 60); do
  state="$("${COMPOSE[@]}" ps --format json api 2>/dev/null | grep -o '"Health":"[a-z]*"' | head -1 || true)"
  [[ "$state" == '"Health":"healthy"' ]] && break
  if [[ "$attempt" -eq 60 ]]; then
    echo "!! rolled-back API never became healthy — manual intervention required" >&2
    "${COMPOSE[@]}" logs --tail 80 api >&2
    exit 1
  fi
  sleep 5
done

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
echo "==> Smoke test after rollback"
if scripts/smoke_test.sh --api "https://${API_DOMAIN}" --web "https://${APP_DOMAIN}"; then
  echo "$TARGET" > "$RELEASE_STATE"
  echo "==> Rollback complete — ${ENVIRONMENT} on ${TARGET:0:8}"
  exit 0
fi

echo "!! smoke still failing after rollback — this is an incident, not a bad deploy" >&2
echo "   runbook: docs/architecture/backup-recovery.md" >&2
exit 1
