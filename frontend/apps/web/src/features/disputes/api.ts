/** Disputes API client (browser) — Phase 9 (docs/workflows/disputes.md). */
import { apiFetch } from "@/lib/api/client";

import type { Dispute } from "./types";

export const disputesApi = {
  /** The order's dispute for participants — 404 when none exists. */
  forOrder: (orderId: string) => apiFetch<Dispute>({ path: `/api/v1/me/orders/${orderId}/dispute` }),

  detail: (disputeId: string) => apiFetch<Dispute>({ path: `/api/v1/me/disputes/${disputeId}` }),

  open: (
    orderId: string,
    input: { reason: string; description: string; evidence_ids: string[] },
  ) =>
    apiFetch<Dispute>({
      path: `/api/v1/me/orders/${orderId}/dispute`,
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),

  addEvidence: (disputeId: string, evidenceIds: string[]) =>
    apiFetch<{ added: { id: string; original_name: string }[] }>({
      path: `/api/v1/me/disputes/${disputeId}/evidence`,
      method: "POST",
      body: JSON.stringify({ evidence_ids: evidenceIds }),
      headers: { "Content-Type": "application/json" },
    }),
};

/** dispute_evidence uploads: 10 MB, pdf/png/jpg/jpeg (files.md allowlist). */
export async function uploadDisputeEvidence(file: File): Promise<string> {
  const form = new FormData();
  form.set("purpose", "dispute_evidence");
  form.set("file", file); // backend FileUploadView reads request.FILES["file"]
  const response = await apiFetch<{ attachment: { id: string } }>({
    path: "/api/v1/files",
    method: "POST",
    body: form,
  });
  return response.attachment.id;
}
