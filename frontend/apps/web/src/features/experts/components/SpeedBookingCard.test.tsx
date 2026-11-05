import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { SpeedBookingCard } from "./SpeedBookingCard";
import type { PublicExpert } from "../types";
import { expertsApi } from "../api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/features/auth/SessionProvider", () => ({
  useSession: () => ({
    user: { id: 2, email: "student@demo.local", roles: { student: true } },
    status: "authenticated",
  }),
}));

vi.mock("../api", () => ({
  expertsApi: {
    bookSession: vi.fn(),
  },
}));

const mockExpert: PublicExpert = {
  slug: "ayra-vance",
  display_name: "Dr. Ayra Vance",
  headline: "Principal Systems Architect",
  bio: "Specializing in distributed systems and algorithms.",
  expertise_summary: "Distributed computing, algorithmic game theory, Python.",
  experience_years: 12,
  qualifications: "Ph.D. Computer Science",
  languages: "English",
  timezone: "UTC",
  availability: "available",
  subjects: [],
  skills: [],
  rating_avg: "4.95",
  rating_count: 24,
  completed_orders: 42,
  approved_at: "2026-01-01T00:00:00Z",
  session_30m_price: 4500,
  session_60m_price: 8000,
};

describe("SpeedBookingCard (Instant Consultation Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 30m default duration and allows toggling to 60m", async () => {
    render(<SpeedBookingCard expert={mockExpert} />);

    expect(screen.getByText("Speed-Book 1:1 Live Session")).toBeInTheDocument();
    expect(screen.getByText("$45")).toBeInTheDocument();
    expect(screen.getByTestId("instant-book-btn")).toHaveTextContent("Instant Book & Fund Escrow — $45.00");

    // Select 60 min
    const btn60 = screen.getByTestId("duration-60-btn");
    await userEvent.click(btn60);

    expect(screen.getByText("$80")).toBeInTheDocument();
    expect(screen.getByTestId("instant-book-btn")).toHaveTextContent("Instant Book & Fund Escrow — $80.00");
  });

  it("submits booking and navigates to the order workspace", async () => {
    vi.mocked(expertsApi.bookSession).mockResolvedValueOnce({
      order_id: "ord-test-uuid-1234",
      order_number: "ORD-20261105-001",
      status: "awaiting_payment",
      amount_display: 45.0,
      currency: "USD",
      duration_minutes: 30,
      live_session_id: 1,
      scheduled_at: null,
    });

    render(<SpeedBookingCard expert={mockExpert} />);

    const bookButton = screen.getByTestId("instant-book-btn");
    await userEvent.click(bookButton);

    expect(expertsApi.bookSession).toHaveBeenCalledWith(
      "ayra-vance",
      expect.objectContaining({
        duration_minutes: 30,
        topic_title: "1:1 Architecture & Code Mentorship",
      })
    );

    expect(mockPush).toHaveBeenCalledWith("/orders/ord-test-uuid-1234");
  });
});
