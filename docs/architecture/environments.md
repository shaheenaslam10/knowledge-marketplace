# Environments & Configuration

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Settings strategy

`config/settings/{base,dev,test,prod}.py`, selected by `DJANGO_SETTINGS_MODULE` (defaults: dev). All deployment-specific values from env via `django-environ` — 12-factor. `.env.example` at repo root is the canonical variable list (names only, safe placeholders).

## Environment matrix

| | local dev | CI | staging (optional) | production |
|---|---|---|---|---|
| Backend | uvicorn (reload) | pytest | uvicorn | uvicorn (single ASGI proc) |
| Worker | `process_tasks` (same compose) | inline (eager mode) | yes | yes |
| Frontend | `next dev` | build + e2e | `next start` | `next start` (or Vercel) |
| DB | docker postgres:16 | docker postgres:16 | managed (Neon free) | managed (Neon) or VM container |
| Files | local disk | local disk | R2 staging bucket | R2 prod bucket |
| Email | console backend (prints) | console | Brevo test/sandbox | Brevo |
| Payments | Stripe test or `PAYMENT_GATEWAY=manual` | FakeGateway | Stripe test | Stripe live or manual |
| Realtime | in-memory channel layer | in-memory | in-memory (1 proc) | in-memory (1 proc) → Redis later |

## Environment variables (canonical list — mirrored in `.env.example`)

### Backend (Django)
| Variable | Example | Used for |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` | settings selection |
| `SECRET_KEY` | (random 50+) | crypto signing |
| `DEBUG` | `False` | |
| `ALLOWED_HOSTS` | `api.example.com` | |
| `DATABASE_URL` | `postgres://…` | single DB DSN |
| `FRONTEND_URL` / `BACKEND_URL` | origins | CORS, email links, sitemap |
| `CORS_ALLOWED_ORIGINS` | `https://app.example.com` | allowlist |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | 15 / 7 | session lifetimes |
| `PAYMENT_GATEWAY` | `stripe` \| `manual` | gateway adapter |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | `sk_…`/`whsec_…` | Stripe mode |
| `STRIPE_API_COUNTRY` | `US` | platform account country notice |
| `MANUAL_PAYMENT_INSTRUCTIONS` | text | manual mode student instructions |
| `EMAIL_BACKEND_MODE` | `console` \| `smtp` \| `brevo` | adapter |
| `EMAIL_HOST`… / `BREVO_API_KEY` | | smtp/brevo creds |
| `DEFAULT_FROM_EMAIL` | `no-reply@…` | |
| `FILE_STORAGE` | `local` \| `r2` | storage backend |
| `MEDIA_ROOT` | `./var/media` | local storage path |
| `R2_*` (`BUCKET`,`ACCOUNT_ID`,`ACCESS_KEY`,`SECRET_KEY`,`REGION`) | | R2/S3 creds |
| `ADMIN_URL` | `backstage-7f3/` | obfuscated admin path |
| `SENTRY_DSN` | (optional) | error tracking |
| `FEATURE_*` flags | `FEATURE_MANAGED_SERVICE=true` | kill-switches |

### Frontend (Next.js, `NEXT_PUBLIC_*`)
| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `NEXT_PUBLIC_SITE_URL` | canonical origin (SEO) |

### Compose-only
`POSTGRES_USER/PASSWORD/DB`, `PORTS_*`, `CADDY_EMAIL` (LE certs).

## Configuration governance

- Changing business parameters (rates, TTLs) = PlatformConfig in admin, **not** env redeploy.
- Adding an env var = update this doc + `.env.example` in the same commit (checked by CI script `scripts/check_env_docs.py` comparing names).
- Secrets never in git; prod values live only on the host (`.env.prod` chmod 600, or provider env injection).
