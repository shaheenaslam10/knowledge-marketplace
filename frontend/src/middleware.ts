import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware: two jobs.
 *
 * 1. Protected-route foundation (Phase 2). The middleware sees only cookie
 *    *presence* — httpOnly JWTs cannot be verified at the edge without shipping
 *    the secret to Next, which we will not do. This is a UX redirect layer:
 *    the Django API remains the security boundary (deny-by-default).
 *
 * 2. Content-Security-Policy with a per-request nonce (Phase 12, audit F-2 —
 *    ADR-0017). The nonce is handed to the renderer through the `x-nonce`
 *    REQUEST header (Next stamps it onto its own inline bootstrap scripts) and
 *    the policy goes out as a RESPONSE header from this same function, so the
 *    nonce in the policy and the nonce in the HTML can never disagree.
 */
const PROTECTED_PREFIXES = [
  "/account",
  "/onboarding",
  "/expert",
  "/requests",
  "/opportunities",
  "/offers",
  "/assignments",
  "/orders",
  "/portal",
];
const AUTH_PAGES = ["/login", "/register"];
const ACCESS_COOKIE = "hm_access";

/**
 * Paths where the redirect layer actually runs at request time.
 *
 * Phase 12 widened `config.matcher` to every document route so CSP can cover
 * the whole app. Widening the matcher must NOT silently widen the redirect
 * surface: before Phase 12 only these prefixes were matched, so only these
 * produced edge redirects, and changing that is a product behaviour change
 * outside this phase's scope. `resolveRoute` below stays the single, tested
 * statement of protection *intent* (it covers all of PROTECTED_PREFIXES);
 * promoting the rest to edge redirects is a one-line change to this list once
 * it has been verified against the E2E journey pack.
 */
const REDIRECT_SCOPE = ["/account", "/onboarding", "/expert", "/login", "/register"];

export function resolveRoute(pathname: string, hasAccessCookie: boolean): string | null {
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasAccessCookie) {
    return "/login";
  }
  if (hasAccessCookie && AUTH_PAGES.includes(pathname)) {
    return "/account";
  }
  return null;
}

export function inRedirectScope(pathname: string): boolean {
  return REDIRECT_SCOPE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** `https://api.example.com/v1/` → `https://api.example.com`; junk → null. */
export function toOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Origins the browser is allowed to open connections to.
 *
 * `'self'` alone is NOT enough in production: the browser calls the Django API
 * at NEXT_PUBLIC_API_URL and opens the WebSocket at NEXT_PUBLIC_WS_URL, both of
 * which are a different origin than the Next app once the three experiences sit
 * on their own hostnames (ADR-0013). Deriving the list from the same env vars
 * the client code reads keeps the policy correct in every environment instead
 * of hard-coding localhost.
 */
export function connectSources(env: Record<string, string | undefined>): string[] {
  const sources = new Set<string>(["'self'"]);
  for (const raw of [env.NEXT_PUBLIC_API_URL, env.NEXT_PUBLIC_WS_URL]) {
    const origin = toOrigin(raw);
    if (origin) sources.add(origin);
  }
  for (const extra of (env.NEXT_PUBLIC_CSP_CONNECT_EXTRA ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) sources.add(trimmed);
  }
  return [...sources];
}

/** Extra image origins (e.g. an R2 custom domain serving avatars). */
export function imageSources(env: Record<string, string | undefined>): string[] {
  const sources = new Set<string>(["'self'", "data:", "blob:"]);
  for (const extra of (env.NEXT_PUBLIC_CSP_IMG_EXTRA ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) sources.add(trimmed);
  }
  return [...sources];
}

export function buildContentSecurityPolicy(options: {
  nonce: string;
  enforce: boolean;
  env: Record<string, string | undefined>;
}): string {
  const { nonce, enforce, env } = options;
  // Enforcing (staging/production): the nonce is the only root of trust and
  // 'strict-dynamic' lets Next's own loader pull the chunks it nonced.
  // Report-only (development): React Refresh compiles with eval().
  const scriptSrc = enforce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Documented residual (ADR-0017): React writes inline style attributes and
    // Next inlines critical CSS. This does not weaken script execution control.
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources(env).join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources(env).join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const enforce = process.env.NODE_ENV === "production";
  const csp = buildContentSecurityPolicy({ nonce, enforce, env: process.env });
  const cspHeader = enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

  const { pathname } = request.nextUrl;
  const redirectTarget = inRedirectScope(pathname)
    ? resolveRoute(pathname, Boolean(request.cookies.get(ACCESS_COOKIE)?.value))
    : null;

  if (redirectTarget) {
    const url = request.nextUrl.clone();
    if (redirectTarget === "/login" && !request.nextUrl.searchParams.get("next")) {
      url.searchParams.set("next", pathname);
    } else {
      url.search = "";
    }
    url.pathname = redirectTarget;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set(cspHeader, csp);
    return redirect;
  }

  // Pass the nonce down to the renderer, then echo the matching policy back.
  //
  // Next reads the nonce out of the `Content-Security-Policy` REQUEST header to
  // stamp its own inline bootstrap/hydration scripts, so that header must be
  // set on the request even when the response ships report-only (dev). The
  // `x-nonce` header is the copy application code reads (e.g. <Script nonce>).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(cspHeader, csp);
  return response;
}

export const config = {
  // Every document route (CSP must cover them all); static assets, the Next
  // build output and anything with a file extension are excluded.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
