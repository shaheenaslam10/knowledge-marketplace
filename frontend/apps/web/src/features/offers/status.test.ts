import { describe, expect, it } from "vitest";

import { OFFER_STATUS_COPY, isOfferEditable, isOfferResubmittable, type OfferStatus } from "./types";

describe("offer lifecycle helpers (BR-15/16)", () => {
  const statuses: OfferStatus[] = ["pending", "accepted", "declined", "withdrawn", "expired"];
  it("covers every status with copy", () => {
    for (const status of statuses) expect(OFFER_STATUS_COPY[status]).toBeTruthy();
  });
  it("only pending offers are editable/withdrawable", () => {
    expect(isOfferEditable("pending")).toBe(true);
    for (const status of statuses.filter((s) => s !== "pending")) {
      expect(isOfferEditable(status)).toBe(false);
    }
  });
  it("only withdrawn offers can be resubmitted", () => {
    expect(isOfferResubmittable("withdrawn")).toBe(true);
    for (const status of statuses.filter((s) => s !== "withdrawn")) {
      expect(isOfferResubmittable(status)).toBe(false);
    }
  });
});
