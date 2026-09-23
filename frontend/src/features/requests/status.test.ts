import { describe, expect, it } from "vitest";

import {
  REQUEST_STATUS_COPY,
  canAcceptOffers,
  isDraftEditable,
  type RequestStatus,
} from "./types";

describe("request lifecycle helpers", () => {
  it("covers every status with copy + tone (no blank badges)", () => {
    const statuses: RequestStatus[] = [
      "draft", "open", "matched", "in_progress", "completed",
      "rejected", "in_review", "pooled", "cancelled", "expired",
    ];
    for (const status of statuses) {
      expect(REQUEST_STATUS_COPY[status]).toBeTruthy();
    }
  });

  it("only drafts are editable (BR: publication locks the brief)", () => {
    expect(isDraftEditable("draft")).toBe(true);
    expect(isDraftEditable("open")).toBe(false);
    expect(isDraftEditable("matched")).toBe(false);
  });

  it("only open requests accept offers/selection", () => {
    expect(canAcceptOffers("open")).toBe(true);
    expect(canAcceptOffers("draft")).toBe(false);
    expect(canAcceptOffers("matched")).toBe(false);
  });
});
