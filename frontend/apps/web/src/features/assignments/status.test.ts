import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STATUS_COPY,
  ASSIGNMENT_STATUS_TONE,
  isRespondable,
  type AssignmentStatus,
} from "./types";

describe("assignment status helpers (managed service)", () => {
  const statuses: AssignmentStatus[] = ["pending", "accepted", "declined", "expired", "superseded"];
  it("covers every status with copy + tone", () => {
    for (const status of statuses) {
      expect(ASSIGNMENT_STATUS_COPY[status]).toBeTruthy();
      expect(ASSIGNMENT_STATUS_TONE[status]).toBeTruthy();
    }
  });
  it("only pending assignments are respondable", () => {
    expect(isRespondable("pending")).toBe(true);
    for (const status of statuses.filter((s) => s !== "pending")) {
      expect(isRespondable(status)).toBe(false);
    }
  });
});
