# Admin / Owner Journey

> Status: 📐 Phase 0 · Last updated: 2026-09-23 · Related: [user-roles](../product/user-roles.md), [dashboards](../platform/dashboards.md)

The admin back office is **Django Admin, customized** for MVP (ADR-0010): fast to build, free, permissioned, and already audited via `LogEntry`. Custom admin views are added only where workflows need more than CRUD. A dedicated admin SPA is explicitly post-MVP.

## Daily operating loop

### 1. Morning queue check (`/admin` home)
Custom admin dashboard shows counters: managed requests awaiting triage, expert applications pending, new reports, disputes open >24h, payouts `scheduled`, failed webhooks/payments. Each links to its filtered changelist.

### 2. Expert vetting
- `Experts → Applications (pending)`: review profile, credentials, ID document (secure file view, audited), subject fit.
- **Approve** (unlocks expert surfaces + email) / **Reject** with reason template. Notes field kept internal.
- Re-check `suspended` experts' appeals here.

### 3. Managed-request triage (SLA 24h, BR-19)
For each `in_review` request:
- Read brief + attachments; check integrity policy fit (BR-10..14); check budget vs platform price guidance.
- Actions (admin action bar + buttons):
  - **Approve → publish to pool**: sets `pooled`; system creates invitations for matching experts (BR-20).
  - **Approve → direct assignment**: pick expert, set price/deadline → creates `DirectAssignment` (expert has 24h to accept, BR-21).
  - **Reject** with reason → student emailed; request closed without charge.
- If the student's brief is unclear: message via system thread instead of rejecting.

### 4. Orders & money oversight
- `Orders` changelist: filter by status, overdue deliveries flagged red. Admin can: force-approve stuck deliveries (BR-25), cancel with refund (BR-26..28), amend order amount pre-payment.
- `Payments / Payouts / Refunds`: read-only views + deliberate action buttons (trigger payout run, issue refund) — each confirm-guarded and audited. Support role can **see** but not act.

### 5. Disputes (SLA 72h, BR-40/41)
- Open dispute: read order history, thread (audited access), evidence attachments.
- Contact both parties via dispute thread; document findings.
- **Resolve**: choose outcome (refund full / refund partial with amount / release to expert / split) → executes refund/transfer jobs, closes order state, notifies both, writes ledger entries + audit log.

### 6. Moderation
- Reports queue (messages, requests, reviews, users): view context, then dismiss / warn / hide content / suspend / ban (BR-13 ladder).
- Integrity reports from experts get priority flagging.

### 7. Money reconciliation (weekly, see payments doc §reconciliation)
- Stripe dashboard vs `LedgerEntry` totals; webhook failure list cleared; payout failures retried.

### 8. Configuration & KPIs
- `PlatformConfig`: commission rates, TTLs, limits — edited with change history.
- KPI dashboard (custom admin index): GMV, order count, take rate realized, conversion per funnel stage, open-queue ages, refund rate, active users. Implemented as read-only aggregate queries; no warehouse in MVP.

## Admin principles

- **Every money action is confirm-guarded, reason-prompted, audited** (BR-42).
- **Least privilege:** `support` group cannot touch payouts/refunds/config/user deletion (see matrix in user-roles).
- **No direct DB edits** in production; everything through admin actions so audits exist.
- Admin actions prefer *service-layer* calls (same code paths as the API), never ad-hoc object mutations — one business-logic implementation.
