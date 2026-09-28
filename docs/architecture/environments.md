# Environments & Configuration

> Status: ✅ implemented (Phase 1; Phase 9 R2 file-storage vars; Phase 12 deployment/backup/CSP vars) · Last updated: Phase 12
> **Sync rule:** every name in `/.env.example` must appear here — CI enforces it (`scripts/check_env_docs.py`). Add new variables to both in the same commit.

## Settings strategy

`config/settings/{base,dev,test,prod}.py`, selected by `DJANGO_SETTINGS_MODULE` (manage.py defaults to dev). All deployment-specific values come from env vars via `django-environ` — 12-factor. `.env.example` at the repo root is the canonical variable list (safe placeholder values; docker-compose.yml carries the same dev defaults so a clean `docker compose up --build` works without any `.env`).

## Environment matrix

| | local dev | CI | staging (optional) | production |
|---|---|---|---|---|
| `DEPLOY_ENV` | `local` | `ci` | `staging` | `production` |
| Backend | uvicorn (`--reload`, compose) or `runserver` (daphne) | pytest | uvicorn (single ASGI proc) | uvicorn (single ASGI proc) |
| Worker | `qcluster` (compose `worker` service) | inline (django-q2 `sync=True`) | qcluster | qcluster |
| Frontend | `next dev` | build + unit + e2e | `next start` | `next start` (standalone) or Vercel |
| DB | docker postgres:16 | services postgres:16 | managed (Neon free) | managed (Neon) or VM container |
| Files | local disk (`MEDIA_ROOT`) | local disk | R2 staging bucket | R2 prod bucket |
| Email | console | locmem (tests) | Brevo test/sandbox | Brevo/SMTP |
| Payments | `PAYMENT_GATEWAY=manual` (full lifecycle simulation) | manual | manual (Stripe test when credentials exist) | manual until a provider is activated (ADR-0005) |
| CSP | report-only (React Refresh needs eval) | report-only | **enforcing**, nonced | **enforcing**, nonced |
| Ingress | none (direct ports) | none | Caddy, auto-TLS | Caddy, auto-TLS |
| Safety checks | inert | inert | `check --tag production` at boot | `check --tag production` at boot |
| Realtime | in-memory channel layer (1 ASGI proc) | in-memory | in-memory (1 proc) | in-memory (1 proc) → Redis later |

## Environment variables (canonical — mirrored in `/.env.example`)

### Core Django
| Variable | Example | Used for |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` | settings selection |
| `SECRET_KEY` | (random 50+) | crypto signing (**required in prod**) |
| `DEBUG` | `False` | never true in prod |
| `ALLOWED_HOSTS` | `api.example.com` | host header allowlist (**required in prod**) |
| `APP_VERSION` | `0.1.0` | API metadata / OpenAPI version |
| `ADMIN_URL` | `admin/` | obfuscated admin path (**a deployment must not leave this default** — `hem.W006`) |
| `LOG_LEVEL` | `INFO` | root log level |
| `DEPLOY_ENV` | `local` \| `ci` \| `staging` \| `production` | **Phase 12.** Which deployment this process *is*. `prod.py` is loaded by both staging and production, so the settings module cannot distinguish them; this can. Drives `apps/core/checks.py`, the `seed_demo` production refusal, and staging isolation (ADR-0016). |

### Database
| Variable | Example |
|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/dbname` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | compose db service only (`hem`/`hem`/`hem`) |

### Origins / CORS / CSRF
| Variable | Example |
|---|---|
| `FRONTEND_URL` | `https://app.example.com` (also used for WS origin allowlist) |
| `BACKEND_URL` | `https://api.example.com` |
| `CORS_ALLOWED_ORIGINS` | comma-separated exact origins |
| `CSRF_TRUSTED_ORIGINS` | comma-separated exact origins |

