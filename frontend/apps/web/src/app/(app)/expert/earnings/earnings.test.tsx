import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import SpecialistEarningsPage from "./page";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/features/auth/SessionProvider", () => ({
  useSession: () => ({
    user: { id: 1, email: "expert@demo.local", name: "Ayra Vance", roles: { expert: true } },
    status: "authenticated",
  }),
}));

const mockAnalytics = {
  total_gmv_minor: 125000,
  total_commission_minor: 18750,
  total_net_minor: 106250,
  net_earnings_minor: 106250,
  withdrawable_balance_minor: 65000,
  withdrawn_minor: 41250,
  currency: "USD",
  orders_gmv_minor: 95000,
  orders_commission_minor: 14250,
  orders_net_minor: 80750,
  orders_count: 8,
  catalog_gmv_minor: 30000,
  catalog_commission_minor: 4500,
  catalog_net_minor: 25500,
  catalog_count: 12,
  recent_ledger_entries: [
    {
      id: 1,
      entry_type: "expert_credit",
      amount_minor: 4250,
      created_at: "2026-11-04T10:00:00Z",
      description: "Direct session credit: Python Review",
    },
  ],
  payout_history: [
    {
      id: 50,
      amount_minor: 20000,
      currency: "USD",
      status: "paid",
      created_at: "2026-10-30T10:00:00Z",
      settled_at: "2026-10-31T12:00:00Z",
    },
  ],
};

describe("SpecialistEarningsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders earnings metrics, GMV breakdown, and withdrawable balance", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mockAnalytics);

    render(<SpecialistEarningsPage />);

    await waitFor(() => {
      expect(screen.getByText("Earnings & Payout Analytics")).toBeInTheDocument();
    });

    // Check Withdrawable balance ($650.00)
    expect(screen.getByText(/\$650\.00/)).toBeInTheDocument();

    // Check Gross Marketplace Volume ($1,250.00)
    expect(screen.getByTestId("stat-gross-gmv")).toHaveTextContent("1250.00");

    // Check Payout Request button is active
    expect(screen.getByTestId("open-payout-modal-btn")).toBeInTheDocument();
  });

  it("opens the payout withdrawal modal and submits request", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockAnalytics)
      .mockResolvedValueOnce({
        payout_id: 51,
        amount_minor: 2500,
        status: "scheduled",
        withdrawable_balance_minor: 62500,
      })
      .mockResolvedValueOnce(mockAnalytics);

    render(<SpecialistEarningsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("open-payout-modal-btn")).toBeInTheDocument();
    });

    // Open modal
    await userEvent.click(screen.getByTestId("open-payout-modal-btn"));

    expect(screen.getByText("Request Payout Withdrawal")).toBeInTheDocument();

    // Fill withdrawal input
    const amountInput = screen.getByTestId("payout-amount-input");
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, "25.00");

    // Click confirm
    const confirmBtn = screen.getByTestId("submit-payout-btn");
    await userEvent.click(confirmBtn);

    expect(apiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/me/expert/payouts/request/",
        method: "POST",
      })
    );
  });
});
