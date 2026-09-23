# Expert (Tutor) Journey

> Status: ✅ Phase 3 implemented (application, approval, directory) · Last updated: Phase 3 · Related: [open-marketplace](open-marketplace.md), [managed-service](managed-service.md), [order-lifecycle](order-lifecycle.md)

## 1. Application & approval (BR-03) — ✅ implemented (Phase 3)

Role onboarding is **separate per role** (ADR-0011): students self-serve, experts apply and get reviewed, admins are provisioned only via management. A registered user never becomes an expert automatically.

**Exact state machine** (`ExpertApplication.status`; `not_applied` = no application row):

```text
not_applied ──apply──► draft ──submit──► submitted ──start_review──► under_review
                          ▲                                    │            │
                          └────── resubmit ── rejected ◄──reject─┘            approve
                                                                       │            │
                                                            (edit + resubmit)   approved ⇄ suspended
```

| Transition | Actor | Rules |
|---|---|---|
| apply (create) | user | one application per user; starts as `draft` |
| edit | user | allowed in `draft` / `submitted` / `rejected`; **locked** in `under_review`+ |
| submit | user | requires verified email, 18+ attestation, integrity acknowledgment, complete profile, **≥1 credential file**; `rejected → submitted` increments `resubmission_count` |
| start_review | staff | `submitted → under_review` (audited) |
| approve | staff | `under_review → approved`; creates/activates the **ExpertProfile** (public object), registers the `expert` role, audited + emailed |
| reject | staff | `under_review → rejected` with mandatory reason (emailed, shown to applicant) |
| suspend | staff | `approved → suspended` — hidden from directory, `expert` role off, **student access kept** (BR-04); audited |
| reinstate | staff | `suspended → approved` (audited) |

Model separation: **User** (identity) → **ExpertApplication** (review artifact: content, credentials, state, reviewer/timestamps) → **ExpertProfile** (live public profile, exists only after approval; suspension hides it without deleting).

1. Application content: professional/display name, headline, bio/expertise description, expertise summary, years of experience, qualifications, languages, timezone, availability note, subjects + skills (from the shared taxonomy), credentials (private files, reviewer-only).
2. Attestations at submit: **18+ (BR-02)** and the integrity acknowledgment — *"You are a teacher, not a ghostwriter"* (BR-14, academic-integrity boundary).
3. Admin reviews via Django admin actions (`start_review` / `approve` / `reject` / `suspend` / `reinstate`) — every action calls the service layer, writes an audit row, and emails the applicant. Typical SLA 48h.
4. `approved` → expert surfaces unlock (role dict `expert: true`, directory listing). `suspended` hides all expert surfaces but preserves the account and future order obligations (BR-04).

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
