# Environments & Configuration

> Status: ✅ implemented in Phase 1 · Last updated: Phase 1
> **Sync rule:** every name in `/.env.example` must appear here — CI enforces it (`scripts/check_env_docs.py`). Add new variables to both in the same commit.

## Settings strategy

`config/settings/{base,dev,test,prod}.py`, selected by `DJANGO_SETTINGS_MODULE` (manage.py defaults to dev). All deployment-specific values come from env vars via `django-environ` — 12-factor. `.env.example` at the repo root is the canonical variable list (safe placeholder values; docker-compose.yml carries the same dev defaults so a clean `docker compose up --build` works without any `.env`).

## Environment matrix

| | local dev | CI | staging (optional) | production |
|---|---|---|---|---|
| Backend | uvicorn (`--reload`, compose) or `runserver` (daphne) | pytest | uvicorn | uvicorn (single ASGI proc) |
| Worker | `qcluster` (compose `worker` service) | inline (django-q2 `sync=True`) | qcluster | qcluster |
| Frontend | `next dev` | build + unit + e2e | `next start` | `next start` (standalone) or Vercel |
| DB | docker postgres:16 | services postgres:16 | managed (Neon free) | managed (Neon) or VM container |
| Files | local disk (`MEDIA_ROOT`) | local disk | R2 staging bucket | R2 prod bucket |
| Email | console | locmem (tests) | Brevo test/sandbox | Brevo/SMTP |
| Payments | `PAYMENT_GATEWAY=manual` (interface only in Phase 1) | FakeGateway/manual | Stripe test (Phase 8) | Stripe live or manual |
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
| `ADMIN_URL` | `admin/` | obfuscated admin path |
| `LOG_LEVEL` | `INFO` | root log level |

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
| `PAYMENT_GATEWAY` | `manual` \| `stripe` (adapter registry; Phase 8 registers stripe) |
| `MANUAL_PAYMENT_INSTRUCTIONS` | text shown to students in manual mode |
| `STRIPE_SECRET_KEY` | `sk_…` (Phase 8) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (Phase 8) |
| `STRIPE_API_COUNTRY` | `US` (Phase 8) |

### Email
| Variable | Example |
|---|---|
| `EMAIL_BACKEND_MODE` | `console` \| `smtp` \| `brevo` (adapters complete in Phase 9) |
| `DEFAULT_FROM_EMAIL` | `no-reply@example.com` |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | SMTP mode |
| `BREVO_API_KEY` | Brevo mode |

### Files
| Variable | Example |
|---|---|
| `FILE_STORAGE` | `local` \| `r2` |
| `MEDIA_ROOT` | `./var/media` |
| `R2_BUCKET` / `R2_ACCOUNT_ID` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` / `R2_REGION` | R2 mode (Phase 10) |

### Auth (Phase 2)
| Variable | Example |
|---|---|
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | `15` / `7` |

### Observability
| Variable | Example |
|---|---|
| `SENTRY_DSN` | optional; wired when error tracking is enabled |

### Feature flags
| Variable | Example |
|---|---|
| `FEATURE_MANAGED_SERVICE` | `true` |

### Seed/demo
| Variable | Example |
|---|---|
| `DJANGO_SEED_ADMIN_PASSWORD` | `admin-demo-1234` (local only) |

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
