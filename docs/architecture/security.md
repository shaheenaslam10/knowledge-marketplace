# Security Requirements

> Status: ✅ pre-launch gate evaluated (Phase 12) · Last updated: Phase 12 · Related: [authentication](authentication.md), [files](../workflows/files.md), [observability](observability.md)

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

- [x] **OWASP ASVS-lite review passed** — Phase 11 audit, F-1…F-8; see
      [security-audit-phase11](security-audit-phase11.md). All findings closed
      or explicitly dispositioned.
- [x] **Authorization matrix has explicit tests** —
      `apps/portal/tests/test_authorization_matrix.py` (every role × sensitive
      endpoint).
- [x] **Webhook signature + replay tests** — `apps/payments/tests`. Covers the
      manual gateway, which is the active provider; the Stripe adapter is an
      unactivated seam (ADR-0005), so there is nothing live to sign. Re-run this
      item on provider activation.
- [x] **File access-control tests** — `apps/files/tests/test_files.py`,
      cross-account attempts denied and audited.
- [x] **Dependency audit clean / triaged** — `pip-audit` + `npm audit` run in CI
      on every push (Backend/Frontend jobs).
- [x] **Secrets scan** — no credentials in git. `.gitignore` excludes every
      `.env.*` except the two committed templates, and CI asserts
      `.env.prod.example` contains only `CHANGE_ME` placeholders.
- [x] **Backup restore rehearsed** — full drill passed 2026-09-28 including the
      BR-33 money identity on restored rows; evidence in
      [backup-recovery](backup-recovery.md#restore-drill-evidence). Rehearsed on
      seeded development data, not staging data — no staging host exists yet.

### Deploy-time posture (Phase 12)

The checklist above is about code. These are enforced at deploy time by
`apps/core/checks.py`, which runs in `entrypoint.prod.sh` before the server
starts — a misconfigured container **refuses to boot**:

| Risk | Check | Severity |
|---|---|---|
| Development `SECRET_KEY` in production | `hem.E001` | blocks boot |
| `DEBUG` enabled | `hem.E002` | blocks boot |
| Forgeable payment webhooks (default secret) | `hem.E008` | blocks boot |
| Mail printed to the log instead of delivered | `hem.E010` | blocks boot |
| Uploads on a container filesystem (lost on redeploy) | `hem.E011` | blocks boot |
| Default `admin/` path | `hem.W006` | blocks boot at `--fail-level WARNING` |
| Non-HTTPS callback URLs | `hem.W002` | as above |
| CSP left report-only | `hem.W003` | as above |

Transport-layer items (TLS, HSTS, Postgres not exposed) are structural in
`deploy/Caddyfile` and `docker-compose.prod.yml` rather than checklist items —
the database publishes no port at all, so it cannot be reached from outside the
compose network. The smoke test re-verifies the header posture after every
deploy.
