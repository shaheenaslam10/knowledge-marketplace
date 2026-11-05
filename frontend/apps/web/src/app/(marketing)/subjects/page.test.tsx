import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SubjectsPage from "./page";

const SUBJECTS = {
  subjects: [
    { name: "Mathematics", slug: "mathematics", expert_count: 3 },
    { name: "Physics", slug: "physics", expert_count: 0 },
  ],
};

function mockFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
}

describe("/subjects hub", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("links every subject so the spokes are reachable by humans, not just crawlers", async () => {
    mockFetch(async () => ({ ok: true, json: async () => SUBJECTS }));

    render(await SubjectsPage());

    expect(screen.getByRole("link", { name: "Mathematics" })).toHaveAttribute(
      "href",
      "/subjects/mathematics",
    );
    expect(screen.getByRole("link", { name: "Physics" })).toHaveAttribute(
      "href",
      "/subjects/physics",
    );
  });

  it("separates staffed subjects from ones still waiting for an expert", async () => {
    mockFetch(async () => ({ ok: true, json: async () => SUBJECTS }));

    const text = (await render(await SubjectsPage())).container.textContent ?? "";

    expect(text).toContain("3 experts");
    expect(text).toContain("Subjects without a listed expert yet");
  });

  it("degrades honestly when the taxonomy cannot be loaded", async () => {
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });

    const { container } = render(await SubjectsPage());

    expect(container.querySelector('[data-testid="subjects-unavailable"]')).not.toBeNull();
  });
});
