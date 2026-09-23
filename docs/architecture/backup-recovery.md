# Backup & Recovery

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## What is state

| Asset | Where | Protection |
|---|---|---|
| PostgreSQL | VM container or Neon | **backups** (below) |
| Uploaded files | R2 bucket | provider durability (11×9) + separate backups bucket for metadata consistency |
| Code/config | git | remote origin |
| Secrets | host `.env.prod` | also stored encrypted in owner's password manager (documented responsibility) |

## Database backup scheme (VM-container case)

- **Nightly logical dump** (`pg_dump -Fc`) by a cron container → encrypted (age/openssl) → R2 `backups` bucket; 30-day rotation (daily ×7, weekly ×4).
- **Pre-deploy dump** before every migration run (deploy script does it automatically).
- Point-in-time recovery is **not** available on plain dumps — accepted MVP risk (RPO 24h). If that's unacceptable → move to Neon free (PITR included) — documented tradeoff, zero code change.
- Restore drill: **once before launch, then quarterly** — restore dump into a scratch container, run app against it, verify order count + login. Scripted: `scripts/restore_backup.sh`.

## Runbook: database loss

1. Provision/verify Postgres container with empty DB.
2. `scripts/restore_backup.sh <latest>` (decrypt, `pg_restore`, verify counts).
3. Files bucket untouched (keys are referenced by DB rows).
4. Reconcile money: compare Stripe dashboard vs ledger; replay missed webhook events (list from Stripe dashboard since last backup).
5. Post incident note + audit entry.

## Runbook: VM loss

1. New VM, point DNS (TTL low by design).
2. Clone repo, restore `.env.prod` from password manager, `docker compose up -d`, restore DB from backups bucket, attach same R2 buckets (keys unchanged).
3. Total expected: < 1 hour.

## RPO/RTO targets (MVP)

RPO 24h (dumps) / RTO < 1h — consciously cheap; upgraded targets (RPO 5 min via Neon PITR or WAL shipping to R2) are the first paying infra upgrade if the business warrants (see costs).
