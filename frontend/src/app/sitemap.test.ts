import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import sitemap from "./sitemap";
import robots from "./robots";
import { SITE_URL } from "@/lib/config";

const EXPERTS_PAGE_1 = {
  results: [
    { slug: "ada-l", approved_at: "2026-01-05T10:00:00Z" },
    { slug: "grace-h", approved_at: "2026-02-11T10:00:00Z" },
  ],
  next: "http://api.internal/api/v1/experts?page_size=100&cursor=cD0y",
};

const EXPERTS_PAGE_2 = {
  results: [{ slug: "alan-t", approved_at: null }],
  next: null,
};

function mockFetch(impl: (url: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => impl(String(input))),
  );
}

describe("sitemap.ts", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("lists the public marketing routes and no private ones", async () => {
    mockFetch(() => ({ ok: true, json: async () => ({ results: [], next: null }) }));

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}`);
    expect(urls).toContain(`${SITE_URL}/pricing`);
    expect(urls).toContain(`${SITE_URL}/how-it-works`);
    expect(urls).toContain(`${SITE_URL}/experts`);
    expect(urls).toContain(`${SITE_URL}/terms`);

    for (const priv of ["/orders", "/portal", "/messages", "/login", "/account"]) {
      expect(urls.some((u) => u.includes(priv))).toBe(false);
    }
  });

  it("walks every cursor page of the expert directory", async () => {
    mockFetch((url) => ({
      ok: true,
      json: async () => (url.includes("cursor=") ? EXPERTS_PAGE_2 : EXPERTS_PAGE_1),
    }));

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/experts/ada-l`);
    expect(urls).toContain(`${SITE_URL}/experts/grace-h`);
    expect(urls).toContain(`${SITE_URL}/experts/alan-t`);
  });

  it("uses approved_at as lastModified when the API supplies it", async () => {
    mockFetch((url) => ({
      ok: true,
      json: async () => (url.includes("cursor=") ? EXPERTS_PAGE_2 : EXPERTS_PAGE_1),
    }));

    const entry = (await sitemap()).find((e) => e.url.endsWith("/experts/ada-l"));

    expect(new Date(entry!.lastModified as Date).toISOString()).toBe(
      "2026-01-05T10:00:00.000Z",
    );
  });

  it("follows only the cursor from `next`, never the host the API returned", async () => {
    const seen: string[] = [];
    mockFetch((url) => {
      seen.push(url);
      return {
        ok: true,
        json: async () =>
          url.includes("cursor=")
            ? EXPERTS_PAGE_2
            : {
                results: [{ slug: "ada-l" }],
                // Hostile / misconfigured absolute next.
                next: "http://evil.example/api/v1/experts?cursor=cD0y",
              },
      };
    });

    await sitemap();

    expect(seen.some((u) => u.includes("evil.example"))).toBe(false);
    expect(seen.some((u) => u.includes("cursor=cD0y"))).toBe(true);
  });

  it("still returns the static routes when the expert API is down", async () => {
    mockFetch(() => {
      throw new Error("ECONNREFUSED");
    });

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/pricing`);
    expect(urls.some((u) => u.includes("/experts/"))).toBe(false);
  });

  it("stops at a non-OK page instead of looping", async () => {
    mockFetch(() => ({ ok: false, status: 503, json: async () => ({}) }));

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls.some((u) => u.includes("/experts/"))).toBe(false);
    expect(urls.length).toBeGreaterThan(0);
  });
});

describe("robots.ts", () => {
  it("keeps marketing crawlable but disallows app and portal surfaces", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = (rules.disallow ?? []) as string[];

    expect(rules.allow).toBe("/");
    for (const priv of ["/portal", "/orders", "/messages", "/account", "/api/", "/login"]) {
      expect(disallow).toContain(priv);
    }
    // Marketing paths must not be caught by a disallow prefix.
    for (const pub of ["/pricing", "/how-it-works", "/experts", "/terms"]) {
      expect(disallow.some((d) => pub.startsWith(d))).toBe(false);
    }
  });

  it("advertises the sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
