import type { ApiError } from "@/lib/api/client";

/**
 * Maps the backend's stable error codes to user-facing copy.
 * Pure function → trivially testable; add codes as they land (docs/architecture/api.md).
 */
export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const apiError = error as ApiError;
    switch (apiError.code) {
      case "invalid_credentials":
        return "Invalid email or password.";
      case "not_authenticated":
        return "Please sign in to continue.";
      case "token_invalid":
        return "This session or link has expired. Please sign in again.";
      case "verification_failed":
        return apiError.message || "This verification link is invalid or has expired.";
      case "reset_link_invalid":
        return "This reset link is invalid or has expired.";
      case "throttled":
        return "Too many attempts. Please wait a minute and try again.";
      case "validation_error": {
        const details = apiError.details ?? {};
        const firstField = Object.keys(details)[0];
        const first = firstField ? (details as Record<string, unknown>)[firstField] : null;
        const message = Array.isArray(first) && typeof first[0] === "string" ? first[0] : null;
        return message ?? "Please check the highlighted fields.";
      }
      default:
        return apiError.message || "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
