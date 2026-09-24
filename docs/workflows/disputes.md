# Disputes

> Status: ✅ Phase 9 · Last updated: Phase 9 completion · Related: [payments](payments.md), [order-lifecycle](order-lifecycle.md), [messaging](messaging.md)

## Principles

- Disputes are **admin-mediated** in MVP (no arbitration marketplace). SLA: first response 24h, resolution 72h (BR-40/41).
- Opening a dispute **freezes the order's payout** and stops the auto-approve timer.
- All money outcomes **reuse the Phase 7 payment/refund/ledger services** (`payments.issue_refund`, payout scheduling/settlement) — dispute code never writes ledger rows directly. The ledger identity `charge + refund == commission + expert_credit + fee` must keep holding after every outcome (nightly `payments.ledger_check` verifies).

## Who can open & when (BR-40, implemented)

- Student or expert (participant of the order) — while the order is `active`, `delivered`, `revision_requested`, or within **7 days** after `completed`. Outside the window or for other statuses → rejected (`dispute_window_closed`).
- **One dispute per order** (model-level 1-1; a resolved dispute is never reopened — new evidence goes through support).
- Opened from the order page: reason enum (`quality_below_expectations`, `expert_unresponsive`, `deadline_missed`, `scope_disagreement`, `payment_issue`, `integrity_concern`, `other`), description (≥20 chars), optional evidence attachments (purpose `dispute_evidence`, upload-first).
- Opening is transactional: dispute row + `order.has_open_dispute` flag + order `disputed` (prior status stored) + dispute thread created + audit row — all or nothing.

## Payout freeze (implemented)

- `Order.has_open_dispute` (denormalized flag, single writer = the dispute service, same transaction) is checked by:
  - `payments.schedule_payout` → returns None (rolls forward) while a dispute is open;
  - `payments.settle_payout` → raises `payout_frozen` while a dispute is open;
  - `payments.payout_sweeper` → excludes flagged orders.
- **Race safety:** both `open_dispute` and `settle_payout` take `select_for_update` on the ORDER row first, so dispute-open vs payout-settle are serialized. The ledger stays correct either way: a post-payout full refund books a negative `expert_credit` (documented admin-recovery path, BR-31 matrix).
- Resolution lifts or adjusts the freeze per outcome (below). Duplicate open/close is idempotent-guarded.

## Lifecycle (implemented — state machine in `apps/disputes/services.py`)

```text
open ──(admin takes case)──► under_review ──(admin decision executed)──► resolved ──(funds settled + parties notified)──► closed
  └──(admin waits on counterparty)──► awaiting_response ──► under_review
```

- Only participants can view a dispute (REST + admin); all transitions run through services with `select_for_update` + status re-checks; every transition writes an audit row.
- `resolved` requires `outcome` + `resolution_notes`; `closed` is the terminal state (no transitions out).

## Outcomes (BR-41) — executed by the admin resolve action

| Outcome | Money execution (existing services) | Order ends as |
|---|---|---|
| `refund_student_full` | `payments.issue_refund` for the full refundable balance | `cancelled` |
| `refund_student_partial` | `payments.issue_refund` (admin-entered amount ≤ refundable); remainder stays as expert credit | `completed` |
| `release_expert` | no refund; freeze lifted; payout scheduled/settleable again | `completed` |
| `split` | `payments.issue_refund` (student share); remainder to expert credit | `completed` |
| `no_fault_close` | no money movement; freeze lifted | back to the stored prior status |

Every outcome: ledger entries via the refund/payout services, both parties notified (funnel: `dispute_resolved`), audit log with rationale. A scheduled-but-unpaid payout on a fully-refunded order is marked failed (`dispute_refund` reason). Integrity-flagged reasons additionally note moderation routing (queue = Phase 10).

## Surfaces

- Student/expert: dispute panel on the order workspace (open, status, evidence, resolution notes) + the **dispute thread** (messaging context `dispute`, same WS + REST fallback architecture; participants = the order's student + expert).
- Admin: Django admin actions — take case, await response, resume review, resolve (outcome + notes + amounts), close; audited thread view (`messaging.admin_view_thread`, BR-35) is unlocked by an open dispute on the related order or an open message report.

## Retention / fraud guidance

See [payments.md](payments.md) for post-payout refund edge cases. Fraud patterns (admin guidance): repeated refund-seeking after full delivery; off-platform payment demands mid-order; first-delivery-late-then-dispute loops; collusion self-dealing reviews. Admin notes are internal-only.
