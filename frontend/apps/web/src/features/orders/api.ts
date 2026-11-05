/** Orders API client (browser) + delivery upload helper. */
import { apiFetch } from "@/lib/api/client";
import { API_URL_BROWSER } from "@/lib/config";

import type {
  DeadlineProposalRecord,
  DeliveryRecord,
  LiveSessionPayload,
  OrderDetail,
  OrderListItem,
  PaymentInfo,
} from "./types";

export const ordersApi = {
  pay: (id: string) =>
    apiFetch<{ status: string; payment: PaymentInfo | null }>({
      path: `/api/v1/me/orders/${id}/pay`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  confirmPayment: (id: string) =>
    apiFetch<{ status: string; payment: PaymentInfo | null }>({
      path: `/api/v1/me/orders/${id}/payment/confirm`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
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
  proposeDeadline: (id: string, proposedDueAt: string, note: string) =>
    apiFetch<DeadlineProposalRecord>({
      path: `/api/v1/me/orders/${id}/deadline-proposal`,
      method: "POST",
      body: JSON.stringify({ proposed_due_at: proposedDueAt, note }),
      headers: { "Content-Type": "application/json" },
    }),
  respondDeadlineProposal: (id: string, action: "accept" | "decline" | "withdraw" | boolean) =>
    apiFetch<DeadlineProposalRecord>({
      path: `/api/v1/me/orders/${id}/deadline-proposal/respond`,
      method: "POST",
      body: JSON.stringify(typeof action === "string" ? { action } : { accept: action }),
      headers: { "Content-Type": "application/json" },
    }),
  getLiveSession: (id: string) =>
    apiFetch<LiveSessionPayload>({
      path: `/api/v1/me/orders/${id}/live-session`,
    }),
  scheduleLiveSession: (id: string, scheduledAt: string) =>
    apiFetch<LiveSessionPayload>({
      path: `/api/v1/me/orders/${id}/live-session`,
      method: "POST",
      body: JSON.stringify({ action: "schedule", scheduled_at: scheduledAt }),
      headers: { "Content-Type": "application/json" },
    }),
  startLiveSession: (id: string) =>
    apiFetch<LiveSessionPayload>({
      path: `/api/v1/me/orders/${id}/live-session`,
      method: "POST",
      body: JSON.stringify({ action: "start" }),
      headers: { "Content-Type": "application/json" },
    }),
  saveScratchpad: (id: string, content: string) =>
    apiFetch<LiveSessionPayload>({
      path: `/api/v1/me/orders/${id}/live-session`,
      method: "POST",
      body: JSON.stringify({ action: "save_scratchpad", scratchpad_content: content }),
      headers: { "Content-Type": "application/json" },
    }),
  endLiveSession: (id: string, durationSeconds: number, scratchpadContent: string) =>
    apiFetch<LiveSessionPayload>({
      path: `/api/v1/me/orders/${id}/live-session/end`,
      method: "POST",
      body: JSON.stringify({ duration_seconds: durationSeconds, scratchpad_content: scratchpadContent }),
      headers: { "Content-Type": "application/json" },
    }),
  getIcsCalendarUrl: (id: string) => `${API_URL_BROWSER}/api/v1/me/orders/${id}/live-session/ics`,
};

/** Signed, short-lived download URLs come from the existing files API. */
export async function fileDownloadUrl(attachmentId: string): Promise<string> {
  const response = await apiFetch<{ url: string }>({
    path: `/api/v1/files/${attachmentId}/download-url`,
  });
  return response.url;
}
