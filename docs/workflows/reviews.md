# Reviews & Ratings

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [order-lifecycle](order-lifecycle.md)

## Rules (BR-37..39)

- **Student → expert review**: only on `completed` orders, one per order. Rating 1–5 + optional sub-scores (quality, communication, timeliness) + text (≤2000 chars). Publishes immediately.
- **Expert reply**: one per review, ≤1000 chars, appears threaded under the review.
- **Expert → student rating**: 1–5, **private** (aggregates only, shown to admin; used for student-quality signals and admin mediation). Never public.
- Editable by author for 24h, then immutable. Deletion = hide via moderation (trace preserved).
- Reviews from refunded/cancelled orders: not possible.

## Aggregates

- `ExpertProfile` denormalized: `rating_avg`, `reviews_count`, `completed_orders_count` — updated in the same transaction as review publish/moderation.
- Public display rounds to 1 decimal; requires ≥3 reviews before showing a numeric score (else "New expert").

## Moderation

- Report button on any review (abuse/spam/false). Moderation queue → actions: dismiss, hide (unpublish), warn author. Hidden reviews excluded from aggregates; author notified with reason.
- Review-incentivization patterns (BR-38) are handled as integrity violations.

## API

- `GET /experts/{id}/reviews` — public, paginated, newest first.
- `POST /orders/{id}/review` — student participant, order completed, once.
- `POST /reviews/{id}/reply` — expert subject.
- `POST /reviews/{id}/report` — any authenticated user.
- Admin: moderation + hide via Django admin actions.
