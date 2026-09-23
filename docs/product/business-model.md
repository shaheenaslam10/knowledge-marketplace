# Business Model

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Revenue streams

### 1. Order commission (primary, MVP)

The platform takes a percentage of every completed order. Rates are **configuration, not code** — stored in `core.PlatformConfig` and editable in the Django admin without deployment.

| Parameter | Default | Config key |
|---|---|---|
| Open-marketplace commission | **15%** | `commission_rate_open` |
| Managed-service commission | **20%** | `commission_rate_managed` |
| Minimum order value | **$5.00** | `min_order_amount` |
| Payout minimum (expert) | **$10.00** | `min_payout_amount` |
| Free revisions included | 2 (open) / 3 (managed) | `revisions_included_*` |

**Why 20% on managed:** the platform performs triage, matching, quality control and (if needed) reassignment — materially more operational work than the open flow.

### 2. Payment-fee policy

- Stripe's processing fee (~2.9% + $0.30 for US cards, more cross-border) is **absorbed by the platform out of its commission**. The expert's displayed net = `order_amount − commission`; the student pays exactly the order amount. This keeps the student/expert experience simple.
- If an order is refunded, Stripe fees are generally **not** returned by Stripe; per policy BR-14 the platform absorbs the lost fee on full platform-fault refunds and may retain it on student-remorse cancellations. See [workflows/payments.md](../workflows/payments.md#refund-fee-policy).

### 3. Post-MVP revenue options (documented, not built)

| Stream | Trigger to build | Notes |
|---|---|---|
| Featured/sponsored request placement | Supply > demand in a subject | Small one-off fee, Stripe checkout |
| Expert subscription (priority placement, lower commission tier) | >100 active experts | e.g. $9/mo for 15%→10% commission |
| Student membership (discounted commission pass-through) | Repeat-usage proven | Not before PMF |
| Late-cancellation fee split | Excessive late cancellations | Split with the affected expert |

**Deliberately excluded:** listing fees for students (kills demand-side growth), charging experts to join (kills supply), selling student data (never).

## Unit economics (example: $100 managed order)

```text
Student pays                    $100.00
Stripe fee (US card)             −$3.20   (2.9% + $0.30)
Platform commission (20%)       +$20.00
Expert receives                  $80.00   (Stripe transfer, no fee to expert*)
─────────────────────────────────────────
Platform net revenue             $16.80   per completed order
```

\* Expert payout via Stripe Connect transfer: no additional Stripe fee for same-region transfers; cross-border/currency conversion fees (≈1–2%) are deducted by Stripe from the transfer and shown in the payout record. Payout country coverage is a real constraint — see [operations/integrations.md](../operations/integrations.md#stripe-connect) for supported countries and the manual-payout fallback for unsupported regions.

## Money handling rules

- All amounts are stored as **integer minor units** (cents) + ISO currency code (ADR-0009). No floats, ever.
- MVP is **single-currency (USD)** for Stripe-mode transactions. The manual payment gateway mode may operate in PKR for unsupported Stripe regions — currency is per-platform-config, not per-order, in MVP.
- Commission rate is **snapshotted onto the order** at creation (rate changes never affect existing orders).
- Expert-facing prices always show gross **and** estimated net ("You'll receive $85.00 after the 15% platform fee").
- The platform never holds funds outside Stripe's balance in Stripe mode; in manual mode, payouts are executed externally and recorded in the ledger (see [workflows/payments.md](../workflows/payments.md#manual-gateway-fallback)).

## Cost discipline

The business model is designed so that fixed monthly infrastructure cost ≈ **$0–5** until meaningful volume (see [operations/costs.md](../operations/costs.md)). Variable costs are dominated by payment processing, which is a % of revenue, not a fixed line.
