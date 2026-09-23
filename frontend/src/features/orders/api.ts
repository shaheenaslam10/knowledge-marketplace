/** Orders API client (browser) + delivery upload helper. */
import { apiFetch } from "@/lib/api/client";

import type { DeliveryRecord, OrderDetail, OrderListItem } from "./types";

export const ordersApi = {
  list: () => apiFetch<{ results: OrderListItem[] }>({ path: "/api/v1/me/orders" }),
  detail: (id: string) => apiFetch<OrderDetail>({ path: `/api/v1/me/orders/${id}` }),
  deliver: (id: string, summary: string, attachmentIds: string[]) =>
    apiFetch<DeliveryRecord>({
      path: `/api/v1/me/orders/${id}/deliveries`,
      method: "POST",
      body: JSON.stringify({ summary, attachment_ids: attachmentIds }),
      headers: { "Content-Type": "application/json" },
    }),
  approve: (id: string) =>
    apiFetch<{ status: string }>({
      path: `/api/v1/me/orders/${id}/approve`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  requestRevision: (id: string, note: string) =>
    apiFetch<{ status: string; revision_number: number }>({
      path: `/api/v1/me/orders/${id}/request-revision`,
      method: "POST",
      body: JSON.stringify({ note }),
      headers: { "Content-Type": "application/json" },
    }),
  cancel: (id: string, reason: string) =>
    apiFetch<{ status: string }>({
      path: `/api/v1/me/orders/${id}/cancel`,
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
    }),
};

/** Signed, short-lived download URLs come from the existing files API. */
export async function fileDownloadUrl(attachmentId: string): Promise<string> {
  const response = await apiFetch<{ url: string }>({
    path: `/api/v1/files/${attachmentId}/download-url`,
  });
  return response.url;
}
