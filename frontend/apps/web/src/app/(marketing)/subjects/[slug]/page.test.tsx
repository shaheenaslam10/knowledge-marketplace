import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import SubjectPage, { generateMetadata } from "./page";

const SUBJECT = {
  subject: {
    name: "Mathematics",
    slug: "mathematics",
    description: "Algebra, calculus and statistics support.",
  },
  parent: { name: "STEM", slug: "stem" },
  expert_count: 2,
  related: [{ name: "Physics", slug: "physics" }],
};

const EXPERTS = {
  results: [
    {
      slug: "ada-l",
      display_name: "Ada L.",
      headline: "Applied mathematician",
      expertise_summary: "Ten years tutoring calculus.",
      rating_avg: "4.9",
      rating_count: 12,
      availability: "available",
      subjects: [{ id: 1, name: "Mathematics", slug: "mathematics" }],
    },
  ],
};

/** Routes the two calls the page makes by URL, so order cannot matter. */
function mockApi(opts: {
  subject?: { status?: number; body?: unknown } | "throw";
  experts?: { status?: number; body?: unknown } | "throw";
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const target = url.includes("/api/v1/subjects/") ? opts.subject : opts.experts;
      if (target === "throw") throw new Error("ECONNREFUSED");
      const status = target?.status ?? 200;
      return { ok: status >= 200 && status < 300, status, json: async () => target?.body ?? {} };
    }),
  );
}

const params = (slug = "mathematics") => Promise.resolve({ slug });

describe("subject landing page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("renders the subject, its experts and hub-and-spoke links", async () => {
    mockApi({ subject: { body: SUBJECT }, experts: { body: EXPERTS } });

    const { container } = render(await SubjectPage({ params: params() }));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Mathematics");
    expect(container.textContent).toContain("Algebra, calculus and statistics support.");
    expect(container.textContent).toContain("2 experts available");
    expect(screen.getByRole("link", { name: "Ada L." })).toHaveAttribute(
      "href",
      "/experts/ada-l",
    );
    // spokes: related subject + the hub
    expect(screen.getByRole("link", { name: "Physics" })).toHaveAttribute(
      "href",
      "/subjects/physics",
    );
    expect(screen.getByRole("link", { name: "Subjects" })).toHaveAttribute("href", "/subjects");
  });

  it("shows the parent category as a label, never a link", async () => {
    // Parents are taxonomy *categories*; they have no landing page, so a link
    // would be a guaranteed 404.
    mockApi({ subject: { body: SUBJECT }, experts: { body: EXPERTS } });

    const { container } = render(await SubjectPage({ params: params() }));

    expect(container.textContent).toContain("part of STEM");
    expect(screen.queryByRole("link", { name: "STEM" })).toBeNull();
  });

  it("emits BreadcrumbList + CollectionPage JSON-LD without a nonce", async () => {
    mockApi({ subject: { body: SUBJECT }, experts: { body: EXPERTS } });

    const { container } = render(await SubjectPage({ params: params() }));

    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld?.getAttribute("nonce")).toBeNull();
    const graph = JSON.parse(ld?.textContent ?? "{}")["@graph"];
    const types = graph.map((node: { "@type": string }) => node["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("CollectionPage");
    const collection = graph.find((n: { "@type": string }) => n["@type"] === "CollectionPage");
    expect(collection.mainEntity.numberOfItems).toBe(1);
  });

  it("calls notFound() when the backend says the subject does not exist", async () => {
    mockApi({ subject: { status: 404 }, experts: { body: EXPERTS } });

    await SubjectPage({ params: params("retired") });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("does NOT 404 a real subject just because the API is unreachable", async () => {
    mockApi({ subject: "throw", experts: "throw" });

    const { container } = render(await SubjectPage({ params: params() }));

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Subject unavailable");
  });

  it("shows an empty state, not a broken page, when nobody teaches it yet", async () => {
    mockApi({
      subject: { body: { ...SUBJECT, expert_count: 0, related: [] } },
      experts: { body: { results: [] } },
    });

    const { container } = render(await SubjectPage({ params: params() }));

    expect(container.querySelector('[data-testid="subject-empty-state"]')).not.toBeNull();
    expect(container.textContent).toContain("No experts are listed in this subject yet.");
  });

  it("still renders the subject when only the expert directory fails", async () => {
    mockApi({ subject: { body: SUBJECT }, experts: "throw" });

    const { container } = render(await SubjectPage({ params: params() }));

    expect(container.textContent).toContain("Find help in Mathematics");
    expect(container.querySelector('[data-testid="subject-empty-state"]')).not.toBeNull();
  });
});

describe("subject metadata", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("builds a canonical URL and description from live data", async () => {
    mockApi({ subject: { body: SUBJECT } });

    const meta = await generateMetadata({ params: params() });

    expect(meta.title).toBe("Mathematics experts & tutoring");
    expect(meta.description).toBe("Algebra, calculus and statistics support.");
    expect(meta.alternates?.canonical).toContain("/subjects/mathematics");
  });

  it("noindexes a subject with no experts rather than ranking an empty page", async () => {
    mockApi({ subject: { body: { ...SUBJECT, expert_count: 0 } } });

    const meta = await generateMetadata({ params: params() });

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("noindexes and invents no name when the subject cannot be loaded", async () => {
    mockApi({ subject: "throw" });

    const meta = await generateMetadata({ params: params() });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.title).toBe("Subject");
  });
});
