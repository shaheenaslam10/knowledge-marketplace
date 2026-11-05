import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import StudentVaultPage from "./page";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/features/auth/SessionProvider", () => ({
  useSession: () => ({
    user: { id: 10, email: "student@demo.local", name: "Alex Student" },
    status: "authenticated",
  }),
}));

const mockVaultData = {
  purchases: [
    {
      id: 1,
      product_title: "Python Pandas Mastery Guide",
      product_slug: "python-pandas-mastery-guide",
      product_type: "study_guide",
      price_minor: 2500,
      purchased_at: "2026-11-01T12:00:00Z",
      download_count: 3,
      can_download: true,
    },
  ],
  deliverables: [
    {
      order_id: 101,
      order_title: "Distributed Systems Consultation",
      expert_name: "Dr. Ayra Vance",
      delivered_at: "2026-11-02T15:30:00Z",
      status: "completed",
      scratchpad: "// Session scratchpad notes\n- Redis caching patterns",
    },
  ],
  invoices: [
    {
      invoice_number: "INV-2026-0001",
      order_id: 101,
      title: "1:1 Live Consultation",
      amount_minor: 4500,
      currency: "USD",
      date: "2026-11-02T15:30:00Z",
      status: "paid",
      expert_name: "Dr. Ayra Vance",
    },
  ],
};

describe("StudentVaultPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vault items and allows switching tabs to invoices", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mockVaultData);

    render(<StudentVaultPage />);

    // Waits for data to load
    await waitFor(() => {
      expect(screen.getByText("My Digital Assets & Invoices")).toBeInTheDocument();
    });

    // Check unlocked product appears
    expect(screen.getByText("Python Pandas Mastery Guide")).toBeInTheDocument();

    // Click Invoices tab
    const invoicesTab = screen.getByTestId("tab-vault-invoices");
    await userEvent.click(invoicesTab);

    // Verify invoice row is shown
    expect(screen.getByText("INV-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/\$45\.00/)).toBeInTheDocument();
  });
});
