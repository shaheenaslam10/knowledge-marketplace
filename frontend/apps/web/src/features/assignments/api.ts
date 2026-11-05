/** Managed-assignment API client (browser). */
import { apiFetch } from "@/lib/api/client";

import type { DirectAssignment, PoolInvitation } from "./types";

export const assignmentsApi = {
  invitations: () =>
    apiFetch<{ results: PoolInvitation[] }>({ path: "/api/v1/me/pool-invitations" }),
  acceptInvitation: (id: string, expectedAmount?: number) =>
    apiFetch<{ invitation: PoolInvitation; order: { number: string; amount_display: number; source: string } }>({
      path: `/api/v1/me/pool-invitations/${id}/accept`,
      method: "POST",
      body: JSON.stringify(expectedAmount ? { expected_amount: Math.round(expectedAmount * 100) } : {}),
      headers: { "Content-Type": "application/json" },
    }),
  declineInvitation: (id: string, reason = "") =>
    apiFetch<PoolInvitation>({
      path: `/api/v1/me/pool-invitations/${id}/decline`,
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
    }),
  assignments: () =>
    apiFetch<{ results: DirectAssignment[] }>({ path: "/api/v1/me/assignments" }),
  acceptAssignment: (id: string) =>
    apiFetch<{ assignment: DirectAssignment; order: { number: string; amount_display: number; source: string } }>({
      path: `/api/v1/me/assignments/${id}/accept`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  declineAssignment: (id: string, reason = "") =>
    apiFetch<DirectAssignment>({
      path: `/api/v1/me/assignments/${id}/decline`,
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
    }),
};