### Background worker (django-q2 — database-backed, no Redis)
| Variable | Example |
|---|---|
| `WORKERS` | `4` |
| `Q_TIMEOUT` | `300` (must stay < `Q_RETRY`) |
| `Q_RETRY` | `360` |
| `Q_MAX_ATTEMPTS` | `3` |

### API throttling
| Variable | Example |
|---|---|
| `THROTTLE_ANON` | `30/min` |
| `THROTTLE_USER` | `120/min` |

### Payments
| Variable | Example |
|---|---|
| `PAYMENT_GATEWAY` | `manual` \| `stripe` (adapter registry; `stripe` is registered but requires credentials + verification) |
| `MANUAL_PAYMENT_INSTRUCTIONS` | text shown to students in manual mode (**wired — read by the gateway**) |
| `MANUAL_WEBHOOK_SECRET` | HMAC secret for simulated manual-gateway webhook signatures (dev/test; default is dev-only) |
| `PAYMENT_DEV_SELF_CONFIRM` | `1` dev-only affordance letting a student self-confirm a manual payment; defaults false outside dev settings — **never production** |
| `STRIPE_SECRET_KEY` | `sk_…` — unused until the StripeGateway activates (seam only; activation checklist in payments.md) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — unused until the StripeGateway activates |
| `STRIPE_API_COUNTRY` | `US` — unused until the StripeGateway activates |

### Email
| Variable | Example |
|---|---|
| `DEFAULT_FROM_EMAIL` | `no-reply@example.com` |
| `EMAIL_BACKEND_MODE` | `console` \| `smtp` \| `brevo` — **implemented (Phase 8)**: adapter at `config/email_backend.py`; Brevo mode raises without `BREVO_API_KEY` (retries ride django-q2) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | SMTP mode (implemented Phase 8) |
| `BREVO_API_KEY` | Brevo mode (implemented Phase 8) |

### Production hardening (read by `config/settings/prod.py`)
| Variable | Example |
|---|---|
| `SECURE_SSL_REDIRECT` | `True` (default) |
| `SECURE_HSTS_SECONDS` | `31536000` (default) |
| `CSP` | full Content-Security-Policy override for **Django-served** responses (API, admin exempt). Default in `prod.py`. |
| `CSP_REPORT_ONLY` | `False` (default since Phase 12 — CSP is **enforcing**). `True` drops back to report-only for a deliberate canary; the production check warns (`hem.W003`). |
| `PERMISSIONS_POLICY` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `STATIC_ROOT` | `/app/staticfiles` — `collectstatic` target, a volume Caddy serves at `/static/*` (ADR-0016). |

> The **Next.js** CSP is *not* read from these: it carries a per-request nonce
> and is generated in `frontend/src/middleware.ts` (ADR-0017).

### Deployment: domains, TLS, worker (Phase 12 — `docker-compose.prod.yml`, `deploy/Caddyfile`)
| Variable | Example | Used for |
|---|---|---|
| `SITE_DOMAIN` | `www.example.com` | `(marketing)` hostname |
| `APP_DOMAIN` | `app.example.com` | `(auth)`+`(app)` hostname |
| `ADMIN_DOMAIN` | `admin.example.com` | `(portal)` hostname |
| `API_DOMAIN` | `api.example.com` | Django/API hostname |
| `ACME_EMAIL` | `ops@example.com` | Let's Encrypt registration for automatic TLS |
| `READYZ_URL` | `http://api:8000/readyz` | worker entrypoint's readiness target (compose sets it; defaults to the dev service name) |

### Backups (Phase 12 — `scripts/backup_db.sh`, `scripts/restore_backup.sh`)
| Variable | Example | Used for |
|---|---|---|
| `BACKUP_PASSPHRASE` | (long random) | AES-256 key for the encrypted dump. **Losing it loses every backup** — it belongs in the owner's password manager, never on the host only. |
| `BACKUP_DIR` | `./var/backups` | local output directory |
| `BACKUP_RETENTION_DAYS` | `30` | local pruning window |
| `BACKUP_REMOTE_CMD` | `rclone copy` | off-host upload hook. A backup that dies with the machine is not a backup. |

