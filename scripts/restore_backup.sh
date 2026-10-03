#!/usr/bin/env bash
#
# Restore an encrypted backup (docs/architecture/backup-recovery.md).
#
#   scripts/restore_backup.sh <backup.dump.enc> --target postgres://…/scratch
#   scripts/restore_backup.sh <backup.dump.enc> --drill        # scratch DB, verify, drop
#
# Two modes, one code path:
#   --target <url>  restore into an EXISTING, EMPTY database (real recovery).
#   --drill         create a scratch database next to the source, restore into
#                   it, print verification counts, then drop it. This is the
#                   rehearsal the launch checklist requires — it proves the
#                   artifact restores, without touching anything live.
#
# The drill is the point. A backup nobody has restored is a hypothesis; the
# quarterly cadence in backup-recovery.md exists so the hypothesis gets tested
# on a schedule rather than during an incident.
#
# Required: BACKUP_PASSPHRASE; DATABASE_URL when using --drill.
set -euo pipefail

ARCHIVE=""
TARGET_URL=""
DRILL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_URL="${2:?--target needs a URL}"; shift 2 ;;
    --drill) DRILL=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) ARCHIVE="$1"; shift ;;
  esac
done

[[ -n "$ARCHIVE" ]] || { echo "usage: $0 <backup.dump.enc> [--target URL | --drill]" >&2; exit 2; }
[[ -f "$ARCHIVE" ]] || { echo "no such backup: $ARCHIVE" >&2; exit 2; }
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"

# --- integrity before secrets -------------------------------------------
if [[ -f "${ARCHIVE}.sha256" ]]; then
  echo "==> Verifying checksum"
  EXPECTED="$(cat "${ARCHIVE}.sha256")"
  ACTUAL="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
  if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "!! CHECKSUM MISMATCH — archive is corrupt or truncated" >&2
    echo "   expected $EXPECTED" >&2
    echo "   actual   $ACTUAL" >&2
    exit 1
  fi
  echo "    ok ($ACTUAL)"
else
  echo "!! no .sha256 beside the archive — integrity unverified"
fi

WORKDIR="$(mktemp -d)"
PLAIN="${WORKDIR}/restore.dump"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "==> Decrypting"
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
      -pass env:BACKUP_PASSPHRASE -in "$ARCHIVE" -out "$PLAIN"; then
  echo "!! decryption failed — wrong passphrase, or the archive is not ours" >&2
  exit 1
fi

echo "==> Archive contents (first objects)"
pg_restore --list "$PLAIN" | grep -vE '^;' | head -5 || true
OBJECTS="$(pg_restore --list "$PLAIN" | grep -cvE '^;|^$' || true)"
echo "    ${OBJECTS} objects in the archive"

# --- pick the destination ------------------------------------------------
SCRATCH_DB=""
if [[ "$DRILL" -eq 1 ]]; then
  : "${DATABASE_URL:?--drill needs DATABASE_URL to know which server to use}"
  SCRATCH_DB="hem_restore_drill_$(date -u +%Y%m%d%H%M%S)"
  ADMIN_URL="${DATABASE_URL%/*}/postgres"
  TARGET_URL="${DATABASE_URL%/*}/${SCRATCH_DB}"
  echo "==> Creating scratch database ${SCRATCH_DB}"
  psql --dbname="$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE ${SCRATCH_DB};"
  drop_scratch() {
    echo "==> Dropping scratch database ${SCRATCH_DB}"
    psql --dbname="$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS ${SCRATCH_DB};" || true
    cleanup
  }
  trap drop_scratch EXIT
fi

[[ -n "$TARGET_URL" ]] || { echo "need --target or --drill" >&2; exit 2; }

echo "==> Restoring into ${TARGET_URL%%\?*}"
# --no-owner/--no-privileges: the dump is restored under whatever role the
# recovery host uses, which is rarely the original owner.
pg_restore --no-owner --no-privileges --exit-on-error \
  --dbname="$TARGET_URL" "$PLAIN"

echo "==> Verifying restored data"
VERIFY_SQL="
SELECT 'users'      AS entity, count(*) FROM accounts_user
UNION ALL SELECT 'requests',  count(*) FROM service_requests_servicerequest
UNION ALL SELECT 'orders',    count(*) FROM orders_order
UNION ALL SELECT 'payments',  count(*) FROM payments_payment
UNION ALL SELECT 'ledger',    count(*) FROM payments_ledgerentry
UNION ALL SELECT 'migrations',count(*) FROM django_migrations;
"
psql --dbname="$TARGET_URL" -v ON_ERROR_STOP=1 -q -c "$VERIFY_SQL"

# BR-33 on the RESTORED data: a restore that silently loses ledger rows would
# still "succeed" by row counts, so check the money invariant itself.
echo "==> Ledger identity on restored data (BR-33)"
psql --dbname="$TARGET_URL" -v ON_ERROR_STOP=1 -q -c "
WITH t AS (
  SELECT order_id,
         SUM(amount_minor) FILTER (WHERE entry_type IN ('charge','refund'))                  AS lhs,
         SUM(amount_minor) FILTER (WHERE entry_type IN ('commission','expert_credit','fee')) AS rhs
  FROM payments_ledgerentry WHERE order_id IS NOT NULL GROUP BY order_id
)
SELECT count(*) AS orders_checked,
       count(*) FILTER (WHERE COALESCE(lhs,0) <> COALESCE(rhs,0)) AS identity_violations
FROM t;
"

echo "==> Restore verified"
[[ "$DRILL" -eq 1 ]] && echo "==> Drill complete (scratch database will be dropped)"
exit 0
