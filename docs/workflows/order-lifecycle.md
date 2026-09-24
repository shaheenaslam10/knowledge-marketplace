# Order Lifecycle — Delivery, Revisions, Completion, Cancellation

> Status: ✅ **Phase 6 implemented** · Last updated: 2026-09-24 · Related: [payments](payments.md), [disputes](disputes.md)
>
> **Implementation deltas (Phase 6):** shipped on the ONE Order model via `orders.services` (the ADR-0015 factory `create_order_for_request` is untouched and still the only creation path). Every transition is server-side — `select_for_update` row locks, illegal transitions raise 409 `invalid_transition`, amounts are immutable after payment. `mark_paid` is the Phase 7 payment seam (staff-only manual confirmation as of Phase 6; Phase 7 has since added the gateway confirm path — student pay, dev-confirm, admin action, signed webhooks — see [payments](payments.md)). The workspace timeline renders the persisted `OrderEvent` log and nothing else; one administrative event type joins the flow events: `deadline_reminded` (dedupes the T-24h expert email). Jobs: `orders.auto_approve_deliveries` (15 min), `orders.awaiting_payment_sweeper` (hourly) and `orders.deadline_reminder` (hourly) are implemented as idempotent django-q2 tasks — creating the schedule entries is ops setup via the Django admin, same convention as assignments expiry; `orders.auto_cancel_overdue` (BR-26 flagging) is deferred to Phase 9, where disputes/admin journeys own that flow. Deadline *proposal via chat* is a Phase 8 surface; until then only support/admin changes deadlines. API lives at `/api/v1/me/orders` (see [api.md](../architecture/api.md)); the UI is the shared `/orders` list + `/orders/[id]` workspace for both roles and all three sources.

The `Order` is the single contract between student and expert, regardless of match source (`open_bid` | `managed_pool` | `managed_direct`). It snapshots: parties, request reference, scope (title + description ref), agreed amount, commission rate, deadline, revision allowance.

## State machine

```mermaid
stateDiagram-v2
    [*] --> pending_acceptance: direct assignment accepted later? no—<br/>created already accepted
    [*] --> awaiting_payment: order created (all sources)
    awaiting_payment --> active: payment succeeded
    awaiting_payment --> cancelled: unpaid 72h (BR-22) or student cancels
    active --> delivered: expert delivers
    delivered --> revision_requested: student requests revision
    revision_requested --> delivered: expert re-delivers
    delivered --> completed: student approves / auto-approve 72h / admin force
    active --> disputed: student opens dispute
    delivered --> disputed
    revision_requested --> disputed
    disputed --> completed: resolution (release/split)
    disputed --> cancelled: resolution (refund)
    active --> cancelled: mutual/admin cancel (+refund rules)
    delivered --> cancelled: mutual/admin cancel (+refund rules)
    completed --> [*]
    cancelled --> [*]
```

`pending_acceptance` exists only in the `DirectAssignment` state, not on the order — orders are created already accepted (keeps one order state machine; assignment acceptance precedes creation).

## Stage details

### awaiting_payment
- Student sees Pay button (Stripe Elements) or manual instructions (manual-gateway mode).
- Auto-cancel after 72h unpaid; expert auto-reminded after 24h. No work is expected (BR-23).

### active
- Deadline countdown visible to both. T-24h warning to expert (job).
- Either party can open the chat thread; files can be exchanged (purpose `order_attachment`).
- Late-delivery path: expert may propose new deadline in thread; student accepting (UI action) extends `deadline` — recorded in audit.

### delivered → revision loop (BR-24)
- `Delivery` record: summary + files + `revision_number` (0 = initial).
- Student response: approve / request revision (with required change list) / open dispute.
- Auto-approval: job checks deliveries with no student action for 72h → approve (BR-24). Countdown visible.
- Revision limit: `revisions_included` (2 open / 3 managed). When exhausted, the revision button hides; options: approve, dispute, or admin amendment.

### completed
- Triggers (BR-25): student approve · auto-approve · admin force-approve (dispute).
- Effects: payout scheduled (payments doc), review window opens, request → `completed`, both notified.

### cancelled
- Paths per BR-26..28: pre-payment (free), expert-fault (full refund), mutual, student-fault (admin decides refund net of fees / partial / none-with-compensation), admin intervention.
- Cancellation records `cancelled_by`, `cancellation_reason` (enum), refund linkage.

### disputed
- Payout frozen; state machine of its own — see [disputes](disputes.md).

## Timers & background jobs (all DB-queue driven)

| Job | Schedule | Effect | Status |
|---|---|---|---|
| `orders.auto_approve_deliveries` | every 15 min | approve delivered orders past 72h | ✅ task shipped (Phase 6); schedule = ops setup |
| `orders.awaiting_payment_sweeper` | hourly | cancel unpaid >72h | ✅ task shipped (Phase 6); schedule = ops setup |
| `orders.deadline_reminder` | hourly | T-24h expert warning | ✅ task shipped (Phase 6), idempotent via `deadline_reminded` event |
| `orders.auto_cancel_overdue` | daily | flag overdue >24h grace for admin/student action (BR-26) | ⏳ Phase 9 (disputes/admin tooling) |

## Concurrency & integrity rules

- All transitions go through the `orders.services` layer with `select_for_update` on the order row — double-approve/double-cancel is impossible.
- State transitions are validated (illegal transitions raise 409) and emit domain events (notifications + audit).
- Amount fields are immutable post-payment; amendments require admin and are ledger-visible.
