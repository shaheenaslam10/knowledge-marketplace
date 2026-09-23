# Business Rules

> Status: 📐 Phase 0 · Last updated: 2026-09-23
> These rules are **canonical**. Each rule has an ID (BR-xx) referenced by code comments and tests. Changes to any rule require a doc update in the same phase.

## Accounts & eligibility

- **BR-01** One human = one account. Duplicate/multiple accounts are grounds for suspension. Email must be verified before posting requests, sending offers, or messaging.
- **BR-02** Minimum age 16 (with guardian consent statement at signup); experts must be 18+.
- **BR-03** Any registered user may act as a **student** (self-service onboarding — no approval gate). Acting as an **expert** requires an approved expert application (profile, ≥1 credential, 18+ + integrity attestations, admin screening). Application states: `draft → submitted → under_review → approved | rejected` (resubmittable) `; approved ⇄ suspended` — BR-03's original `pending` == `submitted`. See [workflows/expert-journey.md](../workflows/expert-journey.md).
- **BR-04** Experts set their own subjects/skills and can pause availability. Suspended/expert-status-revoked users keep student access but lose expert surfaces.
- **BR-05** Admins are provisioned manually (Django `createsuperuser` / admin) — never via public signup. Support staff get a limited-permission staff group.

## Requests

- **BR-06** A request must have: title (10–150 chars), description (≥50 chars), subject, mode (`open` | `managed`), budget (min ≤ max, ≥ platform minimum $5), and — for time-bound work — a deadline. A student may have at most **5 open (unmatched) requests** at once (anti-spam; configurable `max_open_requests`).
- **BR-07** Requests are editable by the owner while status is `draft`/`open`/`in_review` and no order exists; budget cannot decrease below the highest existing accepted-bound offer. After an order exists, the request is read-only and changes move to the order thread.
- **BR-08** A request expires (status `expired`) if unmatched after 30 days (`request_ttl_days`). Expired requests can be re-opened once by the student.
- **BR-09** Cancellation before matching is free and instant.

## Academic integrity (CRITICAL)

The platform may be used for help with academic work. The following distinction is **product-enforced**, not just legal text.

### Permitted (platform-supported)
- Tutoring and 1:1 teaching on any topic
- Explaining concepts, worked examples, practice problems
- Feedback, coaching and editing guidance on a student's *own draft* (structure, argument, grammar — with explanations)
- Study plans, exam prep, mentorship, review sessions
- Help understanding an assignment's requirements

### Prohibited
- Producing graded coursework **to be submitted as the student's own work** (essays, theses, problem sets, code assignments, lab reports)
- Taking exams/quizzes or completing graded assessments on the student's behalf
- Impersonation of a student in any academic setting
- Work for which the expert's deliverable is the *final submitted artifact* with no learning component

### Enforcement mechanics (built in MVP)
- **BR-10** Every request creation flow requires the student to (a) pick a category from [Permitted list], and (b) tick an attestation: *"This request is for learning support. I will not submit an expert's work as my own graded coursework and I have read the Academic Integrity Policy."* The attestation version and timestamp are stored on the request.
- **BR-11** Experts may **decline or report any request** they judge to violate the policy (one-click "Report integrity concern" on request/offers screens). Reports land in the admin moderation queue and auto-pause the request.
- **BR-12** Verified categories constrain deliverables: e.g. category `assignment_guidance` requires the delivery description to reference feedback/explanations. This is a soft check (guidance text + review prompt), documented as such.
- **BR-13** Penalties ladder: warning → request removal → expert/student suspension (30 days) → permanent ban. All actions are recorded in the audit log. Repeat integrity offenses = permanent ban.
- **BR-14** The public Terms of Service include the full Academic Integrity Policy; onboarding for both roles requires acceptance. Tutors receive explicit guidelines ("You are a teacher, not a ghostwriter").

## Bidding & offers

- **BR-15** One offer per expert per request (editable while `pending`). Offer = amount + proposed schedule/timeline + message. Offers expire with the request or after 14 days (`offer_ttl_days`), whichever is first.
- **BR-16** Experts can withdraw a pending offer anytime. Students can decline offers (with optional reason). Accepting an offer locks the request and creates the order in `awaiting_payment`.
- **BR-17** Experts see the student's gross budget range and their net after commission before sending an offer.
- **BR-18** Offers below the platform minimum are rejected by validation.

## Managed service

