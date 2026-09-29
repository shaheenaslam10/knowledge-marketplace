import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AcademicIntegrityPage from "@/app/(marketing)/academic-integrity/page";
import PrivacyPage from "@/app/(marketing)/privacy/page";
import TermsPage from "@/app/(marketing)/terms/page";

import { slug } from "./LegalDocument";

describe("legal pages (Phase 12 launch gate)", () => {
  it("renders the terms with the rules the platform actually enforces", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeDefined();
    const text = document.body.textContent ?? "";
    // Commission snapshots, revision allowances, auto-approval and the dispute
    // window are implemented — the page must not drift from them.
    expect(text).toContain("15%");
    expect(text).toContain("20%");
    expect(text).toContain("72 hours");
    expect(text).toContain("7 days");
  });

  it("renders the privacy policy covering retention and audit", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeDefined();
    const text = document.body.textContent ?? "";
    expect(text).toContain("30 days");
    expect(text).toContain("append-only");
    expect(text).toContain("Argon2id");
  });

  it("renders the academic integrity policy with the penalty ladder", () => {
    render(<AcademicIntegrityPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Academic Integrity Policy" })).toBeDefined();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Permanent ban");
    expect(text).toContain("30 days");
  });

  it("gives every section a linkable anchor", () => {
    render(<PrivacyPage />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const links = nav.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href.startsWith("#")).toBe(true);
      expect(document.getElementById(href.slice(1))).not.toBeNull();
    }
  });

  it("slugifies headings deterministically", () => {
    expect(slug("Who can see your data")).toBe("who-can-see-your-data");
    expect(slug("Payments, commission and refunds")).toBe("payments-commission-and-refunds");
  });
});
