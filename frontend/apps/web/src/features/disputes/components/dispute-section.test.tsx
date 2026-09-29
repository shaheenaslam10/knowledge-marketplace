import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { DisputeSection } from "./dispute-section";
import { canOpenDispute, type Dispute } from "../types";

const openDispute: Dispute = {
  id: "d1",
  order_id: "3",
  order_number: "ORD-2026-0003",
  opened_by: 7,
  reason: "deadline_missed",
  reason_display: "Deadline missed",
  description: "The delivery arrived two days after the agreed deadline without any notice.",
  status: "open",
  outcome: "",
  resolution_notes: "",
  created_at: "2026-09-10T10:00:00Z",
  resolved_at: null,
  thread: null,
  evidence: [{ id: "f1", original_name: "brief.pdf" }],
};

const noop = vi.fn().mockResolvedValue(undefined);

describe("dispute window gating (BR-40)", () => {
  it("openable during the run and within 7 days after completion", () => {
    expect(canOpenDispute("active")).toBe(true);
    expect(canOpenDispute("delivered")).toBe(true);
    expect(canOpenDispute("revision_requested")).toBe(true);
    expect(canOpenDispute("completed")).toBe(true);
  });

  it("not openable outside the documented statuses", () => {
    expect(canOpenDispute("cancelled")).toBe(false);
    expect(canOpenDispute("awaiting_payment")).toBe(false);
    expect(canOpenDispute("disputed")).toBe(false);
  });
});

describe("DisputeSection", () => {
  it("student on an eligible order sees the open CTA and validation", async () => {
    render(
      <DisputeSection orderStatus="delivered" orderRole="student" dispute={null} busy={false} onOpen={noop} onAddEvidence={noop} />,
    );
    await userEvent.click(screen.getByTestId("open-dispute-cta"));
    const composer = screen.getByTestId("dispute-composer");
    expect(composer).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open dispute" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick the reason");
  });

  it("expert without a dispute never gets the composer", () => {
    render(
      <DisputeSection orderStatus="active" orderRole="expert" dispute={null} busy={false} onOpen={noop} onAddEvidence={noop} />,
    );
    expect(screen.getByTestId("dispute-none-expert")).toBeInTheDocument();
    expect(screen.queryByTestId("open-dispute-cta")).not.toBeInTheDocument();
  });

  it("shows status, outcome and resolution once resolved; evidence stays visible", () => {
    render(
      <DisputeSection
        orderStatus="completed"
        orderRole="student"
        dispute={{
          ...openDispute,
          status: "resolved",
          outcome: "refund_student_partial",
          resolution_notes: "Partial refund issued after reviewing the delivered files.",
        }}
        busy={false}
        onOpen={noop}
        onAddEvidence={noop}
      />,
    );
    expect(screen.getByTestId("dispute-status")).toHaveTextContent("Resolved");
    expect(screen.getByTestId("dispute-status")).toHaveTextContent("Partially refunded to the student");
    expect(screen.getByTestId("dispute-status")).toHaveTextContent("Partial refund issued");
    expect(screen.getByText(/brief\.pdf/)).toBeInTheDocument();
    // closed dispute: no more evidence attachment control
    expect(screen.queryByLabelText("Attach more evidence")).not.toBeInTheDocument();
  });

  it("submits reason + description and calls onOpen", async () => {
    const onOpen = vi.fn().mockResolvedValue(undefined);
    render(
      <DisputeSection orderStatus="completed" orderRole="student" dispute={null} busy={false} onOpen={onOpen} onAddEvidence={noop} />,
    );
    await userEvent.click(screen.getByTestId("open-dispute-cta"));
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "quality_below_expectations");
    await userEvent.type(
      screen.getByLabelText("What went wrong?"),
      "The delivered document does not follow the agreed outline at all.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Open dispute" }));
    await waitFor(() =>
      expect(onOpen).toHaveBeenCalledWith({
        reason: "quality_below_expectations",
        description: expect.stringContaining("agreed outline"),
        evidenceIds: [],
      }),
    );
  });
});
