/** Payment domain types (expert financial view foundation). */

export interface EarningsSummary {
  expert_credit_minor: number;
  payout_minor: number;
  outstanding_minor: number;
  expert_credit_display: number;
  payout_display: number;
  outstanding_display: number;
  currency: string;
}

export interface PayoutRecord {
  id: string;
  order_number: string;
  amount_display: number;
  currency: string;
  status: "scheduled" | "in_transit" | "paid" | "failed" | "reversed";
  created_at: string;
  settled_at: string | null;
  failure_reason: string;
}

export const PAYOUT_STATUS_COPY: Record<PayoutRecord["status"], string> = {
  scheduled: "Scheduled",
  in_transit: "In transit",
  paid: "Paid",
  failed: "Failed",
  reversed: "Reversed",
};
