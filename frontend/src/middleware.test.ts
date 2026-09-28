import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  imageSources,
  inRedirectScope,
  resolveRoute,
  toOrigin,
} from "./middleware";

describe("phase 4 prefixes", () => {
  it.each(["/requests", "/opportunities", "/offers", "/assignments", "/portal"])("guards %s", (path) => {
    expect(resolveRoute(path, false)).toBe("/login");
    expect(resolveRoute(path, true)).toBeNull();
  });
});

describe("middleware route resolution (protected-route foundation)", () => {
  it("redirects anonymous users from protected paths to login", () => {
    expect(resolveRoute("/account", false)).toBe("/login");
    expect(resolveRoute("/account/settings", false)).toBe("/login");
    expect(resolveRoute("/onboarding/student", false)).toBe("/login");
    expect(resolveRoute("/expert/apply", false)).toBe("/login");
    expect(resolveRoute("/expert/application", false)).toBe("/login");
  });

  it("leaves protected paths alone when an access cookie exists", () => {
    expect(resolveRoute("/account", true)).toBeNull();
    expect(resolveRoute("/expert/apply", true)).toBeNull();
  });

  it("sends authenticated users away from login/register", () => {
    expect(resolveRoute("/login", true)).toBe("/account");
    expect(resolveRoute("/register", true)).toBe("/account");
  });

  it("never guards public pages for guests", () => {
    expect(resolveRoute("/", false)).toBeNull();
    expect(resolveRoute("/login", false)).toBeNull();
    expect(resolveRoute("/register", false)).toBeNull();
    expect(resolveRoute("/reset-password", false)).toBeNull();
    expect(resolveRoute("/how-it-works", false)).toBeNull();
    expect(resolveRoute("/experts", false)).toBeNull();
    expect(resolveRoute("/experts/ayra-k", false)).toBeNull();
  });
});

describe("redirect scope (Phase 12: CSP widened the matcher, not the redirects)", () => {
  it("keeps the pre-Phase-12 runtime redirect surface", () => {
    expect(inRedirectScope("/account")).toBe(true);
    expect(inRedirectScope("/account/settings")).toBe(true);
    expect(inRedirectScope("/onboarding/student")).toBe(true);
    expect(inRedirectScope("/expert/apply")).toBe(true);
    expect(inRedirectScope("/login")).toBe(true);
    expect(inRedirectScope("/register")).toBe(true);
  });

  it("does not edge-redirect routes that only the API/session layer guarded before", () => {
    for (const path of ["/orders", "/requests", "/opportunities", "/offers", "/assignments", "/portal"]) {
      expect(inRedirectScope(path)).toBe(false);
    }
  });

  it("leaves public pages out of the redirect scope", () => {
    expect(inRedirectScope("/")).toBe(false);
    expect(inRedirectScope("/how-it-works")).toBe(false);
    expect(inRedirectScope("/privacy")).toBe(false);
  });
});

describe("CSP construction (audit F-2 / ADR-0017)", () => {
  const prodEnv = {
    NEXT_PUBLIC_API_URL: "https://api.example.com",
    NEXT_PUBLIC_WS_URL: "wss://api.example.com",
  };

  it("enforcing policy carries the nonce and bans inline/eval script", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", enforce: true, env: prodEnv });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-inline' 'unsafe-eval'");
    expect(csp.split("script-src ")[1].split(";")[0]).not.toContain("unsafe-eval");
    expect(csp.split("script-src ")[1].split(";")[0]).not.toContain("unsafe-inline");
  });

  it("allows the cross-origin API and WebSocket the browser actually calls", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", enforce: true, env: prodEnv });
    const connect = csp.split("connect-src ")[1].split(";")[0];
    expect(connect).toContain("'self'");
    expect(connect).toContain("https://api.example.com");
    expect(connect).toContain("wss://api.example.com");
  });

  it("keeps the documented residual: style-src stays inline-capable", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", enforce: true, env: prodEnv });
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("locks down the framing/base/object vectors", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", enforce: true, env: prodEnv });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("development keeps eval so React Refresh works", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", enforce: false, env: {} });
    expect(csp).toContain("'unsafe-eval'");
  });

  it("honours opt-in extra origins and ignores junk URLs", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "n",
      enforce: true,
      env: { NEXT_PUBLIC_API_URL: "not-a-url", NEXT_PUBLIC_CSP_CONNECT_EXTRA: "https://o.sentry.io" },
    });
    const connect = csp.split("connect-src ")[1].split(";")[0];
    expect(connect).toContain("https://o.sentry.io");
    expect(connect).not.toContain("not-a-url");
  });

  it("derives origins, discarding path and query", () => {
    expect(toOrigin("https://api.example.com/v1/?x=1")).toBe("https://api.example.com");
    expect(toOrigin(undefined)).toBeNull();
    expect(toOrigin("")).toBeNull();
  });

  it("image sources accept an extra media origin", () => {
    expect(imageSources({ NEXT_PUBLIC_CSP_IMG_EXTRA: "https://cdn.example.com" })).toContain(
      "https://cdn.example.com",
    );
    expect(imageSources({})).toEqual(["'self'", "data:", "blob:"]);
  });
});
