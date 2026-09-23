import type { ErrorEnvelope } from "@/types/api";

/** Typed error carrying the backend's stable machine code — UI maps codes to copy. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** relative to the configured base URL, e.g. "/api/v1/..." */
  path: string;
  baseUrl: string;
}

/**
 * Thin API client. Rules:
 * - credentials always included — auth is httpOnly cookies (`hm_access`/`hm_refresh`),
 *   never JS-readable tokens
 * - mutating requests carry `X-Requested-With` (documented CSRF defense-in-depth)
 * - the error envelope {"error":{code,message,details}} is parsed into ApiError
 * - on 401 the caller decides UX (sign-in redirect); the browser regains a valid
 *   session through the login/refresh endpoints — no transparent retry loop here,
 *   so a single request can never trigger cascading refreshes
 */
export async function apiFetch<T>({ path, baseUrl, ...init }: ApiFetchOptions): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(method !== "GET" && method !== "HEAD" ? { "X-Requested-With": "XMLHttpRequest" } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const envelope = payload as ErrorEnvelope | null;
    if (envelope?.error) {
      throw new ApiError(
        response.status,
        envelope.error.code,
        envelope.error.message,
        envelope.error.details ?? {},
      );
    }
    throw new ApiError(response.status, "unknown_error", `Request failed (${response.status})`);
  }

  return payload as T;
}
