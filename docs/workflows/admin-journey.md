# Admin / Owner Journey

> Status: ✅ Phase 10 implemented · Last updated: Phase 10 completion · Related: [user-roles](../product/user-roles.md), [observability](../architecture/observability.md)

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
    The Django admin add form collects only these inputs (request, expert, amount in minor units, optional deadline and scope note); the expert picker lists exactly the experts the service accepts (approved + available, labelled `expert:<slug>`). The name snapshot, currency, 24h expiry and deciding admin are set by `assign_direct` — never typed (Phase 11: the form used to require them and silently discard the values).
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

---

## Phase 10 — the operations portal (as-built intent, docs-first)

The portal upgrades exactly the workflows that benefit from a purpose-built surface; everything else stays in Django admin (ADR-0010). **Portal = read + moderate + configure; Django admin = resolve + triage.**

| Surface | Lives in | Why |
|---|---|---|
| KPI dashboard (marketplace/financial/quality/communication, date ranges) | `/portal` | cross-domain aggregates need a purpose-built dense view; Django admin changelists cannot aggregate |
| Moderation report queue (filter, review, dismiss, hide message) | `/portal/moderation` | Phase 9 `MessageReport` needs a working queue; actions are service-backed + audited |
| Dispute queue (open/under-review/awaiting triage view) | `/portal/disputes` | operational visibility + deep-link into the Django admin resolve form (money actions stay there) |
| Audit viewer (filter actor/action/object/time) | `/portal/audit` | read-only search over `audit.AuditLog`; append-only everywhere |
| Financial reconciliation (ledger identity, refunds vs ledger, payouts vs expert credit, failed webhooks) | `/portal/finance` | read-only consistency surface; repairs stay Django-admin service actions |
| Users/experts operational view (status, counts, links) | `/portal/users` | cross-object overview; edits stay in Django admin |
| Platform configuration | `/portal/config` | `core.PlatformConfig` singleton (introduced this phase — database.md planned it); service-validated, before/after audited, admin-only |
| Expert applications triage, managed-request triage, order force-actions, dispute **resolution** | **Django admin** (deep links) | already excellent permissioned CRUD+actions; duplication has no UX payoff (ADR-0010) |

**As-built (Phase 10 implementation):** every portal surface reads `/api/v1/ops/*` (staff-gated server-side: reads + moderation = `support|admin`, config writes = `admin` only). Moderation actions run `portal.services.moderation.review_report` → messaging's audited `set_message_hidden` (idempotent; closed reports raise `report_not_open`). Disputes are read-only here — the resolve button deep-links the Django admin change form that executes the Phase 9 service path. Reconciliation reuses `payments.ledger_check` semantics read-only; **no repair buttons** (fixes = existing Django-admin service actions). Config edits run `portal.services.config_editor.update_config` (whitelisted fields, bounds-checked, `platform.config_updated` audit row with before/after; `default_currency` immutable — ledger contract).

**Decisions recorded (Phase 10 kickoff):**
- `/portal/analytics` and `/portal/orders` from web-experiences.md are **consolidated**: analytics = `/portal` dashboard; order oversight deep-links to Django admin (documented in web-experiences.md).
- Charts: dependency-free inline SVG micro-visualizations (trend bars, distributions) instead of Recharts — the 220 kB app-route budget cannot absorb a chart library for two trend views; revisit only if a real dashboard need emerges (bundle-budget rule, design-system §Performance).
- KPI definitions live in `docs/architecture/observability.md` §KPI dictionary — every metric names its exact data source; no metric recomputes money outside ledger/payment tables.
- Date handling: all ranges evaluated **server-side in UTC** (`timezone.now()`-anchored); `today` = UTC calendar day; custom range inclusive of the start boundary, exclusive of the end (`[from, to)`).
- Moderation: report actions = `dismiss` / `confirm_hide` (hides the message via the existing messaging service + closes the report). **User warnings/suspensions are NOT built** — no suspension service exists in the architecture; adding one is a business-rule change deferred with a recorded decision (no arbitrary account actions from the portal).
