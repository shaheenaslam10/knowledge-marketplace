import { API_URL_BROWSER, API_URL_SERVER } from "@/lib/config";
import { apiFetch } from "@/lib/api/client";
import type {
  DetailResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
} from "./types";

/**
 * Auth API surface (Phase 2). Tokens never appear here — the backend sets
 * httpOnly cookies (`hm_access`/`hm_refresh`) and `apiFetch` always sends
 * `credentials: "include"`. Browsers authenticate by cookie; nothing token
 * shaped is ever stored in JS.
 */

/** Browser-context calls (actions taken by the user). */
export const authApi = {
  register: (body: RegisterRequest, baseUrl = API_URL_BROWSER) =>
    apiFetch<RegisterResponse>({ path: "/api/v1/auth/register", baseUrl, method: "POST", body: JSON.stringify(body) }),

  login: (body: LoginRequest, baseUrl = API_URL_BROWSER) =>
    apiFetch<LoginResponse>({ path: "/api/v1/auth/token", baseUrl, method: "POST", body: JSON.stringify(body) }),

  logout: (baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({ path: "/api/v1/auth/logout", baseUrl, method: "POST" }),

  me: (baseUrl = API_URL_BROWSER) => apiFetch<MeResponse>({ path: "/api/v1/me", baseUrl }),

  verifyEmail: (token: string, baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({
      path: "/api/v1/auth/verify-email",
      baseUrl,
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({ path: "/api/v1/auth/resend-verification", baseUrl, method: "POST" }),

  requestPasswordReset: (email: string, baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({
      path: "/api/v1/auth/password/reset",
      baseUrl,
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  confirmPasswordReset: (body: { uid: string; token: string; password: string }, baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({
      path: "/api/v1/auth/password/reset/confirm",
      baseUrl,
      method: "POST",
      body: JSON.stringify(body),
    }),

  deactivate: (baseUrl = API_URL_BROWSER) =>
    apiFetch<DetailResponse>({ path: "/api/v1/me/deactivate", baseUrl, method: "POST" }),
};

/** Server-context (RSC) read of the current session, or null when anonymous. */
export async function getServerSession(baseUrl = API_URL_SERVER) {
  try {
    const { user } = await apiFetch<MeResponse>({ path: "/api/v1/me", baseUrl });
    return user;
  } catch {
    return null;
  }
}
