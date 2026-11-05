import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { LiveCoachingStudio } from "./live-coaching-studio";
import type { OrderDetail } from "../types";

vi.mock("../api", () => ({
  ordersApi: {
    startLiveSession: vi.fn().mockResolvedValue({
      active_session: {
        id: 1,
        status: "live",
        scheduled_at: null,
        started_at: new Date().toISOString(),
        duration_seconds: 0,
        scratchpad_content: "console.log('init');",
        created_at: new Date().toISOString(),
      },
      recent_sessions: [],
    }),
    scheduleLiveSession: vi.fn().mockResolvedValue({
      active_session: {
        id: 2,
        status: "scheduled",
        scheduled_at: "2026-11-20T18:00:00Z",
        started_at: null,
        duration_seconds: 0,
        scratchpad_content: "",
        created_at: new Date().toISOString(),
      },
      recent_sessions: [],
    }),
    endLiveSession: vi.fn().mockResolvedValue({
      active_session: null,
      recent_sessions: [
        {
          id: 1,
          status: "ended",
          duration_seconds: 120,
          scratchpad_content: "console.log('done');",
          ended_at: new Date().toISOString(),
        },
      ],
    }),
    getIcsCalendarUrl: (id: string) => `http://localhost:8000/api/v1/me/orders/${id}/live-session/ics`,
  },
}));

const mockOrder: OrderDetail = {
  id: "29",
  number: "ORD-20261102-TEST",
  status: "active",
  source: "open_bid",
  request_title: "Econometrics Coaching",
  amount_display: 500,
  role: "expert",
  counterparty: "Student User",
  created_at: new Date().toISOString(),
  request_id: "req-1",
  request_category: "economics",
  expert_amount_display: 400,
  commission_display: 100,
  currency: "USD",
  deadline: "2026-11-20",
  delivery_due_at: "2026-11-20T18:00:00Z",
  revisions_allowed: 2,
  revisions_used: 0,
  auto_approve_at: null,
  paid_at: new Date().toISOString(),
  delivered_at: null,
  completed_at: null,
  cancelled_at: null,
  cancellation_reason: "",
  events: [],
  deliveries: [],
  payment: null,
  live_session: {
    active_session: null,
    recent_sessions: [],
  },
};

describe("LiveCoachingStudio", () => {
  it("renders live studio card, schedule button, and .ics calendar invite link", () => {
    render(<LiveCoachingStudio order={mockOrder} onRefresh={vi.fn()} />);

    expect(
      screen.getByText(/Live 1:1 Coaching & Collaborative Code Studio/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Join Live Studio Now")).toBeInTheDocument();
    expect(screen.getByText("Schedule Session")).toBeInTheDocument();

    const icsLink = screen.getByRole("link", { name: /\.ics Invite/i });
    expect(icsLink).toBeInTheDocument();
    expect(icsLink).toHaveAttribute(
      "href",
      "http://localhost:8000/api/v1/me/orders/29/live-session/ics"
    );
  });

  it("opens scheduling drawer and submits new session date", async () => {
    const onRefresh = vi.fn();
    render(<LiveCoachingStudio order={mockOrder} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByText("Schedule Session"));
    expect(screen.getByText(/Select Proposed Coaching Date & Time/i)).toBeInTheDocument();

    const dateInput = screen.getByLabelText(/Select Proposed Coaching Date & Time/i);
    fireEvent.change(dateInput, { target: { value: "2026-11-20T18:00" } });

    fireEvent.click(screen.getByText("Confirm Schedule"));
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("enters live studio stage and supports collaborative scratchpad typing", async () => {
    render(<LiveCoachingStudio order={mockOrder} onRefresh={vi.fn()} />);

    fireEvent.click(screen.getByText("Join Live Studio Now"));

    await waitFor(() => {
      expect(screen.getByText(/Live 1:1 Coaching Studio/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Collaborative Scratchpad/i)).toBeInTheDocument();
    expect(screen.getByText("End & Save Session")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Type formulas, econometrics code/i);
    fireEvent.change(textarea, { target: { value: "const model = new Econometrics();" } });
    expect(textarea).toHaveValue("const model = new Econometrics();");
  });
});
