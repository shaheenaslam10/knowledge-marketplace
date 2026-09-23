# File Uploads & Secure File Access

> Status: ✅ Phase 3 foundation implemented (`credential` + `avatar` purposes, sniffing, dedupe, signed streaming, audited staff access) · Last updated: Phase 3 · Related: [files-storage](../architecture/files-storage.md), [security](../architecture/security.md)

## Model

`files.Attachment`: UUID, uploader, storage key, original filename, content_type, size, sha256, `purpose`, `access` level, and a link to its context. Context links are **explicit FKs from owners** (request, offer, delivery, dispute, message, expert application, avatar) rather than generic relations where practical (ADR: explicit > magic; a shared `Attachment` table is referenced by owner models). Upload happens **first** (returns id), then the owner object references attachment ids — allows atomic validation of context.

## Purposes & quotas

| Purpose | Who uploads | Max size | Allowed types (allowlist) |
|---|---|---|---|
| `request_brief` | student | 10 MB / file, ≤8 files | pdf, doc/docx, txt, md, png, jpg, zip |
| `message` | participants | 5 MB | pdf, png, jpg, txt, zip |
| `delivery` | expert | 50 MB / file, ≤10 | pdf, docx, xlsx, pptx, zip, py, ipynb, txt, md |

> **Phase 6 implementation delta:** the `delivery` and `order_attachment` purposes shipped with a reduced allowlist — pdf/png/jpg/jpeg, ≤25 MB/file (delivered documents + images for review in-browser). Widening to the full matrix above is a Phase 9 files expansion, alongside dispute evidence uploads. Access: `delivery`/`order_attachment` downloads resolve participants through `Delivery → order` / `Order` traversal (uploader/staff or the order's student/expert); strangers get 403/404.
| `dispute_evidence` | participants | 10 MB | pdf, png, jpg |
| `credential` | expert applicant | 10 MB, private | pdf, png, jpg |
| `avatar` | any user | 2 MB, public-read | png, jpg, webp |

Quotas are per-purpose config in PlatformConfig; enforced at upload.

## Security rules

1. **No public file URLs** except avatars. Everything else requires authorization.
2. Upload path: MVP uses **direct-to-backend** (`POST /api/v1/files`, multipart) → server validates → stores (local disk in dev, R2 in prod via django-storages). Content-type sniffing (python-magic) — never trust the client header. Extension allowlist per purpose. Filenames are sanitized; stored under `uploads/{purpose}/{yyyy}/{uuid}.{ext}` (no user-controlled path segments).
3. Download access check happens on every request: `GET /files/{id}/download-url` verifies uploader/participant/admin + purpose rules → returns either:
   - **prod (R2):** short-lived (5-min) presigned GET URL, or
   - **dev/local:** signed token URL hitting a streaming Django view (`FileResponse`, permission-checked).
4. Virus scanning: **post-MVP** (documented postponement; mitigation in MVP: allowlist types, no HTML/SVG serving, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`). AV via ClamAV lambda/container is the designated future step.
5. Credentials & ID documents: `access=admin_only`, never visible to counterparties; admin file views are audited.
6. Integrity: sha256 recorded; duplicate uploads deduped per uploader (hash+size) to save storage.
7. Images are never server-processed in MVP (no ImageMagick attack surface); avatars size-limited and served from their own public path.

## Retention

- Files on **cancelled-without-payment** requests: auto-deleted after 30 days (job).
- Delivery/evidence files: retained 12 months post-completion (support & disputes), then purged (job) unless legal hold flag.
- Deletion is storage+row, logged in audit.
