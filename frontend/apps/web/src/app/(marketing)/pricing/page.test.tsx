import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PricingPage from "./page";

const PRICING = {
  currency: "USD",
  commission: {
    open_bid: {
      rate: "0.1500",
      percent: "15",
      label: "Open marketplace",
      description: "Experts bid on your request.",
    },
    managed: {
      rate: "0.2000",
      percent: "20",
      label: "Managed service",
      description: "We match a vetted expert.",
    },
  },
  min_offer: { minor: 500, display: "5.00 USD" },
  payout_min: { minor: 1000, display: "10.00 USD" },
  dispute_window_days: 7,
};

function mockFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
}

describe("pricing page (public commission disclosure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes the live commission rates from the backend", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    render(await PricingPage());

    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeDefined();
    const text = document.body.textContent ?? "";
    expect(text).toContain("15");
    expect(text).toContain("20");
    expect(text).toContain("5.00 USD");
    expect(text).toContain("10.00 USD");
    expect(text).toContain("7 days");
  });

  it("renders rates from the response, never hard-coded copy", async () => {
    // The whole point of reading PlatformConfig: an operator changes the rate
    // and the public page follows. A hard-coded page would silently lie.
    mockFetch(async () => ({
      ok: true,
      json: async () => ({
        ...PRICING,
        commission: {
          open_bid: { ...PRICING.commission.open_bid, percent: "12.5" },
          managed: { ...PRICING.commission.managed, percent: "17.5" },
        },
      }),
    }));

    render(await PricingPage());

    const text = document.body.textContent ?? "";
    expect(text).toContain("12.5");
    expect(text).toContain("17.5");
  });

  it("emits FAQPage JSON-LD as a data block (no nonce, stays statically rendered)", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    const { container } = render(await PricingPage());

    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    // A nonce would require headers(), which would opt this SEO route out of
    // static rendering. ld+json is a data block, so script-src never applies.
    expect(ld?.getAttribute("nonce")).toBeNull();
    const parsed = JSON.parse(ld?.textContent ?? "{}");
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(4);
  });

  it("degrades to an honest message when the API is unreachable", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });

    render(await PricingPage());

    // Must still render and must not invent numbers.
    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeDefined();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Live pricing is temporarily unavailable");
    expect(text).not.toContain("15%");
  });

  it("degrades the same way on a non-200 response", async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));

    render(await PricingPage());

    expect(document.body.textContent).toContain("Live pricing is temporarily unavailable");
  });
});
