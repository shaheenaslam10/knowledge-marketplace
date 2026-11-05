import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReconciliationPage from "./page";
import { portalApi } from "@/features/portal/api";

vi.mock("@/features/portal/api", async () => {
  const actual = await vi.importActual<typeof import("@/features/portal/api")>("@/features/portal/api");
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      reconciliation: vi.fn(),
      ledger: vi.fn(),
      payouts: vi.fn(),
      settlePayout: vi.fn(),
      ledgerExportCsvUrl: vi.fn(() => "/api/v1/ops/finance/ledger/export-csv"),
    },
  };
});

describe("ReconciliationPage & Ledger Explorer", () => {
  beforeEach(() => {
    vi.mocked(portalApi.reconciliation).mockResolvedValue({
      generated_at: "2026-11-02T12:00:00Z",
      ok: true,
      findings: [],
      summary: {
        succeeded_payments: 14,
        refund_count: 0,
        payout_counts: { paid: 8 },
        failed_webhooks: 0,
      },
    });

    vi.mocked(portalApi.payouts).mockResolvedValue({
      total: 0,
      results: [],
    });

    vi.mocked(portalApi.ledger).mockResolvedValue({
      count: 2,
      results: [
        {
          id: "101",
          created_at: "2026-11-02T10:00:00Z",
          entry_type: "charge",
          entry_type_label: "Student charge (money in)",
          amount_minor: 30000,
          amount_display: 300,
          currency: "USD",
          order_id: "55",
          order_number: "ORD-9901",
          user_id: 10,
          user_email: "student@demo.local",
          description: "Student charge",
          provider_object_id: "ch_test_123",
          is_balanced: true,
          t_account: {
            charge_plus_refund: 30000,
            allocations: 30000,
          },
        },
        {
          id: "102",
          created_at: "2026-11-02T10:01:00Z",
          entry_type: "commission",
          entry_type_label: "Platform commission",
          amount_minor: 4500,
          amount_display: 45,
          currency: "USD",
          order_id: "55",
          order_number: "ORD-9901",
          user_id: null,
          user_email: null,
          description: "15% platform take rate",
          provider_object_id: "",
          is_balanced: true,
          t_account: {
            charge_plus_refund: 30000,
            allocations: 30000,
          },
        },
      ],
      summary: {
        total_charges: 30000,
        total_commissions: 4500,
        total_credits: 25500,
        total_refunds: 0,
        total_fees: 0,
        system_balanced: true,
      },
    });
  });

  it("renders ledger rows, balanced badges, and opens T-Account verification drilldown", async () => {
    render(<ReconciliationPage />);

    // Table headers and entries rendered
    await waitFor(() => {
      expect(screen.getAllByText("ORD-9901").length).toBeGreaterThan(0);
      expect(screen.getByText("student@demo.local")).toBeInTheDocument();
      expect(screen.getAllByText("Balanced").length).toBeGreaterThan(0);
    });

    // Inspect T-Account drilldown
    const inspectBtns = screen.getAllByRole("button", { name: /Inspect T-Account/i });
    expect(inspectBtns.length).toBeGreaterThan(0);
    await userEvent.click(inspectBtns[0]);

    // Modal renders double-entry verification details
    expect(screen.getByText("T-Account Verification Drilldown")).toBeInTheDocument();
    expect(screen.getByText("Zero-Sum Verified")).toBeInTheDocument();
    expect(screen.getByText("Debit (Charge + Refund)")).toBeInTheDocument();
    expect(screen.getByText("Credit (Comm + Credit + Fee)")).toBeInTheDocument();

    // Close drilldown
    await userEvent.click(screen.getByRole("button", { name: "Close Drilldown" }));
    expect(screen.queryByText("T-Account Verification Drilldown")).not.toBeInTheDocument();
  });
});
