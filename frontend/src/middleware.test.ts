import { describe, expect, it } from "vitest";
import { resolveRoute } from "./middleware";

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
