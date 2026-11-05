import { ApiError } from "@/lib/api/client";
import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("maps known auth codes to user-facing copy", () => {
    expect(authErrorMessage(new ApiError(401, "invalid_credentials", "Invalid email or password."))).toBe(
      "Invalid email or password.",
    );
    expect(authErrorMessage(new ApiError(429, "throttled", "Too many attempts."))).toContain("Too many attempts");
    expect(authErrorMessage(new ApiError(401, "token_invalid", "x"))).toContain("expired");
  });

  it("surfaces the first field message from validation_error details", () => {
    const err = new ApiError(400, "validation_error", "Bad input", {
      password: ["This password is too short."],
    });
    expect(authErrorMessage(err)).toBe("This password is too short.");
  });

  it("falls back to the server message for unknown codes", () => {
    expect(authErrorMessage(new ApiError(500, "server_error", "Boom"))).toBe("Boom");
  });

  it("handles non-ApiError values", () => {
    expect(authErrorMessage(null)).toContain("Something went wrong");
    expect(authErrorMessage(new Error("network"))).toContain("Something went wrong");
  });
});
