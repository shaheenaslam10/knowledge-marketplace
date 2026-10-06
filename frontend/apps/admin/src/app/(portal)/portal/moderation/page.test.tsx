import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, type ReportRow } from "@/features/portal/api";
import * as portalApiModule from "@/features/portal/api";
import ModerationQueuePage from "./page";

const reportRow: ReportRow = {
  id: "6f1c0b7a-0000-4000-8000-000000000001",
  status: "open",
  reason: "off_platform",
  reason_display: "Off-platform payment/contact",
  details: "",
  reporter: { id: 2, name: "Demo Student" },
  message: {
    id: "m-1",
    sender: "Ayra K.",
    sender_id: 3,
    body: "We could continue over email and settle payment there directly.",
    thread_id: "t-1",
    created_at: "2026-09-20T10:00:00Z",
    is_hidden: false,
  },
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-09-20T10:05:00Z",
};

const reportsSpy = vi.spyOn(portalApiModule.portalApi, "reports");
const reviewSpy = vi.spyOn(portalApiModule.portalApi, "reviewReport");

describe("moderation queue (Phase 10)", () => {
  beforeEach(() => {
    reportsSpy.mockReset();
    reviewSpy.mockReset();
    reportsSpy.mockResolvedValue({ total: 1, results: [reportRow] });
  });

  it("lists open reports with sender visibility state", async () => {
    render(<ModerationQueuePage />);
    expect(await screen.findByTestId("report-queue")).toBeInTheDocument();
    expect(screen.getByText(/continue over email/)).toBeInTheDocument();
    expect(screen.getByText(/Ayra K\. · visible/)).toBeInTheDocument();
  });

  it("review drawer: dismiss posts the audited action and refreshes", async () => {
    reviewSpy.mockResolvedValueOnce({ id: reportRow.id, status: "dismissed", reviewed_at: "2026-09-24T10:00:00Z" });
    render(<ModerationQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Review" }));
    const drawer = await screen.findByTestId("report-drawer");
    expect(drawer).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Reviewer note (audited)"), "No violation");
    await userEvent.click(screen.getByTestId("dismiss-report"));
    await waitFor(() => expect(reviewSpy).toHaveBeenCalledWith(reportRow.id, "dismiss", "No violation"));
  });

  it("confirm+hide posts confirm_hide", async () => {
    reviewSpy.mockResolvedValueOnce({ id: reportRow.id, status: "reviewed", reviewed_at: "2026-09-24T10:00:00Z" });
    render(<ModerationQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByTestId("hide-message"));
    await waitFor(() => expect(reviewSpy).toHaveBeenCalledWith(reportRow.id, "confirm_hide", ""));
  });

  it("surfaces the already-reviewed guard from the backend", async () => {
    reviewSpy.mockRejectedValueOnce(
      new ApiError(409, "report_not_open", "This report was already reviewed."),
    );
    render(<ModerationQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByTestId("dismiss-report"));
    expect(await screen.findByText(/Already reviewed/)).toBeInTheDocument();
  });

  it("status filter drives the API query", async () => {
    render(<ModerationQueuePage />);
    await screen.findByTestId("report-queue");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "dismissed");
    await waitFor(() => expect(reportsSpy).toHaveBeenCalledWith({ status: "dismissed", reason: undefined }));
  });
});
