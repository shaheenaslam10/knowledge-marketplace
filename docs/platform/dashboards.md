# Platform Surfaces: Dashboards, Search, Profiles

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [frontend architecture](../architecture/frontend.md), [API](../architecture/api.md)

## Student dashboard (`/dashboard`)

Cards & lists (role-aware home):
- **Active orders** (status chips, next action: pay / review delivery / approve)
- **Requests** (open: offers count; managed: triage status)
- **Needs your attention** queue: payment due, delivery to review (auto-approve countdown!), dispute updates
- **Messages** preview; **notifications** drawer
- Quick actions: "Post request" (mode chooser), "Re-book expert"

## Expert dashboard (`/expert`)

- **Earnings summary**: lifetime, this month, pending clearance, next payout
- **Pipeline**: offers pending / invitations awaiting / orders in progress (deadline chips)
- **Opportunities**: matching open requests (new badge), invitation queue
- **Reputation**: rating, completion rate, response rate trends
- Availability toggle (pause → hidden from pool broadcasts, offers still possible)

## Admin back office (`/admin`, Django admin — see admin-journey)

- Custom admin index: queue counters (triage SLA aging, applications, disputes >24h, payouts scheduled/failed, reports)
- KPI panel: GMV, orders, take-rate realized, conversion funnel, active users (7/30d), refund rate
- Filtered changelists per model + action buttons wired to service layer (approve, pool, assign, resolve, refund, payout run)

## Search & filtering (all Postgres — no external search service, ADR-0007)

| Surface | Method |
|---|---|
| Expert directory | FTS (headline/bio) + trigram name match; filters: subject, rating min, price band, availability |
| Open requests board (experts) | FTS (title/description) + filters: subject, budget range, deadline window, new-since badge |
| Student's own lists | simple filters + status chips |
| Future upgrade path | same API contract, swap implementation to Meilisearch (cheap VPS) or pgvector hybrid — documented in scalability doc |

`django.contrib.postgres` `SearchVector` GIN indexes maintained via trigger-free approach: `search_vector` column updated on save (application-level, plus periodic refresh command).

## Public profiles & SEO pages

- `/experts` directory (paginated, crawlable), `/experts/{slug}` profile: headline, bio, subjects, stats, reviews, "Post a request to work with {expert}" CTA (creates managed request prefilled with that expert request note).
- Public pages are SSR with metadata + JSON-LD (`Person`, `AggregateRating` where eligible) — see [seo-ux](../architecture/seo-ux.md).
- Experts control visibility: `list_in_directory` toggle (off = only reachable via direct links, not indexed: `noindex`).

## Reporting/analytics (owner)

- MVP: SQL aggregate queries in the admin KPI panel + CSV export actions on key changelists (orders, payments, users).
- Post-MVP: `analytics.DailyMetric` rollup table built by a nightly job; Metabase (free, self-hosted) as the designated BI upgrade — see [costs](../operations/costs.md).
