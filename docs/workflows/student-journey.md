# Student Journey

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [open-marketplace](open-marketplace.md), [managed-service](managed-service.md), [order-lifecycle](order-lifecycle.md)

## 1. Registration & login

1. Student registers with email + password (+ name). Passwords: Argon2 hashing, min 10 chars (see [security](../architecture/security.md)).
2. Verification email sent via background job. Until verified: can browse public pages only (read-only).
3. Verify via emailed link (single-use token, 24h expiry). Account becomes active student.
4. Login: sets httpOnly JWT session cookies. Optional "remember me" extends refresh lifetime.
5. Password reset: emailed single-use token, invalidates all existing refresh tokens.
6. Profile completion (optional but nudged): institution, country, timezone, avatar.

## 2. Posting a request

Student chooses a mode up-front (they can browse both explanations on `/how-it-works`):

- **Open marketplace** — "Get offers from experts"
- **Managed service** — "Let the platform find the right expert"

Request form (either mode): title, description (rich guidance text + integrity attestation BR-10), category (tutoring session / concept coaching / assignment guidance / exam prep / mentorship / other), subject, tags, budget range (with subject-based guidance), pricing type (fixed/hourly), deadline, preferred schedule, attachments (≤8 files, rules in [files](files.md)).

Managed mode adds: contact preference, urgency, and any constraints the student wants the platform to know.

Post-submission states: open mode → `open` (visible to experts immediately); managed → `in_review` (student sees "Pending platform review — you'll hear within 24h").

## 3. Open marketplace: receiving & comparing offers

- Student dashboard shows offers arriving (realtime toast + email digest option).
- Each offer card: expert mini-profile (avatar, rating, completed orders, subjects), price, proposed timeline/schedule, message, expert's net-earnings-free view for the student (student sees gross only).
- Actions per offer: **Accept**, **Decline** (optional reason), or open a **message thread** (allowed pre-order for this request).
- Student can also message experts to clarify before deciding.
- Accepting an offer: locks the request (no further offers accepted), creates the **order** in `awaiting_payment`, notifies the expert.

## 4. Managed service: triage & assignment

- Student waits (SLA 24h). Possible outcomes:
  - **Approved → pooled:** request broadcast to vetted experts; student informed. From here it behaves like the open flow (offers/invitations converge to an order).
  - **Approved → direct assignment:** platform quotes a price & expert; student sees the quote screen and must **confirm (pay)** or decline. If the assigned expert declines, admin re-assigns or re-quotes.
  - **Rejected:** with reason + refund-free (nothing was charged). Student may re-post.
- In all approved paths the student ends up on an order in `awaiting_payment`.

## 5. Paying & tracking the order

- Order page (`awaiting_payment`): summary, agreed scope, price, deadline → **Pay now** (Stripe Elements sheet; card data never touches our servers). On success → `active`. Manual-gateway mode: shows transfer instructions + "I have paid" reference form; admin confirms.
- Order timeline shows every state change; student sees delivery due countdown.
- While `active`: chat with the expert, add attachments, see status.

## 6. Delivery, revision, approval

- Delivery arrives → notification; student reviews files in-browser (secure view) and either:
  - **Approve** → order `completed`, review prompt appears, expert payout scheduled;
  - **Request revision** (≤ included limit) → `revision_requested`, expert re-delivers;
  - Do nothing → auto-approves after 72h (visible countdown; BR-24).
- Revisions exhausted: student may open a **dispute** or accept.

## 7. Cancellation & refunds

- Before payment: self-service cancel (BR-09/26).
- After payment: request cancellation → mutual agreement or dispute (BR-26..28). Refunds arrive via original payment method; status visible on the order.

## 8. Review & re-engagement

- On completion: rate 1–5 + text + sub-scores; publishes immediately (moderation may hide later). Can be edited for 24h, then immutable.
- Dashboard surfaces: active orders, expiring deadlines, re-order shortcut ("Book {expert} again" creates a prefilled request in managed mode).

## Student emotional checkpoints (UX requirements)

| Moment | Requirement |
|---|---|
| After posting | Immediate confirmation + clear "what happens next" per mode |
| Waiting (managed) | Visible SLA + admin activity indicator; no silent black hole |
| Paying | Trust signals: escrow explanation ("money held until you approve"), secure badge, exact amount |
| After delivery | Clear approve / revision choice with consequences |
| Dispute | Human message within 24h; visible status |
