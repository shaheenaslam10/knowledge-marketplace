# Backup & Recovery

> Status: ✅ **implemented and drilled (Phase 12)** · Last updated: Phase 12
> Scripts: `scripts/backup_db.sh`, `scripts/restore_backup.sh` · Related: [deployment](deployment.md)

## What is state

| Asset | Where | Protection |
|---|---|---|
| PostgreSQL | VM container or Neon | **backups** (below) |
| Uploaded files | R2 bucket | provider durability (11×9) + separate backups bucket for metadata consistency |
| Code/config | git | remote origin |
| Secrets | host `.env.prod` | also stored encrypted in owner's password manager (documented responsibility) |

## Database backup scheme (VM-container case)

- **Nightly logical dump** (`pg_dump -Fc`) → AES-256 encrypted → off-host copy; 30-day rotation.
- **Pre-deploy dump** before every migration run — `scripts/deploy.sh` does this
  automatically for production, because migrations are the risky part of a deploy.
- Point-in-time recovery is **not** available on plain dumps — accepted MVP risk
  (RPO 24h). If that becomes unacceptable → Neon free (PITR included); documented
  tradeoff, zero code change.
- Restore drill: **once before launch, then quarterly** — see
  [drill evidence](#restore-drill-evidence) below for the first one.

### `scripts/backup_db.sh`

```bash
BACKUP_PASSPHRASE=… BACKUP_DIR=/srv/hem/var/backups \
  ./scripts/backup_db.sh --label nightly
```

`pg_dump -Fc` → `openssl enc -aes-256-cbc -pbkdf2` → `<db>-<label>-<UTC>.dump.enc`,
plus a `.sha256` sidecar. Then prunes past `BACKUP_RETENTION_DAYS` and, if
`BACKUP_REMOTE_CMD` is set, copies off the host — *a backup that dies with the
machine is not a backup*.

Schedule it on the host (cron, 03:15 UTC):

```cron
15 3 * * * cd /srv/hem && set -a && . ./.env.production && set +a && \
  ./scripts/backup_db.sh --label nightly >> var/log/backup.log 2>&1
```

> `BACKUP_PASSPHRASE` must live in the owner's password manager. If it exists
> only on the host, then the machine that dies takes every backup with it.

### `scripts/restore_backup.sh`

```bash
./scripts/restore_backup.sh <archive> --drill          # scratch DB, verify, drop
./scripts/restore_backup.sh <archive> --target hem_prod # real restore
```

The verification is the point. A restore that silently produces an empty or
inconsistent database is worse than no restore, so the script:

1. checks the SHA256 **before** decrypting;
2. decrypts and `pg_restore`s into a scratch database;
3. counts restored objects and rows across six core tables;
4. **re-runs the BR-33 ledger identity on the restored rows** — money must still
   balance after a restore, not just parse;
5. drops the scratch database (`--drill`).

## Restore drill evidence

**P12 gate #4.** Executed 2026-09-28 against a migrated + seeded database.

| Field | Value |
|---|---|
| Source database | `hem_dev` (79 migrations, seeded) |
| Archive | `hem-local-drill-20260928T062623Z.dump.enc` |
| Size | 241,728 bytes |
| SHA256 | `2fa477c136932ed316f060ceed1c9f8c4e35c5f6f2404cf23593b1a53e77d1a3` |
| Scratch target | `hem_restore_drill_20260928062628` |
| Checksum verify | ✅ ok |
| Decrypt | ✅ ok |
| Objects restored | **541** |
| Row counts | users 9 · requests 7 · orders 3 · payments 3 · ledger 12 · migrations 79 |
| **BR-33 on restored data** | ✅ orders_checked 3, **identity_violations 0** |
| Cleanup | scratch database dropped |
| Exit code | 0 |

Failure paths were drilled too — a restore tool is only trustworthy if it fails
loudly:

| Scenario | Result | Exit |
|---|---|---|
| Wrong passphrase | `bad decrypt`, no partial database | 1 |
| Corrupted archive (10 bytes flipped at offset 5000) | checksum mismatch, refuses to decrypt | 1 |
| Missing archive | clear error | 2 |
| Leftover scratch databases after all runs | **0** | — |

> Drilled against a containerised Postgres 16 in the development sandbox, not
> against a production host (none exists yet). The script path, encryption,
> checksum, restore and money-integrity verification are all real; what remains
> unproven is only the off-host copy (`BACKUP_REMOTE_CMD`), which needs R2
> credentials. Next drill: before launch, then quarterly.

## Runbook: database loss

1. Provision/verify a Postgres container with an empty DB.
2. `./scripts/restore_backup.sh <latest> --target <db>` — verifies the checksum,
   restores, and re-checks the BR-33 ledger identity.
3. Files bucket untouched (keys are referenced by DB rows).
4. Reconcile money: `manage.py ops_report` for the gap window, then compare the
   provider dashboard against the ledger and replay missed webhook events.
   In manual-gateway mode the ledger is authoritative.
5. Post-incident note + audit entry.

## Runbook: VM loss

1. New VM, point DNS (TTL low by design).
2. Clone repo, restore `.env.production` from the password manager, restore the
   DB from the backups bucket, attach the same R2 bucket (keys unchanged), then
   `./scripts/deploy.sh --env production --skip-backup`.
3. Confirm with `./scripts/smoke_test.sh` before announcing recovery.
4. Total expected: < 1 hour.

## RPO/RTO targets (MVP)

RPO 24h (dumps) / RTO < 1h — consciously cheap; upgraded targets (RPO 5 min via Neon PITR or WAL shipping to R2) are the first paying infra upgrade if the business warrants (see costs).