- **BR-19** Managed requests enter `in_review`. Admin triage SLA: **24h**. Outcomes: approve→pool broadcast, approve→direct assignment, or reject (with reason emailed to student; no charge ever made before assignment acceptance).
- **BR-20** Pool broadcast invites all experts matching the subject; experts accept/decline the invitation; the **first expert to accept** (or admin's pick among acceptors) wins. Invitation window: 48h default (`invitation_ttl_hours`), then admin re-broadcasts or rejects.
- **BR-21** Direct assignment proposes terms (expert, amount, deadline) to the expert, who has **24h** to accept before it expires (`assignment_ttl_hours`). On acceptance the order is created in `awaiting_payment`; the student is notified and pays to start.
- **BR-22** Managed pricing is set by admin (from platform price guidance per subject); students see a quote before any charge.

## Orders, delivery, revisions

- **BR-23** An order starts only after successful payment (`awaiting_payment → active`). Work done before payment is at the expert's risk and not guaranteed.
- **BR-24** Delivery: expert uploads deliverable + summary. Student then approves, requests a revision, or does nothing (auto-approval after **72h**, `delivery_auto_approve_hours`). Max revisions: 2 open / 3 managed (BR config). Extra revisions require admin-approved order amendment.
- **BR-25** Approval triggers: (1) student clicks approve, (2) auto-approval timer, (3) admin force-approve in a dispute. On approval → expert payout is scheduled; order → `completed`.
- **BR-26** Cancellation windows: student may cancel free while `awaiting_payment`. After payment: cancellation requires either mutual agreement or dispute resolution (see BR-27/BR-28). If the expert fails to deliver by the deadline + 24h grace, the student may cancel for a **full refund** (expert-fault cancellation).
- **BR-27** No-show rule: if the expert neither delivers nor responds within 72h of an admin warning, admin cancels with full refund and penalties apply.
- **BR-28** Student-fault cancellation after payment (student disappears / changes mind): admin may cancel with refund minus Stripe fees, or partial refund; expert is compensated for verifiable completed work where possible.

## Payments, payouts, refunds

- **BR-29** All charges flow through the configured payment gateway (Stripe Connect "separate charges & transfers" is primary). **The platform never implements custom escrow**; holding funds = Stripe balance. See [workflows/payments.md](../workflows/payments.md).
- **BR-30** Expert payout occurs after order completion (approval) subject to: payout minimum ($10), no open dispute on the order, and expert's connected account being enabled. Payouts are executed by a background job on a rolling basis (target: within 24h of eligibility).
- **BR-31** Refunds are issued only via: dispute resolution, expert-fault cancellation, admin decision, or Stripe defined cases. Partial refunds must record a reason and are reflected proportionally in commission (see refund matrix in payments doc).
- **BR-32** Every money movement writes an immutable `LedgerEntry`. Ledger tables are append-only; corrections are new entries, never edits.
- **BR-33** Webhook processing is idempotent (deduped by Stripe event ID) and is the *only* way payment states change in production — never from frontend callbacks alone.

## Communication & conduct

- **BR-34** All order/request communication stays on-platform while an order is active. Moving payment off-platform is prohibited and is a bannable offense for both parties. (MVP: policy + report button + moderation; automated contact-info detection is post-MVP.)
- **BR-35** Be civil. Harassment, discrimination, doxxing = immediate suspension. Messaging content is not proactively read by the platform; moderation is report-driven + metadata-based (flag counts, attachments), respecting privacy. Admin can view message threads only for accounts involved in an open dispute or formal report (audited action).
- **BR-36** Files exchanged are private to order/request participants + platform admins. Screenshots of private chats used publicly = policy violation.

## Reviews & reputation

- **BR-37** Only the student can review the expert, and only on a completed order; expert may reply once and rate the student (private aggregate). Reviews publish on completion; both sides may hide-appeal via moderation.
- **BR-38** Rating manipulation (self-reviews, coerced reviews, review trading) is prohibited; detected patterns → review removal + penalties.
- **BR-39** Expert public rating = weighted average (recent orders weigh more) of published reviews; shown on profile and offers.

## Disputes

- **BR-40** Either party may open a dispute while the order is `active`/`delivered`/`revision_requested`, or within **7 days** of completion. Opening a dispute freezes the payout for that order.
- **BR-41** Admin resolves disputes within **72h** target. Outcomes: full refund to student, partial refund, release to expert, or split. All outcomes are executed via refund/transfer jobs and recorded in the ledger. See [workflows/disputes.md](../workflows/disputes.md).

## Platform operations

- **BR-42** Every admin action on money, users, requests, orders, disputes writes an `AuditLog` entry (actor, before/after, IP). Audit logs are read-only.
- **BR-43** Platform configuration (commission rates, TTLs, limits) lives in `PlatformConfig`, is admin-editable, cache-invalidated, and never hard-coded in business logic.
