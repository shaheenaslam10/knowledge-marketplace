import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReviewComposer, ReviewSection } from "./review-card";
import { canEditReview, canReplyToReview, type Review } from "../types";

const baseReview: Review = {
  id: "12",
  order_id: "3",
  order_number: "ORD-2026-0003",
  rating: 4,
  sub_quality: 5,
  sub_communication: null,
  sub_timeliness: null,
  body: "Great structured sessions with clear takeaways.",
  status: "published",
  expert_reply: "",
  replied_at: null,
  edited: false,
  created_at: "2026-09-01T10:00:00Z",
};

describe("review eligibility rules (BR-37)", () => {
  it("student can edit until the expert replies", () => {
    expect(canEditReview(baseReview, true)).toBe(true);
    expect(canEditReview({ ...baseReview, expert_reply: "Thanks!" }, true)).toBe(false);
  });

  it("expert can reply once; hidden reviews are locked", () => {
    expect(canReplyToReview(baseReview, true)).toBe(true);
    expect(canReplyToReview({ ...baseReview, expert_reply: "Thanks!" }, true)).toBe(false);
    expect(canReplyToReview({ ...baseReview, status: "hidden" }, true)).toBe(false);
  });
});

describe("ReviewComposer", () => {
  it("requires a star rating before submitting", async () => {
    const onSubmit = vi.fn();
    render(<ReviewComposer onSubmit={onSubmit} busy={false} />);
    await userEvent.type(screen.getByLabelText("Your review"), "Solid work overall, well structured.");
    await userEvent.click(screen.getByRole("button", { name: "Publish review" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a star rating");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires at least 20 characters of body", async () => {
    const onSubmit = vi.fn();
    render(<ReviewComposer onSubmit={onSubmit} busy={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Overall rating: 5" }));
    await userEvent.type(screen.getByLabelText("Your review"), "Too short");
    await userEvent.click(screen.getByRole("button", { name: "Publish review" }));
    expect(screen.getByRole("alert")).toHaveTextContent("at least 20 characters");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits rating, body and sub-scores", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewComposer onSubmit={onSubmit} busy={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Overall rating: 4" }));
    await userEvent.click(screen.getByRole("radio", { name: "Quality: 5" }));
    await userEvent.type(screen.getByLabelText("Your review"), "Clear, patient and exactly what I needed.");
    await userEvent.click(screen.getByRole("button", { name: "Publish review" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4, subs: expect.objectContaining({ sub_quality: 5 }) }),
    );
  });
});

describe("ReviewSection role boundaries", () => {
  it("expert with no review sees a passive note, never a composer", () => {
    render(
      <ReviewSection orderRole="expert" review={null} busy={false} onSubmit={vi.fn()} onEdit={vi.fn()} onReply={vi.fn()} />,
    );
    expect(screen.getByTestId("review-none-expert")).toBeInTheDocument();
    expect(screen.queryByTestId("review-composer")).not.toBeInTheDocument();
  });

  it("student with no review gets the composer", () => {
    render(
      <ReviewSection orderRole="student" review={null} busy={false} onSubmit={vi.fn()} onEdit={vi.fn()} onReply={vi.fn()} />,
    );
    expect(screen.getByTestId("review-composer")).toBeInTheDocument();
  });

  it("after the expert replied the student cannot edit anymore", () => {
    render(
      <ReviewSection
        orderRole="student"
        review={{ ...baseReview, expert_reply: "Thank you for the kind words!" }}
        busy={false}
        onSubmit={vi.fn()}
        onEdit={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByTestId("expert-reply")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit review" })).not.toBeInTheDocument();
  });

  it("expert sees the reply form only while it is still available", () => {
    const props = {
      busy: false,
      onSubmit: vi.fn(),
      onEdit: vi.fn(),
      onReply: vi.fn(),
    };
    const { rerender } = render(
      <ReviewSection orderRole="expert" review={baseReview} {...props} />,
    );
    expect(screen.getByTestId("review-reply-form")).toBeInTheDocument();
    rerender(
      <ReviewSection
        orderRole="expert"
        review={{ ...baseReview, expert_reply: "Already answered." }}
        {...props}
      />,
    );
    expect(screen.queryByTestId("review-reply-form")).not.toBeInTheDocument();
  });
});
