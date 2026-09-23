import { describe, expect, it } from "vitest";
import { resolveRoute } from "./middleware";

describe("middleware route resolution (protected-route foundation)", () => {
  it("redirects anonymous users from protected paths to login", () => {
    expect(resolveRoute("/account", false)).toBe("/login");
    expect(resolveRoute("/account/settings", false)).toBe("/login");
  });

  it("leaves protected paths alone when an access cookie exists", () => {
    expect(resolveRoute("/account", true)).toBeNull();
  });

  it("sends authenticated users away from login/register", () => {
    expect(resolveRoute("/login", true)).toBe("/account");
    expect(resolveRoute("/register", true)).toBe("/account");
  });

  it("never guards public or auth pages for guests", () => {
    expect(resolveRoute("/", false)).toBeNull();
    expect(resolveRoute("/login", false)).toBeNull();
    expect(resolveRoute("/register", false)).toBeNull();
    expect(resolveRoute("/reset-password", false)).toBeNull();
    expect(resolveRoute("/how-it-works", false)).toBeNull();
  });
});
