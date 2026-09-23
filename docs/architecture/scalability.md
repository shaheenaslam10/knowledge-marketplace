# Scalability Strategy

> Status: 📐 Phase 0 · Last updated: 2026-09-23

Philosophy: **scale triggers, not prophecy.** The MVP stack comfortably serves the first thousands of users; each component has a documented, low-drama upgrade path when a measurable trigger fires.

## Capacity envelope of the MVP stack (single small VM + Postgres)

| Metric | Comfortable bound | Basis |
|---|---|---|
| Registered users | ~25k | auth + profile load trivial |
| DAU | ~2–3k | SSR + API on 1–2 vCPU |
| Requests/orders volume | ~1k orders/mo | row counts irrelevant; job sweepers are the load |
| Concurrent WS users | ~500–800 (one ASGI proc) | Channels in-memory, single process |
| Postgres size | years of MVP data (< a few GB) | + Neon free 0.5 GB / VM disk |
| Jobs/day | ~50k | DB queue handles easily at this size |

## Trigger → action ladder

| Trigger (measure it) | Action | Cost impact |
|---|---|---|
| WS > ~500 concurrent or need >1 ASGI proc | enable **Redis channel layer** (managed free tiers: Upstash free/Render; or $5 VPS Redis) + run 2 ASGI procs behind Caddy | +$0–5 |
| Page/API latency p95 > 500ms | split worker off the VM / bigger VM (vertical first) | +$2–4 |
| Postgres CPU > 60% sustained | managed DB (Neon Launch plan) or dedicated DB VM; add connection pooling (pgbouncer) | +$5–19 |
| Search quality/complaints | **Meilisearch** container (open-source) on same VM, index requests+experts; API contract unchanged | +$0 (same box) |
| Email volume > 300/day (Brevo free) | Brevo Starter (~$9/mo 5k) or Mailgun flexible | +$9 |
| Storage > 10 GB (R2 free) | R2 is $0.015/GB — pay as you grow, no migration | cents |
| Errors need triage tooling | Sentry paid tier or self-host GlitchTip | +$0–26 |
| Analytics requests outgrow SQL admin views | nightly rollup table → Metabase container | +$0 (same box) |
| **Module hot-spot proven by profiling** (e.g., WS/chat load) | extract that module behind its service interface (the monolith seams) — first candidate: realtime/chat; second: search | separate small service |
| International latency complaints | Cloudflare (free) in front for caching public pages/static | $0 |
| Team grows / deploy risk | staging environment clone | +$0–5 |

## What we deliberately do NOT pre-build

Sharding, read replicas, k8s, multi-region, event bus, CQRS, microservices — all premature at MVP scale; the modular-monolith seams (service layer per app) are the hedge that keeps them *possible*.

## Data-growth notes

- Ledger/audit/notifications are the only unbounded tables: ledger and audit kept forever (append-only by design, indexed, cheap), notifications pruned at 90d, periodic `VACUUM/ANALYZE` via maintenance cron; partitioning of ledger by year is a documented future step (not needed before tens of millions of rows).