### Files
| Variable | Example |
|---|---|
| `FILE_STORAGE` | `local` \| `r2` |
| `MEDIA_ROOT` | `./var/media` |
| `R2_BUCKET` / `R2_ACCOUNT_ID` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` / `R2_REGION` | R2 mode (implemented Phase 9) |
| `R2_ENDPOINT_URL` | optional endpoint override (defaults to `https://{account}.r2.cloudflarestorage.com`) |
| `R2_PRESIGN_TTL_SECONDS` | presigned GET lifetime, default `300` (60–3600) |

### Auth (Phase 2)
| Variable | Example |
|---|---|
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | `15` / `7` — SimpleJWT lifetimes; rotation + blacklist always on |
| `COOKIE_SECURE` | `False` locally / `True` in production (HTTPS-only `hm_access`/`hm_refresh` cookies) |
| `THROTTLE_AUTH` | `10/min` — brute-force guard on register/login/refresh/verify/reset/change (optional override; defaults in settings) |

### Observability
| Variable | Example |
|---|---|
| `SENTRY_DSN` | optional; wired when error tracking is enabled |

### Frontend build/runtime (`NEXT_PUBLIC_*`)
| Variable | Example | Used for |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` | browser → API base. **Also feeds the CSP `connect-src`** (ADR-0017). Inlined at build time. |
| `NEXT_PUBLIC_WS_URL` | `wss://api.example.com` | browser → WebSocket base; also in `connect-src`. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.example.com` | canonical site URL (SEO/metadata) |
| `SERVER_API_URL` | `http://api:8000` | server-side (RSC) fetch target inside compose |
| `NEXT_PUBLIC_MARKETING_HOST` | `www.example.com` | three-experience host mapping (ADR-0013). Middleware redirects host/path mismatches **only when all three are set** — unset in dev/CI so every path works on `localhost:3000`. |
| `NEXT_PUBLIC_APP_HOST` | `app.example.com` | as above |
| `NEXT_PUBLIC_PORTAL_HOST` | `admin.example.com` | as above |
| `NEXT_PUBLIC_CSP_CONNECT_EXTRA` | `https://o.sentry.io` | comma-separated extra `connect-src` origins |
| `NEXT_PUBLIC_CSP_IMG_EXTRA` | `https://cdn.example.com` | comma-separated extra `img-src` origins |

### Feature flags
| Variable | Example |
|---|---|
| `FEATURE_MANAGED_SERVICE` | `true` |

### Seed/demo
| Variable | Example |
|---|---|
| `DJANGO_SEED_ADMIN_PASSWORD` | `admin-demo-1234` (local only — superuser `admin@demo.local`) |
| `DJANGO_SEED_DEMO_PASSWORD` | `demo-password-1234` (local only — `student@demo.local`, `expert@demo.local`) |

Demo seeding is guarded to DEBUG/test unless `--force`; these defaults are never valid in production.

### Frontend (`NEXT_PUBLIC_*` are inlined into the browser bundle)
| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (browser → API) |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` |
| `NEXT_PUBLIC_SITE_URL` | `https://app.example.com` (canonical/SEO) |
| `SERVER_API_URL` | `http://backend:8000` — server-side (RSC) fetch target; unset outside compose → falls back to `NEXT_PUBLIC_API_URL` |

### Compose-only (host port overrides)
| Variable | Example |
|---|---|
| `POSTGRES_HOST_PORT` / `BACKEND_HOST_PORT` / `FRONTEND_HOST_PORT` | `5432` / `8000` / `3000` |

## Configuration governance

- Changing business parameters (rates, TTLs) = PlatformConfig in admin, **not** env redeploy (arrives with Phase 5+).
- Adding an env var = update this doc + `.env.example` in the same commit (CI: `scripts/check_env_docs.py`).
- Secrets never in git; prod values live only on the host (`.env.prod` chmod 600, or provider env injection).
