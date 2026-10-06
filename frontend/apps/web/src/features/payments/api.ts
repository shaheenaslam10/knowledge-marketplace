/** Payments API client (browser). Order-scoped pay actions live in
 * features/orders/api (the order workspace owns the flow). */
import { apiFetch } from "@/lib/api/client";

import type { EarningsSummary, PayoutRecord } from "./types";

export const paymentsApi = {
  earnings: () => apiFetch<EarningsSummary>({ path: "/api/v1/me/earnings" }),
  payouts: () => apiFetch<{ results: PayoutRecord[] }>({ path: "/api/v1/me/payouts" }),
};
