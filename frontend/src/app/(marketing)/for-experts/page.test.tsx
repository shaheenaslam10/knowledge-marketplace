import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ForExpertsPage from "./page";

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

describe("/for-experts", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("states what the expert keeps, derived from the live commission rate", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    const { container } = render(await ForExpertsPage());
    const text = container.textContent ?? "";

    // 100 - 15 and 100 - 20, computed rather than written down.
    expect(text).toContain("85");
    expect(text).toContain("80");
    expect(text).toContain("15% platform commission");
    expect(text).toContain("20% platform commission");
  });

  it("follows a rate change instead of hard-coding 15/20", async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({
        ...PRICING,
        commission: {
          open_bid: { ...PRICING.commission.open_bid, percent: "10" },
          managed: { ...PRICING.commission.managed, percent: "30" },
        },
      }),
    }));

    const text = (await render(await ForExpertsPage())).container.textContent ?? "";

    expect(text).toContain("90");
    expect(text).toContain("70");
    expect(text).not.toContain("85");
  });

  it("quotes the real payout floor and dispute window in the FAQ", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    const text = (await render(await ForExpertsPage())).container.textContent ?? "";

    expect(text).toContain("10.00 USD");
    expect(text).toContain("7 days");
  });

  it("degrades without inventing a rate when pricing is unavailable", async () => {
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });

    const { container } = render(await ForExpertsPage());

    expect(container.querySelector('[data-testid="expert-commission-unavailable"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\d+% platform commission/);
  });

  it("routes prospective experts into the real application flow", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    render(await ForExpertsPage());

    expect(screen.getAllByRole("link", { name: "Create your account" })[0]).toHaveAttribute(
      "href",
      "/register",
    );
    expect(
      screen.getByRole("link", { name: "Start your expert application" }),
    ).toHaveAttribute("href", "/expert/apply");
  });

  it("emits FAQPage JSON-LD as an un-nonced data block", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    const { container } = render(await ForExpertsPage());

    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld?.getAttribute("nonce")).toBeNull();
    const parsed = JSON.parse(ld?.textContent ?? "{}");
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(4);
  });

  it("makes no earnings promises the platform cannot support", async () => {
    mockFetch(async () => ({ ok: true, json: async () => PRICING }));

    const text = (await render(await ForExpertsPage())).container.textContent ?? "";

    for (const claim of ["average expert earns", "guaranteed", "per month", "$1,000"]) {
      expect(text.toLowerCase()).not.toContain(claim.toLowerCase());
    }
  });
});
