# File Storage Architecture

> Status: ✅ local + R2 adapters implemented (Phase 9) · Last updated: Phase 9 · ADR-0006 · Related: [workflows/files](../workflows/files.md)

## Storage abstraction

Single Django storage API (`django-storages` S3 backend or FileSystemStorage) selected by env:

| Env | Storage | Access pattern |
|---|---|---|
| local dev / CI | `FileSystemStorage` → `var/media/` (gitignored) — **default** | permission-checked streaming view (`/files/{id}/download?token=`, 5-min signed token) |
| staging / prod | **Cloudflare R2** (S3-compatible) via `django-storages` boto3 (`FILE_STORAGE=r2`) | `grant_download` authorization → **5-min presigned GET** (boto3 `generate_presigned_url`, s3v4) → browser fetches directly from R2 |

Same `Attachment` metadata either way — switching is an env change (`FILE_STORAGE`), zero code. R2 is never required for local dev/CI: unset envs keep `FileSystemStorage`. `grant_download` remains the ONLY access decision for both adapters; the R2 presign simply replaces the transport after authorization.

## Why R2 (and not S3)

- Free tier: **10 GB storage + zero egress fees** (egress is the cost that kills file platforms on S3).
- S3-compatible API → trivial migration path to S3/B2/Wasabi later (endpoint+keys change).
- Alternative evaluated: Backblaze B2 (10 GB free, 3× egress free) — fine, but R2's zero-egress wins for delivery files; Supabase storage rejected (couples us to their Postgres); self-hosted MinIO on the app VM considered for prod too, but disk on cheap VMs is small — R2 keeps the VM thin.

## Bucket layout & policies

- One private bucket per environment (`hem-dev-files`, `hem-prod-files`).
- Keys: `{purpose}/{yyyy}/{mm}/{uuid}.{ext}` — no user data in keys.
- Bucket: private, SSE enabled, versioning off (metadata in DB is truth), lifecycle rule: abort incomplete multipart 7d.
- CORS on bucket: only our frontend origin, only GET, only for presigned fetches.
- Uploads: direct-to-backend (multipart POST) in MVP. Post-MVP optimization for >50 MB deliveries: presigned PUT with server-side post-validation (same Attachment validation, then confirm).

## Backups

DB backups go to a separate R2 bucket (see [backup-recovery](backup-recovery.md)); uploaded files are inherently durable in R2 (11-nines durability claim); restore drills cover metadata+bytes consistency.

## Costs

| Volume | R2 cost |
|---|---|
| 10 GB stored, low traffic | **$0** (free tier) |
| 100 GB + 500 GB egress/mo | ≈ $1.50 storage, **$0 egress** |

(see [costs](../operations/costs.md))
