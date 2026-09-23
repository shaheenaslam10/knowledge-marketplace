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
 * Thin API client (foundation). Rules:
 * - credentials always included (cookie-based auth arrives in Phase 2)
 * - the error envelope {"error":{code,message,details}} is parsed into ApiError
 * - 401 handling/refresh gets layered here in Phase 2 — call sites must not change
 */
export async function apiFetch<T>({ path, baseUrl, ...init }: ApiFetchOptions): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
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
