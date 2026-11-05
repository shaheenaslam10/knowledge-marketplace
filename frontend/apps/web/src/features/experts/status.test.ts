import { describe, expect, it } from "vitest";
import { APPLICATION_STATUS_COPY } from "./status";
import { canSubmitApplication, isApplicationEditable } from "./types";


describe("expert application lifecycle copy (ADR-0012)", () => {
  it("covers every lifecycle state", () => {
    const states = [
      "not_applied",
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "suspended",
    ] as const;
    for (const state of states) {
      expect(APPLICATION_STATUS_COPY[state].title.length).toBeGreaterThan(0);
      expect(APPLICATION_STATUS_COPY[state].detail.length).toBeGreaterThan(0);
    }
  });

  it("suspension copy keeps student access explicit", () => {
    expect(APPLICATION_STATUS_COPY.suspended.detail).toContain("student account is unaffected");
  });
});

describe("application edit/submit rules", () => {
  it("is editable only in draft, submitted and rejected", () => {
    expect(isApplicationEditable("draft")).toBe(true);
    expect(isApplicationEditable("submitted")).toBe(true);
    expect(isApplicationEditable("rejected")).toBe(true);
    expect(isApplicationEditable("under_review")).toBe(false);
    expect(isApplicationEditable("approved")).toBe(false);
    expect(isApplicationEditable("suspended")).toBe(false);
    // not_applied is editable — first-time applicants fill the create form (regression:
  // excluding it hid the apply form from every new expert).
  expect(isApplicationEditable("not_applied")).toBe(true);
  });

  it("is submittable from draft or rejected only", () => {
    expect(canSubmitApplication("draft")).toBe(true);
    expect(canSubmitApplication("rejected")).toBe(true);
    expect(canSubmitApplication("submitted")).toBe(false);
    expect(canSubmitApplication("approved")).toBe(false);
    expect(canSubmitApplication("under_review")).toBe(false);
  });
});
