# Security Requirements

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [authentication](authentication.md), [files](../workflows/files.md), [observability](observability.md)

Posture: modern web-app baseline for a money-handling marketplace, sized for a small team. Principle: **secure defaults, least privilege, server-side authority, audited admin power.**

## Transport & headers

- HTTPS everywhere (HSTS preload in prod); TLS terminated at proxy (Caddy) with automatic certs.
- Security headers (middleware/proxy): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (CSP `frame-ancestors 'none'`), strict `Content-Security-Policy` (nonce-based for Next; Django templates self + Stripe), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Cookies: `Secure; HttpOnly; SameSite=Lax` (session), paths scoped.

## Application-level

- **Injection:** ORM-only data access; raw SQL limited to analytics selectors with parameterization; `bleach`-sanitized user HTML fragments (chat markdown rendering server-side linkifies only).
- **XSS:** React escaping + strict CSP; no `dangerouslySetInnerHTML` except sanitized review bodies; file downloads forced `Content-Disposition: attachment` + `nosniff` (no in-browser execution of uploads).
- **CSRF:** SameSite=Lax + same-site architecture + custom-header requirement (`X-Requested-With`) on cookie-authed unsafe methods + CORS allowlist (no wildcard with credentials).
- **IDOR:** UUID public ids + object-level queryset scoping everywhere (tested explicitly — authorization test module per app).
- **File uploads:** allowlist per purpose, content sniffing, size caps, no path traversal (server-generated keys), no SVG/HTML serving. AV scanning documented as post-MVP with compensating controls.
- **Secrets:** env-only (never in repo); `.env.example` documents names, not values; prod secrets via host env/secret files; Stripe keys segregated live/test.
- **Dependencies:** pinned versions; `pip-audit` / `npm audit` in CI; Dependabot enabled.
- **Django hardening:** `DEBUG=false` in prod, `ALLOWED_HOSTS` pinned, `SECURE_*` settings on, admin under non-guessable path env (`DJANGO_ADMIN_URL`), login rate-limited, `X-Frame-Options` for admin too.
- **SQL/DB:** least-privilege app DB role (no SUPERUSER); migrations run by deploy user; backups encrypted at rest (R2 SSE).

## Money-path integrity

- Payment state transitions **only** via verified provider webhooks / operator action / service layer (BR-29/32/33); amount recomputation server-side from order snapshot (never client amounts); webhook signature + event-id dedup; ledger append-only. **Shipped (Phase 7):** confirmation is one service path with row locks and amount-parity checks; webhooks verify signatures before storage (event_id unique = replay-safe; failures replayable via admin on already-verified payloads); operator confirm exists only on manual rails; the student "confirm (dev)" affordance is `PAYMENT_DEV_SELF_CONFIRM`-gated and disabled outside dev; refunds/payouts are staff-only service actions; financial admin tables are read-only; no card data fields exist anywhere in the schema; provider secrets never enter API responses (manual mode exposes static instructions text only).
- Payouts gated on: order completed + no open dispute + account enabled + minimum.
- Admin money actions: confirmation + reason + audit row (BR-42).

## Privacy & data protection

- Data minimization: we store what the flow needs (see entity list); no sensitive categories beyond verification docs (admin-only access, audited).
- Account self-service: deactivate (soft) + data export (JSON of owned entities) — post-MVP item but schema-ready.
- ID/credential documents: encrypted at rest via R2 SSE, `admin_only` access level, audited views, 12-month purge.
- Privacy policy + ToS templates required before launch (owner's legal responsibility — documented, not code).
- Logs scrub auth headers/cookies; no card data ever touches our systems (Stripe Elements iframe — SAQ-A scope).

## Operational security

- Single-VM deploy: key-based SSH, ufw (80/443 only), fail2ban, unattended security upgrades, containers non-root, Postgres not exposed publicly (compose-internal or loopback+SSL for managed).
- Backups encrypted, restore-tested (see [backup-recovery](backup-recovery.md)).
- Sentry (optional free tier) for error visibility — no PII in breadcrumbs.

## Security checklist (pre-launch gate — tracked in Phase 12)

- [ ] OWASP ASVS-lite review passed (injection, authn, authz, session, CSRF, headers, uploads, errors)
- [ ] Authorization matrix has explicit tests (every role × sensitive endpoint)
- [ ] Stripe webhook signature + replay tests
- [ ] File access-control tests (cross-account attempts denied + audited)
- [ ] Dependency audit clean / triaged
- [ ] Secrets scan on repo (no keys committed, ever)
- [ ] Backup restore rehearsed once on staging data
