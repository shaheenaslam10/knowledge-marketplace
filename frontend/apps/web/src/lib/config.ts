/* Backend URL configuration.
 *
 * Two contexts, two URLs (documented in docs/architecture/environments.md):
 * - BROWSER → backend: NEXT_PUBLIC_API_URL (must be reachable from the user's browser)
 * - SERVER (RSC fetch) → backend: SERVER_API_URL (docker-network internal name), falls back
 *   to NEXT_PUBLIC_API_URL when unset (plain local dev).
 */
export const API_URL_BROWSER =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const API_URL_SERVER =
  process.env.SERVER_API_URL ?? API_URL_BROWSER;

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
