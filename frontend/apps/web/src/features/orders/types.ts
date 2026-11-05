/** Order domain types + workspace lifecycle helpers (order-lifecycle.md). */

export type OrderStatus =
  | "awaiting_payment"
  | "active"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "cancelled"
  | "disputed";

export type OrderSource = "open_bid" | "managed_pool" | "managed_direct";

export interface OrderListItem {
  id: string;
  number: string;
  status: OrderStatus;
  source: OrderSource;
  request_title: string;
  amount_display: number;
  role: "student" | "expert";
  created_at: string;
}

export interface DeliveryAttachment {
  id: string;
  original_name: string;
  size: number;
  content_type: string;
  download_url?: string | null;
}

export interface DeliveryRecord {
  id: string;
  revision_number: number;
  version_label?: string;
  summary: string;
  status: "submitted" | "approved" | "revision_requested";
  submitted_at: string | null;
  approved_at: string | null;
  approval_source: string;
  student_revision_note?: string | null;
  is_latest?: boolean;
  attachments: DeliveryAttachment[];
}

export interface DeadlineProposalRecord {
  id: number;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  proposed_due_at: string;
  proposed_by_id: number;
  proposed_by_role: "student" | "expert";
  note: string;
  delta_hours?: number | null;
  created_at: string;
}

export interface OrderEventRecord {
  event_type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export interface PaymentInfo {
  id: string;
  gateway: string;
  status: "pending" | "requires_action" | "processing" | "succeeded" | "failed" | "canceled" | "refunded" | "partially_refunded";
  amount_minor: number;
  amount_display: number;
  currency: string;
  refunded_display: number;
  failure_reason: string;
  paid_at: string | null;
  simulated: boolean;
  instructions?: string;
  dev_self_confirm?: boolean;
}

export const PAYMENT_STATUS_COPY: Record<PaymentInfo["status"], string> = {
  pending: "Awaiting payment",
  requires_action: "Action required",
  processing: "Processing",
  succeeded: "Paid",
  failed: "Payment failed — retry available",
  canceled: "Payment canceled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export interface LiveSessionRecord {
  id: number;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  scratchpad_content: string;
  created_by?: {
    id: number | null;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

export interface LiveSessionPayload {
  active_session: LiveSessionRecord | null;
  recent_sessions: LiveSessionRecord[];
}

export interface OrderDetail extends OrderListItem {
  request_id: string;
  request_category: string;
  role: "student" | "expert";
  counterparty: string;
  expert_amount_display: number;
  commission_display: number;
  currency: string;
  deadline: string | null;
  delivery_due_at?: string | null;
  revisions_allowed: number;
  revisions_used: number;
  auto_approve_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  events: OrderEventRecord[];
  deliveries: DeliveryRecord[];
  deadline_proposal?: DeadlineProposalRecord | null;
  live_session?: LiveSessionPayload | null;
  payment: PaymentInfo | null;
}

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  awaiting_payment: "warning",
  active: "info",
  delivered: "info",
  revision_requested: "warning",
  completed: "success",
  cancelled: "neutral",
  disputed: "danger",
};

export const ORDER_STATUS_COPY: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  active: "In progress",
  delivered: "Delivered — review due",
  revision_requested: "Revision requested",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export const SOURCE_COPY: Record<OrderSource, string> = {
  open_bid: "Open marketplace",
  managed_pool: "Managed (pool)",
  managed_direct: "Managed (direct)",
};

/** The workspace's allowed actions per role + status (server re-validates everything). */
export function workspaceActions(order: Pick<OrderDetail, "status" | "role" | "revisions_used" | "revisions_allowed">) {
  const actions: { key: string; label: string; tone?: "primary" | "secondary" | "ghost" }[] = [];
  if (order.status === "awaiting_payment") {
    actions.push({ key: "pay", label: "Pay now", tone: "primary" });
    if (order.role === "student") actions.push({ key: "cancel", label: "Cancel order", tone: "ghost" });
  }
  if (order.status === "active" && order.role === "expert") {
    actions.push({ key: "deliver", label: "Submit delivery", tone: "primary" });
  }
  if (order.status === "delivered" && order.role === "student") {
    actions.push({ key: "approve", label: "Approve delivery", tone: "primary" });
    if (order.revisions_used < order.revisions_allowed) {
      actions.push({ key: "revise", label: "Request revision" });
    }
  }
  return actions;
}

/** Progress steps for the connected timeline visualization. */
export function progressStep(status: OrderStatus): number {
  switch (status) {
    case "awaiting_payment":
      return 0;
    case "active":
      return 1;
    case "delivered":
    case "revision_requested":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

export const EVENT_COPY: Record<string, string> = {
  created: "Order created",
  payment_confirmed: "Payment confirmed",
  delivered: "Work delivered",
  revision_requested: "Revision requested",
  redelivered: "Revision delivered",
  approved: "Delivery approved",
  auto_approved: "Auto-approved (72h elapsed)",
  completed: "Order completed",
  cancelled: "Order cancelled",
  dispute_opened: "Dispute opened",
  deadline_proposed: "New deadline proposed",
  deadline_extended: "Deadline extended",
  deadline_declined: "Deadline proposal declined",
  deadline_withdrawn: "Deadline proposal withdrawn",
  live_session_scheduled: "Live 1:1 coaching scheduled",
  live_session_completed: "Live coaching session completed",
};
