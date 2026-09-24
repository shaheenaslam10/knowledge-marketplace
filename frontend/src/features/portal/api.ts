/**
 * Operations portal API client (Phase 10) — staff-only /ops/* surfaces.
 * Types mirror apps/portal/api/views.py payloads.
 */
import { apiFetch, ApiError } from "@/lib/api/client";

export { ApiError };

export type KpiRange = "today" | "7d" | "30d" | "custom";

export interface KpiPayload {
  range: { from: string; to: string; tz: string };
  marketplace: {
    total_requests: number;
    open_requests: number;
    matched_requests: number;
    completed_orders: number;
    cancelled_orders: number;
    active_orders: number;
    request_to_match_rate: number | null;
  };
  financial: {
    gmv_minor: number;
    commission_minor: number;
    expert_payable_minor: number;
    refunds_minor: number;
    payouts: Record<string, number>;
    take_rate: number | null;
    default_currency: string;
  };
  quality: {
    avg_rating: number | null;
    review_count: number;
    dispute_count: number;
    dispute_rate: number | null;
    dispute_outcomes: Record<string, number>;
    revision_rate: number | null;
  };
  communication: {
    message_count: number;
    report_count: number;
    open_reports: number;
    notifications_pushed: number;
    notifications_emailed: number;
    thread_count: number;
  };
  trend: {
    orders: Record<string, number>;
    gmv_minor: Record<string, number>;
    disputes: Record<string, number>;
  };
}

export interface ReportRow {
  id: string;
  status: "open" | "reviewed" | "dismissed";
  reason: string;
  reason_display: string;
  details: string;
  reporter: { id: number; name: string };
  message: {
    id: string;
    sender: string;
    sender_id: number;
    body: string;
    thread_id: string;
    created_at: string;
    is_hidden: boolean;
  };
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DisputeRow {
  id: string;
  status: string;
  reason_display: string;
  outcome: string | null;
  order_id: string;
  order_number: string;
  order_status: string;
  amount: number;
  currency: string;
  student_id: number;
  expert_id: number;
  opened_by: number;
  admin_url: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditRow {
  id: number;
  actor: number | null;
  actor_name: string | null;
  action: string;
  object_type: string;
  object_id: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface ConfigPayload {
  open_commission_rate: string;
  managed_commission_rate: string;
  min_offer_minor: number;
  payout_min_minor: number;
  dispute_window_days: number;
  default_currency: string;
  updated_at: string;
  mutable_fields: string[];
}

export interface ReconciliationPayload {
  generated_at: string;
  ok: boolean;
  findings: { check: string; severity: string; detail: Record<string, unknown>; order_id?: string; payment_id?: string }[];
  summary: {
    succeeded_payments: number;
    refund_count: number;
    payout_counts: Record<string, number>;
    failed_webhooks: number;
  };
}

export interface UsersOverview {
  total: number;
  results: {
    id: number;
    email: string;
    name: string;
    is_staff: boolean;
    email_verified: boolean;
    created_at: string;
    expert: {
      slug: string;
      status: string | null;
      availability: string;
      rating_avg: string | null;
      rating_count: number;
    } | null;
    orders_as_student: number;
    reviews_written: number;
    disputes_opened: number;
  }[];
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const portalApi = {
  kpis: (range: KpiRange, from?: string, to?: string) =>
    apiFetch<KpiPayload>({ path: `/api/v1/ops/kpis${query({ range, from, to })}` }),

  reports: (filters: { status?: string; reason?: string } = {}) =>
    apiFetch<{ total: number; results: ReportRow[] }>({
      path: `/api/v1/ops/reports${query(filters)}`,
    }),

  reviewReport: (reportId: string, action: "dismiss" | "confirm_hide", note = "") =>
    apiFetch<{ id: string; status: string; reviewed_at: string }>({
      path: `/api/v1/ops/reports/${reportId}/review`,
      method: "POST",
      body: JSON.stringify({ action, note }),
      headers: { "Content-Type": "application/json" },
    }),

  disputes: (filters: { status?: string } = {}) =>
    apiFetch<{ total: number; results: DisputeRow[] }>({
      path: `/api/v1/ops/disputes${query(filters)}`,
    }),

  audit: (filters: { action?: string; actor_id?: string; object_type?: string; from?: string; to?: string } = {}) =>
    apiFetch<{ total: number; results: AuditRow[] }>({
      path: `/api/v1/ops/audit${query(filters)}`,
    }),

  config: () => apiFetch<ConfigPayload>({ path: "/api/v1/ops/config" }),

  updateConfig: (changes: Partial<Record<"open_commission_rate" | "managed_commission_rate" | "min_offer_minor" | "payout_min_minor" | "dispute_window_days", number | string>>) =>
    apiFetch<ConfigPayload>({
      path: "/api/v1/ops/config",
      method: "PUT",
      body: JSON.stringify(changes),
      headers: { "Content-Type": "application/json" },
    }),

  reconciliation: () => apiFetch<ReconciliationPayload>({ path: "/api/v1/ops/reconciliation" }),

  users: (filters: { role?: string; q?: string } = {}) =>
    apiFetch<UsersOverview>({ path: `/api/v1/ops/users${query(filters)}` }),
};

/** Minor units → compact display (USD by contract; 2-decimal currencies). */
export function money(minor: number, currency = "USD"): string {
  return `${currency} ${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
