import { apiFetch } from "@/lib/api/client";
import { API_URL_SERVER } from "@/lib/config";
import type { HealthStatus } from "@/types/api";

/**
 * Server-side backend health fetch (used by the home page status card).
 * Never throws — an unreachable backend is a UI state, not a page crash.
 */
export async function fetchBackendHealth(): Promise<HealthStatus | null> {
  try {
    return await apiFetch<HealthStatus>({
      path: "/healthz",
      baseUrl: API_URL_SERVER,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
