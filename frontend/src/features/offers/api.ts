/** Offers API client (browser). */
import { apiFetch } from "@/lib/api/client";

import type { Offer } from "./types";

export interface OfferWritePayload {
  amount: number;
  currency: string;
  timeline_text: string;
  message: string;
}

export const offersApi = {
  submit: (requestId: string, payload: OfferWritePayload) =>
    apiFetch<Offer>({
      path: `/api/v1/requests/${requestId}/offers`,
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  mine: () => apiFetch<{ results: Offer[] }>({ path: "/api/v1/me/offers" }),
  update: (id: string, payload: Partial<OfferWritePayload>) =>
    apiFetch<Offer>({
      path: `/api/v1/me/offers/${id}`,
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  withdraw: (id: string) =>
    apiFetch<Offer>({ path: `/api/v1/me/offers/${id}/withdraw`, method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }),
  resubmit: (id: string) =>
    apiFetch<Offer>({ path: `/api/v1/me/offers/${id}/resubmit`, method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }),
};

/** Student-side offer management on their own request. */
export const selectionApi = {
  listForRequest: (requestId: string) =>
    apiFetch<{ count: number; results: Offer[] }>({ path: `/api/v1/me/requests/${requestId}/offers` }),
  accept: (requestId: string, offerId: string) =>
    apiFetch<{ offer: Offer; order: { id: string; number: string; status: string; amount_display: number; expert: string } }>({
      path: `/api/v1/me/requests/${requestId}/offers/${offerId}/accept`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  decline: (requestId: string, offerId: string, reason = "") =>
    apiFetch<Offer>({
      path: `/api/v1/me/requests/${requestId}/offers/${offerId}/decline`,
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
    }),
};
