/**
 * Disputes domain types (Phase 9) — mirror apps/disputes/api/views.py payloads
 * and the documented reason enum (docs/workflows/disputes.md, BR-40/41).
 */

export type DisputeStatus = "open" | "under_review" | "awaiting_response" | "resolved" | "closed";

export type DisputeOutcome =
  | "refund_student_full"
  | "refund_student_partial"
  | "release_expert"
  | "split"
  | "no_fault_close"
  | "";

export interface DisputeEvidenceRef {
  id: string;
  original_name: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  order_number: string;
  opened_by: number;
  reason: string;
  reason_display: string;
  description: string;
  status: DisputeStatus;
  outcome: DisputeOutcome;
  resolution_notes: string;
  created_at: string;
  resolved_at: string | null;
  thread: string | null;
  evidence: DisputeEvidenceRef[];
}

/** The documented, openable dispute reasons (server re-validates — BR-40).
 * Mirrors apps/disputes/models.py Dispute.Reason exactly. */
export const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "quality_below_expectations", label: "Quality below expectations" },
  { value: "expert_unresponsive", label: "Expert unresponsive" },
  { value: "deadline_missed", label: "Deadline missed" },
  { value: "scope_disagreement", label: "Scope disagreement" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "integrity_concern", label: "Academic integrity concern" },
  { value: "other", label: "Other" },
];

export const DISPUTE_STATUS_COPY: Record<DisputeStatus, string> = {
  open: "Open — awaiting review",
  under_review: "Under review",
  awaiting_response: "Awaiting response",
  resolved: "Resolved",
  closed: "Closed",
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "warning",
  under_review: "info",
  awaiting_response: "info",
  resolved: "success",
  closed: "neutral",
};

export const DISPUTE_OUTCOME_COPY: Record<Exclude<DisputeOutcome, "">, string> = {
  refund_student_full: "Refunded to the student",
  refund_student_partial: "Partially refunded to the student",
  release_expert: "Released to the expert",
  split: "Split between student and expert",
  no_fault_close: "Closed without fault",
};

/** Order statuses where the dispute window is open (BR-40; server re-checks). */
export const DISPUTE_WINDOW_STATUSES = ["active", "delivered", "revision_requested", "completed"] as const;

export function canOpenDispute(orderStatus: string): boolean {
  return (DISPUTE_WINDOW_STATUSES as readonly string[]).includes(orderStatus);
}

export const MIN_DESCRIPTION_CHARS = 20;
export const MAX_DESCRIPTION_CHARS = 5000;
