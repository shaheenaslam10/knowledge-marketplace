import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage, { metadata } from "./page";

describe("/about", () => {
  it("explains both matching models over one shared pipeline", () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Open marketplace");
    expect(text).toContain("Managed service");
    expect(text).toMatch(/single shared pipeline|one shared pipeline/i);
  });

  it("links the legal and product pages a visitor needs next", () => {
    render(<AboutPage />);

    for (const [name, href] of [
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Read the integrity policy", "/academic-integrity"],
      ["Become an expert", "/for-experts"],
      ["See the rates", "/pricing"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("sets a canonical URL", () => {
    expect(metadata.alternates?.canonical).toContain("/about");
  });

  it("invents no company facts the repository cannot support", () => {
    const text = (render(<AboutPage />).container.textContent ?? "").toLowerCase();

    // An About page is exactly where fabricated credibility markers appear.
    for (const claim of [
      "founded in",
      "our team",
      "headquarters",
      "investors",
      "million users",
      "students served",
      "award-winning",
    ]) {
      expect(text).not.toContain(claim);
    }
  });
});
