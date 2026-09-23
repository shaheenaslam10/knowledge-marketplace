# Third-Party Integrations

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [payments workflow](../workflows/payments.md), [costs](costs.md)

## Stripe Connect (payments) — primary

- **Mode:** Connect with **separate charges & transfers**. Platform = merchant of record; experts onboard as **Express connected accounts** (Stripe-hosted KYC/tax onboarding via Account Links; platform never handles identity docs).
- **Capabilities used:** PaymentIntents (charges), Transfers (`source_transaction`-linked so funds availability is respected), Transfer reversals, Refunds, Webhooks (`payment_intent.*`, `transfer.*`, `refund.*`, `account.updated`, `charge.dispute.*`), Account Links + `account.updated` for onboarding status, Express Dashboard for experts' tax docs.
- **Fees:** processing ~2.9%+$0.30 US (higher intl); same-country transfers free; cross-border/currency conversion deducted from transfer. No fixed platform cost (pay per transaction only).
- **Country constraint (important):** Stripe platform accounts require a supported country (US, GB, EU, CA, AU, SG + more); **Pakistan is not Stripe-supported**. Decision (ADR-0005): `PaymentGateway` abstraction ships both **StripeConnectGateway** (for supported domiciles / when the owner registers an entity in a supported country) and **ManualGateway** (bank/JazzCash/Easypaisa transfers, admin-confirmed, full ledger parity) so the platform is launchable from any country; switching = env change. Expert-side coverage also varies by country — Express availability is checked at expert onboarding; unsupported-expert countries route to manual payouts (admin-run, ledger-recorded).
- **Compliance:** platform must present Stripe's Connected Account Agreement to experts (done in onboarding flow); Stripe TOS updates monitored; platform is responsible for chargeback responses (runbook in payments doc).

## Email (transactional) — Brevo (free 300/day) primary

- Adapter interface `EmailBackend`: `brevo` (API), `smtp` (Gmail SMTP free 500/day as dev/fallback), `console` (local).
- SPF + DKIM set up on the sending domain (runbook in deployment checklist); templates in-repo (Django templates), one-click unsubscribe per category.
- Upgrade path: Brevo Starter → Mailgun/Postmark — adapter swap only.

## Cloudflare R2 (files) — see [files-storage](../architecture/files-storage.md)

S3-compatible; boto3 credentials scoped to one bucket; CORS locked to app origins.

## Deferred integrations (designed-for, not built)

| Integration | Purpose | When |
|---|---|---|
| Google OAuth | social login | post-MVP (auth backend seam ready) |
| Plausible/Umami | product analytics | owner decision post-launch |
| Calendly-style scheduling | tutoring session booking | post-MVP demand |
| Jitsi (self-host) / Zoom links | live sessions | post-MVP demand |
| Payoneer / Wise | expert payouts in unsupported countries (better than manual at scale) | when manual payouts hurt ops |
| Cloudflare CDN/proxy | global latency | latency trigger |

## Integration principles

1. Every third party sits behind an adapter interface (`payments.gateway`, `EmailBackend`, storage API) — swap-for-cost is an env change.
2. No integration stores our users' passwords or card data (Stripe Elements iframes; SAQ-A).
3. Webhook receivers always: verify signature → store raw → process idempotently → 200 fast.
4. A new integration requires: costs-table entry (see costs doc), env docs update, adapter + FakeGateway-style test double, and a rollback path (feature flag).
