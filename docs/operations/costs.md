# Estimated Operating Costs & Free-Tier Alternatives

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Principle: FREE-FIRST → LOW-COST → SCALE-WHEN-NECESSARY

Every infrastructure/external decision, with purpose / free option / paid option / why chosen / migration path. Monthly estimates in USD.

## Fixed infrastructure

| Service | Purpose | Free option used (MVP) | Low-cost paid upgrade | MVP cost | Trigger to upgrade | Migration path |
|---|---|---|---|---|---|---|
| App host (Django+WS, worker, frontend, Postgres, Caddy) | run everything | Oracle Cloud Always Free ARM (genuinely $0) or Fly.io shared-cpu-1x | Fly shared-2x ≈ $5; Hetzner CX22 ≈ €4.5 | **$0–5** | p95 latency or RAM pressure | docker-compose file is host-agnostic — move = rsync + DNS |
| PostgreSQL | source of truth | same VM container | Neon free tier (0.5GB, PITR) → Launch $19 | **$0** | storage > 0.5GB or need PITR/RPO<24h | `pg_dump/restore`, DATABASE_URL swap |
| Redis | (not used in MVP) | — | Upstash free tier when WS scale-out needed | **$0** | WS > ~500 concurrent (see scalability) | one settings change |
| File storage | uploads/deliveries | **Cloudflare R2 free: 10GB, $0 egress** | R2 $0.015/GB-month | **$0** (then cents) | > 10 GB | S3-compatible: swap endpoint |
| DB backups | recovery | R2 free tier headroom | same | **$0** | — | — |
| Email (transactional) | verify/reset/notifications | Brevo free **300/day** (~9k/mo) | Brevo Starter $9 (5k/day); Mailgun flex | **$0** | > 250/day sustained | SMTP/API adapter swap (env) |
| Error tracking | exceptions | Sentry free 5k events/mo (optional) | Sentry team $26; self-host GlitchTip $0 | **$0** | event volume | DSN env |
| Uptime monitoring | alerting | UptimeRobot free (50 monitors) | — | **$0** | — | — |
| CI/CD | tests+build | GitHub Actions free (public repo; 2k min/mo private) | — | **$0** | minutes cap | self-host runner on VM |
| Domain | identity | — | ~$10–12/yr | ~**$1/mo** | — | — |
| Analytics (product) | traffic | none in MVP / self-hostable Umami free on same VM | Plausible $9 | **$0** | owner wants funnels | add Umami container |
| Search | requests/experts | Postgres FTS+trigram | Meilisearch self-host (free) on same VM | **$0** | search quality complaints | container + indexer, API contract unchanged |
| Monitoring/APM | metrics | structured logs (docker) | Grafana Cloud free tier | **$0** | debugging needs | ship logs later |
| **Total fixed** | | | | **≈ $1–6/mo** | | |

## Variable / transaction costs

| Item | Rate | Notes |
|---|---|---|
| Stripe payment processing | ~2.9% + $0.30 (US cards; +1.5% intl, +1% currency conversion) | deducted from platform commission; see business-model policy |
| Stripe Connect payouts | $0 (same-country transfers); cross-border/currency: Stripe fees deducted from transfer | expert sees net in payout record |
| Stripe dispute | $15 per chargeback (US) | absorbed by losing party per dispute policy |
| Bandwidth | $0 (R2 free tier / cheap VM) | |
| Manual-gateway mode | bank transfer fees only (often $0 domestic PK) | fallback when Stripe unsupported |

## Cost at three scales (fixed infra only)

| Scale | Monthly fixed | Notes |
|---|---|---|
| Launch (0–500 orders/mo) | **~$1–6** | everything free-tier, one small box |
| Growing (500–3,000 orders/mo) | ~$15–40 | bigger VM or Fly, Neon Launch, email paid tier, maybe Redis |
| Established (10k+ orders/mo) | ~$60–150 | still one modest stack: 2 VMs or Fly machines + managed DB + email + monitoring — take rate covers it (~$3–5 revenue/order) |

## Explicitly postponed (with reason)

| Not in MVP | Why | When |
|---|---|---|
| Elasticsearch/OpenSearch | Postgres FTS suffices | search complaints |
| Pusher/Ably realtime | Channels + in-memory layer works | WS scale-out trigger |
| Kubernetes / service mesh | one box is fine; compose is portable | never before multi-VM |
| Paid CDN | Cloudflare free exists | latency complaints |
| AV scanning infra | allowlist + download posture compensates; ClamAV container is the designated add | before regulated B2B deals / >1k orders/mo |
| Data warehouse / BI | SQL + CSV exports | investor-grade reporting needs |
| Multi-region | single-region users initially | latency data |

## Cost decisions log

Any new external service must be added to this table **before** introduction, with the five-question evaluation (PG/Django? open-source? free tier? cheaper? postponable?) — enforced in architecture review ([process/architecture-review.md](../process/architecture-review.md)).
