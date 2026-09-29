import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PolicyBanner, ReportMessageButton, POLICY_BANNER } from "./moderation";
import * as messagingApi from "./api";

const reportSpy = vi.spyOn(messagingApi.messagingApi, "reportMessage");

describe("BR-34 moderation surfaces", () => {
  beforeEach(() => {
    reportSpy.mockReset();
  });

  it("policy banner renders the on-platform notice", () => {
    render(<PolicyBanner />);
    expect(screen.getByTestId("policy-banner")).toHaveTextContent(POLICY_BANNER);
  });

  it("report flow: reason required, then posts and confirms", async () => {
    reportSpy.mockResolvedValueOnce({ id: "r1", message_id: "m1", reason: "off_platform", status: "open" });
    render(<ReportMessageButton messageId="m1" />);
    await userEvent.click(screen.getByTestId("report-cta-m1"));
    const form = screen.getByTestId("report-form-m1");
    expect(form).toBeInTheDocument();

    // no reason → blocked client-side
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a reason");
    expect(reportSpy).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText("Report reason"), "off_platform");
    await userEvent.type(screen.getByLabelText("Additional details (optional)"), "Asked to pay via bank transfer");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() => expect(reportSpy).toHaveBeenCalledWith("m1", "off_platform", "Asked to pay via bank transfer"));
    expect(await screen.findByTestId("report-done-m1")).toBeInTheDocument();
  });

  it("surfaces backend errors (e.g. duplicate open report)", async () => {
    reportSpy.mockRejectedValueOnce(
      new messagingApi.ApiError(409, "duplicate_report", "You already have an open report on this message."),
    );
    render(<ReportMessageButton messageId="m2" />);
    await userEvent.click(screen.getByTestId("report-cta-m2"));
    await userEvent.selectOptions(screen.getByLabelText("Report reason"), "spam");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already have an open report");
  });
});
