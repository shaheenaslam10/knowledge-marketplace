/** Messaging API client (browser). */
import { apiFetch, ApiError } from "@/lib/api/client";

export { ApiError };

import type { ChatMessage, ThreadCard, ThreadDetail } from "./types";

export const messagingApi = {
  list: () => apiFetch<{ results: ThreadCard[] }>({ path: "/api/v1/me/threads" }),
  detail: (threadId: string) => apiFetch<ThreadDetail>({ path: `/api/v1/me/threads/${threadId}` }),
  /** Send over REST — the WS path is the realtime hint, REST is the fallback. */
  send: (threadId: string, body: string, attachmentId?: string) =>
    apiFetch<ChatMessage>({
      path: `/api/v1/me/threads/${threadId}/messages`,
      method: "POST",
      body: JSON.stringify({ body, attachment_id: attachmentId ?? null }),
      headers: { "Content-Type": "application/json" },
    }),
  markRead: (threadId: string) =>
    apiFetch<{ read: boolean }>({
      path: `/api/v1/me/threads/${threadId}/read`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  /** Lazy thread open from order/request/dispute entry points. */
  open: (
    context:
      | { context_type: "order"; order_id: string }
      | { context_type: "dispute"; order_id: string }
      | { context_type: "request"; request_id: string },
  ) =>
    apiFetch<{ id: string; context_type: string }>({
      path: "/api/v1/me/threads/open",
      method: "POST",
      body: JSON.stringify(context),
      headers: { "Content-Type": "application/json" },
    }),

  /** BR-34 report button — one open report per (message, reporter). */
  reportMessage: (messageId: string, reason: string, details = "") =>
    apiFetch<{ id: string; message_id: string; reason: string; status: string }>({
      path: `/api/v1/me/messages/${messageId}/report`,
      method: "POST",
      body: JSON.stringify({ reason, details }),
      headers: { "Content-Type": "application/json" },
    }),
};

/** Message-purpose attachment upload (5 MB; pdf/png/jpg/jpeg/txt, private). */
export async function uploadChatAttachment(file: File): Promise<string> {
  const form = new FormData();
  form.set("purpose", "message");
  form.set("uploaded_file", file);
  const response = await apiFetch<{ id: string }>({
    path: "/api/v1/files",
    method: "POST",
    body: form,
  });
  return response.id;
}
