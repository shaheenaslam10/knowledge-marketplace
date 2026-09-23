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

export interface DeliveryRecord {
  id: string;
  revision_number: number;
  summary: string;
  status: "submitted" | "approved" | "revision_requested";
  submitted_at: string | null;
  approved_at: string | null;
  approval_source: string;
  attachments: { id: string; original_name: string; size: number; content_type: string }[];
}

export interface OrderEventRecord {
  event_type: string;
  created_at: string;
  data: Record<string, unknown>;
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
    actions.push({ key: "await-payment", label: "Payment arrives in Phase 7 — support can confirm manual payment", tone: "ghost" });
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
};
