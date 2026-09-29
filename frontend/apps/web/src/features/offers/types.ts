/** Offer domain types + helpers (docs/workflows/open-marketplace.md, BR-15..18). */

export type OfferStatus = "pending" | "accepted" | "declined" | "withdrawn" | "expired";

export interface ExpertCard {
  display_name: string;
  slug: string;
  headline: string;
  rating_avg: number | null;
  reviews_count: number;
}

export interface Offer {
  id: string;
  request: string;
  amount: number;
  amount_display: number;
  currency: string;
  timeline_text: string;
  message: string;
  status: OfferStatus;
  responded_at: string | null;
  response_reason: string;
  net_preview: { commission: number; net: number } | null;
  expert?: ExpertCard | null;
}

export const OFFER_STATUS_TONE: Record<OfferStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  pending: "info",
  accepted: "success",
  declined: "neutral",
  withdrawn: "warning",
  expired: "warning",
};

export const OFFER_STATUS_COPY: Record<OfferStatus, string> = {
  pending: "Pending review",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

/** Pending offers are editable/withdrawable; withdrawn can be resubmitted (BR-15/16). */
export function isOfferEditable(status: OfferStatus): boolean {
  return status === "pending";
}

export function isOfferResubmittable(status: OfferStatus): boolean {
  return status === "withdrawn";
}
