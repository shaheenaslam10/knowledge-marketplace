# Phase 11 security & reliability audit (docs-first checkpoint)

> Status: ✅ audit complete 2026-09-25 (Phase 11) · Dispositions tracked below · Related: [security](security.md), [testing](testing.md), [deployment](deployment.md)

Repository-wide audit performed before any Phase 11 code change, per the takeover protocol. Existing controls verified by the suites shipped in Phases 0–10: JWT rotation + reuse-blacklist, enumeration-safe register/reset, deactivation kills tokens, per-app authorization tests (IDOR-style 404 masks), file magic-byte sniffing + signed-URL expiry + cross-account denials, WS strict origin validation, webhook event-id dedup + signature-verified processing, ledger identity + append-only semantics, ops staff gating incl. support-vs-admin config writes, Django admin money tables read-only, dev-only payment self-confirm double gate.

## Findings and dispositions

| ID | Severity | Area | Finding | Disposition |
|---|---|---|---|---|
| F-1 | **High** | Cookies/tokens | `COOKIE_SECURE` is documented in `.env.example` and read by the auth-cookie setter (`getattr(settings, "COOKIE_SECURE", False)`), but **no settings file ever defines it** — production auth cookies would ship `Secure=false`. | **Fixed (Phase 11):** base reads `COOKIE_SECURE` from env (default `False` for local dev); prod defaults it to `True`. Locked by a settings-posture test. |
| F-2 | Medium | Headers | No CSP, `Permissions-Policy`, or COOP anywhere, although security.md promised them; Next app serves no security headers at all. | **Fixed (Phase 11):** `SecurityHeadersMiddleware` (Django, prod) sets CSP (env-tunable, report-only first per handoff; admin path exempted — Django admin relies on inline handlers) + minimal `Permissions-Policy`; prod COOP `same-origin`. `next.config.ts` sends `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and report-only CSP for the Next app (enforcing CSP on Next needs nonced inline scripts — listed for the Phase 12 pre-launch gate). |
| F-3 | Medium | Dependencies | `npm audit`: postcss **high** (XSS in CSS stringify) via `next@15` pinning `postcss@8.4.31`; `next` moderate via the same; vitest/@vitest/mocker moderate (path traversal) — dev-only tooling. pip-audit: app requirements clean; only the local venv's setuptools (build tooling, not shipped) had advisories. | **Fixed:** semver-compatible `overrides: { "postcss": "^8.5.23" }` — prod deps now audit clean (`npm audit --omit=dev` → 0). **Accepted (documented):** vitest fix requires the v5 major (churn against the brief's no-blind-major rule; dev-only exposure) — revisit at the next scheduled major upgrade. CI gains a dependency-audit gate (pip-audit + `npm audit --omit=dev --audit-level=high`). |
| F-4 | Low | Docs | security.md names env `DJANGO_ADMIN_URL`; the code implements `ADMIN_URL` (default `admin/`). | **Fixed:** doc aligned to the shipped env name (code unchanged). |
| F-5 | Low | Rate limiting | `/ops` write actions (report review, config update) rode only the global `user` throttle (120/min). | **Fixed (Phase 11):** scoped `ops_write` throttle (default 60/min, env `THROTTLE_OPS_WRITE`) on the sensitive staff write endpoints, tested with the same patching approach as the `auth` scope. |
| F-6 | Info | Verified clean | Authn/authz, files, WS, payments/ledger, moderation, audit, config surfaces behaved as documented under adversarial probing during this audit (anon 401s, student 403/404 masks, support-vs-admin boundaries, idempotent review, no direct money mutation paths outside services). | No action — the authorization-matrix suite added this phase makes these guarantees continuous rather than one-off. |
| F-7 | Info | Infra | Postgres exposure, TLS/HSTS at the Caddy proxy, secret provisioning, backup-restore rehearsal are deployment-time concerns. | **Phase 12** — already tracked in the security.md pre-launch checklist; not code changes in this repo phase. |
| F-8 | Info | Dev-only | JWT `InsecureKeyLengthWarning` from the 31-byte dev HMAC key; prod requires a real `SECRET_KEY` (boot-fails otherwise). | Documented; dev-only by design. |

## Performance & UX audit results

Recorded after implementation in [performance](performance.md) (query budgets, N+1 review), [web-experiences](web-experiences.md) (responsive + accessibility pass), and the Phase 11 roadmap record — kept out of this table so it stays security-only.
