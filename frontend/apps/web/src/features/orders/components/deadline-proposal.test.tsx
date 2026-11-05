import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { DeadlineProposalBanner, DeadlineProposalComposer, OrderWorkspace } from "./order-workspace";
import type { DeadlineProposalRecord, OrderDetail } from "../types";

describe("DeadlineProposalBanner", () => {
  const proposal: DeadlineProposalRecord = {
    id: 101,
    status: "pending",
    proposed_due_at: "2026-11-08T18:00:00Z",
    proposed_by_id: 42,
    proposed_by_role: "expert",
    note: "Dataset requires supplementary cross-validation",
    delta_hours: 48,
    created_at: "2026-11-02T12:00:00Z",
  };

  it("renders specialist proposal and allows student counterparty to accept or decline", async () => {
    const onRespond = vi.fn(async () => undefined);
    render(
      <DeadlineProposalBanner
        proposal={proposal}
        currentDeadline="2026-11-06T18:00:00Z"
        viewerRole="student"
        onRespond={onRespond}
        busy={false}
      />,
    );

    expect(screen.getByText("Specialist Proposed Deadline Extension")).toBeInTheDocument();
    expect(screen.getByText("+48h")).toBeInTheDocument();
    expect(screen.getByText(/Dataset requires supplementary cross-validation/)).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: /Accept New Deadline/i });
    const declineBtn = screen.getByRole("button", { name: /Decline Proposal/i });
    expect(acceptBtn).toBeInTheDocument();
    expect(declineBtn).toBeInTheDocument();

    await userEvent.click(acceptBtn);
    expect(onRespond).toHaveBeenCalledWith("accept");

    await userEvent.click(declineBtn);
    expect(onRespond).toHaveBeenCalledWith("decline");
  });

  it("allows proposer to withdraw proposal", async () => {
    const onRespond = vi.fn(async () => undefined);
    render(
      <DeadlineProposalBanner
        proposal={proposal}
        currentDeadline="2026-11-06T18:00:00Z"
        viewerRole="expert"
        onRespond={onRespond}
        busy={false}
      />,
    );

    const withdrawBtn = screen.getByRole("button", { name: /Withdraw Proposal/i });
    expect(withdrawBtn).toBeInTheDocument();
    await userEvent.click(withdrawBtn);
    expect(onRespond).toHaveBeenCalledWith("withdraw");
  });
});

describe("OrderWorkspace Version History", () => {
  const mockOrder: OrderDetail = {
    id: "ord-1",
    number: "ORD-20261102-TEST",
    status: "delivered",
    source: "open_bid",
    request_id: "req-1",
    request_title: "Statistical Econometrics Modeling",
    request_category: "tutoring",
    amount_display: 450,
    expert_amount_display: 382.5,
    commission_display: 67.5,
    currency: "USD",
    role: "student",
    counterparty: "Dr. Eleanor Vance",
    deadline: "2026-11-05",
    delivery_due_at: "2026-11-05T18:00:00Z",
    revisions_allowed: 2,
    revisions_used: 1,
    auto_approve_at: "2026-11-08T18:00:00Z",
    created_at: "2026-11-02T10:00:00Z",
    paid_at: "2026-11-02T10:05:00Z",
    delivered_at: "2026-11-03T14:00:00Z",
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: "",
    events: [],
    deliveries: [
      {
        id: "del-1",
        revision_number: 0,
        version_label: "v1",
        summary: "Initial draft with raw regression tables.",
        status: "revision_requested",
        submitted_at: "2026-11-02T15:00:00Z",
        approved_at: null,
        approval_source: "",
        student_revision_note: "Please expand chapter 3 regarding empirical sampling bias.",
        attachments: [],
      },
      {
        id: "del-2",
        revision_number: 1,
        version_label: "v2",
        summary: "Revised econometric model with bias mitigation analysis.",
        status: "submitted",
        submitted_at: "2026-11-03T14:00:00Z",
        approved_at: null,
        approval_source: "",
        student_revision_note: null,
        attachments: [],
      },
    ],
    payment: null,
  };

  it("renders latest delivery v2 on top and earlier iteration v1 with student revision feedback", () => {
    const onAction = vi.fn(async () => undefined);
    render(<OrderWorkspace order={mockOrder} onAction={onAction} busy={false} />);

    // Latest version prominent
    expect(screen.getByText(/Deliverable \(v2 · Latest\)/i)).toBeInTheDocument();
    expect(screen.getByText("Revised econometric model with bias mitigation analysis.")).toBeInTheDocument();

    // History stepper
    expect(screen.getByText(/Deliverable Version History \(1 earlier iteration\)/i)).toBeInTheDocument();
    expect(screen.getByText("Initial draft with raw regression tables.")).toBeInTheDocument();
    expect(screen.getByText(/Please expand chapter 3 regarding empirical sampling bias/i)).toBeInTheDocument();
  });
});
