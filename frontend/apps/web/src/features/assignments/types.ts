/** Managed assignments: pool invitations + direct assignments (managed-service.md). */

export type AssignmentStatus = "pending" | "accepted" | "declined" | "expired" | "superseded";

export interface PoolInvitation {
  id: string;
  request: string;
  request_title: string;
  request_subject: string | null;
  request_budget_max: number | null;
  quote_amount_display: number | null;
  status: AssignmentStatus;
  expected_amount: number | null;
  decline_reason: string;
  expires_at: string;
  created_at: string;
}

export interface DirectAssignment {
  id: string;
  request: string;
  request_title: string;
  request_subject: string | null;
  amount_display: number;
  currency: string;
  deadline: string | null;
  scope_note: string;
  status: AssignmentStatus;
  decline_reason: string;
  expires_at: string;
  created_at: string;
}

export const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  pending: "info",
  accepted: "success",
  declined: "neutral",
  expired: "warning",
  superseded: "neutral",
};

export const ASSIGNMENT_STATUS_COPY: Record<AssignmentStatus, string> = {
  pending: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  superseded: "Superseded",
};

export function isRespondable(status: AssignmentStatus): boolean {
  return status === "pending";
}
