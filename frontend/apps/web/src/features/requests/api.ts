/** Requests + taxonomy API client (browser). */
import { apiFetch } from "@/lib/api/client";

import type { RequestWritePayload, ServiceRequest, TaxonomyRef } from "./types";

export const requestsApi = {
  list: () => apiFetch<{ results: ServiceRequest[] }>({ path: "/api/v1/me/requests" }),
  detail: (id: string) => apiFetch<ServiceRequest>({ path: `/api/v1/me/requests/${id}` }),
  create: (payload: RequestWritePayload) =>
    apiFetch<ServiceRequest>({
      path: "/api/v1/me/requests",
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  update: (id: string, payload: Partial<RequestWritePayload>) =>
    apiFetch<ServiceRequest>({
      path: `/api/v1/me/requests/${id}`,
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  publish: (id: string, attested: boolean) =>
    apiFetch<ServiceRequest>({
      path: `/api/v1/me/requests/${id}/publish`,
      method: "POST",
      body: JSON.stringify({ attested }),
      headers: { "Content-Type": "application/json" },
    }),
  cancel: (id: string, reason = "") =>
    apiFetch<ServiceRequest>({
      path: `/api/v1/me/requests/${id}/cancel`,
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
    }),
};

/** Expert-facing feed (eligible experts only). */
export const feedApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<{ results: ServiceRequest[] }>({ path: `/api/v1/requests${qs ? `?${qs}` : ""}` });
  },
  detail: (id: string) => apiFetch<ServiceRequest>({ path: `/api/v1/requests/${id}` }),
};

export const taxonomyApi = {
  // Backend returns {terms: [...]} (see experts/api.ts + api.md §Taxonomy) —
  // reading {results} here crashed every RequestForm mount (Phase 11 e2e).
  terms: (kind: "subject" | "skill") =>
    apiFetch<{ terms: (TaxonomyRef & { kind: string })[] }>({ path: `/api/v1/taxonomy/terms?kind=${kind}` }),
};
