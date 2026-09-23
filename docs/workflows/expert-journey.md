# Expert (Tutor) Journey

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [open-marketplace](open-marketplace.md), [managed-service](managed-service.md), [order-lifecycle](order-lifecycle.md)

## 1. Application & approval (BR-03)

1. Any logged-in user applies at `/expert/onboarding`:
   - Professional headline, bio, years of experience
   - Subjects + skills (from taxonomy; request new subject via form)
   - Credentials: education, certifications, links (portfolio/LinkedIn)
   - Verification document upload (ID / degree — private, admin-only access)
   - Preferred availability & timezone
   - Acceptance of Expert Guidelines (**teacher, not ghostwriter** — integrity policy explicit) + payout country notice
2. Status `pending`; email confirmation. Application is editable while pending.
3. Admin reviews (see [admin-journey](admin-journey.md)): approve / reject with reason (emailed). Typical SLA 48h.
4. `approved` → expert surfaces unlock. `suspended` (later, for violations) hides all expert surfaces but preserves order obligations.

## 2. Finding work

Three streams surface opportunities:

1. **Open marketplace board** (`/expert/opportunities`): open requests filtered by the expert's subjects, with search, budget/deadline filters, saved filters, and a "new matching request" realtime badge.
2. **Managed invitations** (`/expert/invitations`): requests broadcast by the platform (accept/decline within TTL, first-accept wins among qualified).
3. **Direct assignments**: admin-proposed terms → accept within 24h or decline (declining frequently lowers future assignment priority — soft rule, documented not automated in MVP).

## 3. Bidding (offers)

- Offer = price + timeline/session proposal + personal message. One editable offer per request (BR-15). Validation enforces minimum; UI shows **net earnings after commission** before submit (BR-17).
- Offer states: `pending → accepted | declined | withdrawn | expired`.
- Tips surfaced in-product: personalized first line, relevant credentials, price competitiveness indicator (vs request budget).

## 4. Winning & order start

- **Open:** student accepts offer → order `awaiting_payment`. Expert sees "Awaiting student payment — do not start work."
- **Managed pool:** invitation accepted first → order `awaiting_payment`.
- **Managed direct:** assignment accepted → order `awaiting_payment`.
- Payment success → order `active`; both parties notified; chat thread opens (if not already).

## 5. Doing the work

- Order workspace: scope, deadline countdown, attachments, chat, delivery button.
- Expert delivers: summary text + deliverable files (allowed types per [files](files.md)).
- If student requests a revision: clear list of requested changes; expert re-delivers (revision counter visible). Experts can push back via thread or dispute if scope creep (BR: revisions are for the agreed scope).

## 6. Getting paid

- On approval/completion: earnings record appears in `/expert/earnings` (`pending` while auto-approval window runs, then `available`).
- Payout job batches available earnings ≥ $10 into Stripe transfers to the expert's connected account (onboarded via Stripe Connect Express onboarding link — identity/tax handled by Stripe, status shown in `/expert/payouts`).
- In manual-gateway mode: payout list shows `scheduled` → admin marks `paid` with a reference after external bank/JazzCash transfer.
- Earnings page shows per-order gross, commission, net — full transparency.

## 7. Reputation & standing

- Completed orders + published reviews build public rating (BR-37..39).
- Expert can reply once to any review; can report abusive reviews.
- Stats on dashboard: response rate, acceptance rate, completion rate, rating trend.

## Expert obligations & guardrails

| Rule | Enforcement |
|---|---|
| Never accept off-platform payment (BR-34) | Policy + report-driven moderation; bannable |
| Deliver within agreed timeline or proactively renegotiate | Deadline warnings at T-24h; no-show rule BR-27 |
| Integrity policy: teaching, not ghostwriting (BR-10..14) | Guidelines at onboarding; one-click report on requests; refusal is protected |
| Communicate in-platform during orders (BR-34) | Thread is the default surface; external contact discouraged |
| Keep tax/identity details current in Stripe onboarding | Payout blocked with clear status until enabled |

## Expert emotional checkpoints

| Moment | Requirement |
|---|---|
| Application | Status always visible; rejection includes reason |
| Bidding | Fast board, good filters, net-earnings clarity |
| Waiting on payment | Explicit "awaiting payment" state, auto-nudge to student after 24h |
| Revision request | Exact requested changes, no ambiguity |
| Payout | Predictable schedule, per-order breakdown, Stripe status visibility |
