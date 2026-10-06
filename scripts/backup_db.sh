#!/usr/bin/env bash
#
# Encrypted PostgreSQL backup (docs/architecture/backup-recovery.md).
#
#   scripts/backup_db.sh [--label pre-deploy]
#
# Produces, in $BACKUP_DIR:
#   hem-<env>-<label>-<utc-timestamp>.dump.enc   pg_dump -Fc, AES-256 encrypted
#   ...sha256                                    checksum of the ENCRYPTED file
#
# Design notes
# - `pg_dump -Fc` (custom format) rather than plain SQL: it is compressed,
#   restores selectively, and `pg_restore --list` can inspect it without a
#   database. Version-locked to the server's major version.
# - Encrypted at rest with AES-256 + PBKDF2 because the dump contains every
#   user record in the system and is about to be copied to object storage.
#   Losing the passphrase means losing the backups — it belongs in the owner's
#   password manager, not on the host (backup-recovery.md).
# - The checksum covers the encrypted artifact, so integrity can be verified
#   before anyone types the passphrase.
# - Upload is a hook (BACKUP_REMOTE_CMD) instead of a hard dependency on one
#   vendor CLI: `rclone copy`, `aws s3 cp`, `wrangler r2 object put` all fit.
#
# Required: DATABASE_URL, BACKUP_PASSPHRASE
# Optional: BACKUP_DIR (default ./var/backups), DEPLOY_ENV (default local),
#           BACKUP_RETENTION_DAYS (default 30), BACKUP_REMOTE_CMD
set -euo pipefail

LABEL="scheduled"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) LABEL="${2:?--label needs a value}"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required (store it in the password manager)}"
BACKUP_DIR="${BACKUP_DIR:-./var/backups}"
DEPLOY_ENV="${DEPLOY_ENV:-local}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASENAME="hem-${DEPLOY_ENV}-${LABEL}-${STAMP}"
TARGET="${BACKUP_DIR}/${BASENAME}.dump.enc"

echo "==> Dumping ${DEPLOY_ENV} database (label=${LABEL})"
# Stream dump -> encrypt. The plaintext dump never touches disk.
if ! pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
      -pass env:BACKUP_PASSPHRASE -out "$TARGET"; then
  rm -f "$TARGET"
  echo "!! backup FAILED" >&2
  exit 1
fi

SIZE="$(wc -c < "$TARGET" | tr -d ' ')"
if [[ "$SIZE" -lt 1024 ]]; then
  rm -f "$TARGET"
  echo "!! backup suspiciously small (${SIZE} bytes) — refusing to keep it" >&2
  exit 1
fi

sha256sum "$TARGET" | awk '{print $1}' > "${TARGET}.sha256"
echo "==> Wrote ${TARGET} (${SIZE} bytes)"
echo "==> SHA256 $(cat "${TARGET}.sha256")"

if [[ -n "${BACKUP_REMOTE_CMD:-}" ]]; then
  echo "==> Uploading off-host"
  # shellcheck disable=SC2086
  $BACKUP_REMOTE_CMD "$TARGET"
  # shellcheck disable=SC2086
  $BACKUP_REMOTE_CMD "${TARGET}.sha256"
else
  echo "!! BACKUP_REMOTE_CMD not set — backup is ONLY on this host."
  echo "   A backup that dies with the machine is not a backup."
fi

echo "==> Pruning local backups older than ${BACKUP_RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'hem-*.dump.enc*' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete || true

echo "==> Done"
