# Product Overview

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## One-liner

A two-sided platform where students post learning/academic-support requests and get help either through an **open marketplace** (experts bid, student picks) or a **managed service** (the platform triages and assigns the right expert), handling payment, delivery, and quality end-to-end.

## The problem

Students looking for academic help face a fragmented market: social-media groups and classifieds have no payment protection, no quality signal, and no accountability; full-service agencies are opaque and expensive. Experts, meanwhile, struggle to find legitimate demand and to get paid safely.

## The solution — two models side by side

| | Open Marketplace | Managed Service |
|---|---|---|
| Who finds the expert | Student chooses from competing offers | Platform/admin triages & assigns |
| Speed to match | Student-paced | Fast, platform SLA |
| Price discovery | Bidding | Platform-set / pre-agreed |
| Commission (default) | 15% | 20% (platform does the routing & QA work) |
| Best for | Price-sensitive, browsing students | Urgent or specific needs |

Both models share one engine: **Request → Match → Order → Payment → Delivery → Review**, with the *match* step differing. This is the defining "hybrid" trait and the reason the domain model has a single `ServiceRequest` and a single `Order` pipeline (see [architecture/database.md](../architecture/database.md)).

## Personas

### Priya — the student (primary)
- University student; needs help understanding a topic, preparing for an exam, or getting structured guidance on coursework.
- Cares about: legitimacy, price transparency, speed, safety of payment, quality.
- Success: posts a request in <3 minutes, receives 3+ offers within 24h (open) or a matched expert within 24h (managed), pays only when the order starts, can request revisions.

### Daniel — the expert/tutor (supply)
- Graduate student, teacher, or professional with verified expertise.
- Cares about: steady flow of legitimate requests, no fee to join, secure payments (no chasing clients), clear rules, reputation building.
- Success: sends 5+ relevant offers/week, ≥60% offer→order conversion, payout within days of completion.

### Amna — the admin/owner (platform operator)
- Runs the platform; wants minimal fixed cost while ensuring quality and compliance.
- Cares about: expert vetting, managed-request triage, dispute fairness, fraud prevention, seeing money movement and KPIs.
- Success: clears the triage queue in <15 min/day, resolves disputes within 72h, zero payment surprises.

### (Optional) Support/moderator
- Staff role with limited admin permissions (see [user-roles.md](user-roles.md)); can hide content and handle first-line disputes, cannot touch payouts or refunds.

## Value propositions

- **For students:** safe escrow-style payment (money is captured but only released to the expert on approval), competitive pricing via bidding, managed option for zero-effort matching, academic-integrity-guarded service categories.
- **For experts:** free to join, vetted demand, secure guaranteed payouts, built-in messaging/delivery tooling, reputation that compounds.
- **For the owner:** one simple codebase, near-zero fixed infrastructure cost (see [operations/costs.md](../operations/costs.md)), and a model that adds supply (managed) *and* price discovery (open) without doubling the product.

## Success metrics (MVP)

| Metric | Target (90 days post-launch) |
|---|---|
| Registered students | 300+ |
| Approved experts | 25+ |
| Requests posted | 150+ |
| Request → order conversion (open) | ≥ 30% |
| Offer response time (median) | < 12h |
| Managed triage time (median) | < 24h |
| Order completion without dispute | ≥ 95% |
| Payment success rate | ≥ 95% |

## Non-goals (see also MVP scope)

- Native mobile apps (responsive web only in MVP)
- Live video tutoring/call infrastructure
- Multi-currency wallets for experts
- Content marketplace (selling documents/courses)

## Glossary

| Term | Meaning |
|---|---|
| **Request** | A student's posted need (single entity for both modes). See `ServiceRequest`. |
| **Offer / Bid** | An expert's priced proposal on an open-marketplace request. |
| **Invitation** | A managed-service broadcast of a request to the vetted expert pool. |
| **Direct assignment** | Admin assigning a specific expert to a managed request. |
| **Order** | The contract created once expert + terms + payment intent are agreed; carries delivery, revisions, review, dispute. |
| **Delivery** | Expert's work product submitted on an order. |
| **Commission** | Platform's cut, deducted from the order amount at payout time. |
| **Payout** | Transfer of the expert's earnings from the platform Stripe balance to the expert's connected account. |
| **Escrow (functional)** | Funds charged to the platform's Stripe account and held on its balance until order approval — implemented with Stripe's *separate charges & transfers*, not custom escrow. See [workflows/payments.md](../workflows/payments.md). |
