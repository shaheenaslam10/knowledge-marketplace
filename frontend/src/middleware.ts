import { NextResponse, type NextRequest } from "next/server";

/**
 * Protected-route foundation (Phase 2). The middleware sees only cookie
 * *presence* — httpOnly JWTs cannot be verified at the edge without shipping
 * the secret to Next, which we will not do. This is a UX redirect layer:
 * the Django API remains the security boundary (deny-by-default).
 *
 * - Auth-required paths without `hm_access` → /login?next=<original>
 * - Auth pages (login/register) WITH a session cookie → /account
 */
const PROTECTED_PREFIXES = ["/account", "/onboarding", "/expert", "/requests", "/opportunities", "/offers", "/assignments", "/orders", "/portal"];
const AUTH_PAGES = ["/login", "/register"];
const ACCESS_COOKIE = "hm_access";

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

export function middleware(request: NextRequest) {
  const redirectTarget = resolveRoute(
    request.nextUrl.pathname,
    Boolean(request.cookies.get(ACCESS_COOKIE)?.value),
  );
  if (!redirectTarget) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  if (redirectTarget === "/login" && !request.nextUrl.searchParams.get("next")) {
    url.searchParams.set("next", request.nextUrl.pathname);
  } else {
    url.search = "";
  }
  url.pathname = redirectTarget;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/account/:path*", "/onboarding/:path*", "/expert/:path*", "/login", "/register"],
};
