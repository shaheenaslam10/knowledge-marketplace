"use client";

/** Review display + student composer + expert reply form (Phase 9, BR-37).
 * All mutations go through the caller's onSubmit — this file never calls APIs
 * itself (server owns eligibility; the UI only mirrors it optimistically). */
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import {
  MAX_BODY_CHARS,
  MAX_RATING,
  MIN_BODY_CHARS,
  SUB_SCORES,
  canEditReview,
  canReplyToReview,
  type Review,
  type SubScoreKey,
} from "../types";

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={size === "lg" ? "text-warning text-base" : "text-warning text-sm"}
      role="img"
      aria-label={`Rating: ${value} out of ${MAX_RATING}`}
    >
      {"★".repeat(value)}
      <span className="text-border">{"★".repeat(MAX_RATING - value)}</span>
    </span>
  );
}

function RatingPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted w-28 text-sm">{label}</span>
      <div className="flex" role="radiogroup" aria-label={label}>
        {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${label}: ${star}`}
            className={`px-1 text-lg ${star <= value ? "text-warning" : "text-border"}`}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="space-y-2" data-testid="review-card">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        {review.edited && <Badge tone="neutral">Edited</Badge>}
        {review.replied_at && <Badge tone="info">Expert replied</Badge>}
      </div>
      <p className="text-foreground whitespace-pre-line text-sm">{review.body}</p>
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {SUB_SCORES.map(
          ({ key, label }) => review[key] != null && <span key={key}>{label}: {review[key]}/5</span>,
        )}
      </div>
      {review.expert_reply && (
        <div className="border-border bg-surface-2 rounded-md border-l-2 py-2 pl-3" data-testid="expert-reply">
          <p className="text-muted text-xs font-semibold">Response from the expert</p>
          <p className="text-foreground mt-1 whitespace-pre-line text-sm">{review.expert_reply}</p>
        </div>
      )}
    </div>
  );
}

export function ReviewComposer({
  existing,
  onSubmit,
  busy,
  submitLabel = "Publish review",
}: {
  existing?: Review | null;
  onSubmit: (input: { rating: number; body: string; subs: Record<SubScoreKey, number | null> }) => Promise<void>;
  busy: boolean;
  submitLabel?: string;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [subs, setSubs] = useState<Record<SubScoreKey, number | null>>({
    sub_quality: existing?.sub_quality ?? null,
    sub_communication: existing?.sub_communication ?? null,
    sub_timeliness: existing?.sub_timeliness ?? null,
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      data-testid="review-composer"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (rating < 1) {
          setError("Pick a star rating (required).");
          return;
        }
        if (body.trim().length < MIN_BODY_CHARS) {
          setError(`Share at least ${MIN_BODY_CHARS} characters about the work.`);
          return;
        }
        if (body.length > MAX_BODY_CHARS) {
          setError(`Reviews are limited to ${MAX_BODY_CHARS.toLocaleString()} characters.`);
          return;
        }
        try {
          await onSubmit({ rating, body: body.trim(), subs });
        } catch (submitError) {
          setError(submitError instanceof ApiError ? submitError.message : "Could not save the review.");
        }
      }}
    >
      <RatingPicker value={rating} onChange={setRating} label="Overall rating" />
      {SUB_SCORES.map(({ key, label }) => (
        <RatingPicker
          key={key}
          value={subs[key] ?? 0}
          onChange={(v) => setSubs((current) => ({ ...current, [key]: v }))}
          label={label}
        />
      ))}
      <div className="space-y-1.5">
        <label htmlFor="review-body" className="text-sm font-medium text-foreground">
          Your review
        </label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="What worked well? What could improve?"
        />
        <p className="text-muted text-xs">
          {MIN_BODY_CHARS}–{MAX_BODY_CHARS.toLocaleString()} characters. You can edit until the expert replies.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

export function ReviewReplyForm({
  onSubmit,
  busy,
}: {
  /** Kept in the signature for call-site uniformity; reply content is local state. */
  review?: Review;
  onSubmit: (reply: string, ratingOfStudent: number | null) => Promise<void>;
  busy: boolean;
}) {
  const [reply, setReply] = useState("");
  const [ratingOfStudent, setRatingOfStudent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 border-t border-border pt-3"
      data-testid="review-reply-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (reply.trim().length < MIN_BODY_CHARS) {
          setError(`Replies need at least ${MIN_BODY_CHARS} characters.`);
          return;
        }
        try {
          await onSubmit(reply.trim(), ratingOfStudent >= 1 ? ratingOfStudent : null);
        } catch (replyError) {
          setError(replyError instanceof ApiError ? replyError.message : "Could not post the reply.");
        }
      }}
    >
      <p className="text-muted text-xs">
        One reply, public and immutable afterwards. The student rating stays private (aggregates only).
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-muted w-28 text-sm">Rate the student</span>
        <div className="flex" role="radiogroup" aria-label="Rate the student (private)">
          {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={ratingOfStudent === star}
              aria-label={`Student rating: ${star} (private)`}
              className={`px-1 text-lg ${star <= ratingOfStudent ? "text-warning" : "text-border"}`}
              onClick={() => setRatingOfStudent(star)}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <Textarea
        aria-label="Your reply"
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        rows={3}
        placeholder="Respond publicly to this review…"
      />
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? "Posting…" : "Post reply"}
      </Button>
    </form>
  );
}

/** Order-workspace section: composer (student, none yet) / card + edit / reply (expert). */
export function ReviewSection({
  orderRole,
  review,
  busy,
  onSubmit,
  onEdit,
  onReply,
}: {
  orderRole: "student" | "expert";
  review: Review | null;
  busy: boolean;
  onSubmit: (input: { rating: number; body: string; subs: Record<SubScoreKey, number | null> }) => Promise<void>;
  onEdit: (reviewId: string, input: { rating: number; body: string; subs: Record<SubScoreKey, number | null> }) => Promise<void>;
  onReply: (reviewId: string, reply: string, ratingOfStudent: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (orderRole !== "student" && orderRole !== "expert") return null;

  if (!review) {
    if (orderRole !== "student") {
      return (
        <p className="text-muted text-sm" data-testid="review-none-expert">
          The client hasn&apos;t reviewed this order yet.
        </p>
      );
    }
    return (
      <div className="space-y-2" data-testid="review-composer-section">
        <h3 className="text-foreground text-sm font-semibold">Leave a review</h3>
        <ReviewComposer onSubmit={onSubmit} busy={busy} />
      </div>
    );
  }

  const editingAllowed = canEditReview(review, orderRole === "student");
  const replyAllowed = canReplyToReview(review, orderRole === "expert");

  return (
    <div className="space-y-3" data-testid="review-section">
      <h3 className="text-foreground text-sm font-semibold">
        {orderRole === "student" ? "Your review" : "Client review"}
      </h3>
      {editing && editingAllowed ? (
        <ReviewComposer
          existing={review}
          busy={busy}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await onEdit(review.id, input);
            setEditing(false);
          }}
        />
      ) : (
        <ReviewCard review={review} />
      )}
      {editingAllowed && !editing && (
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy}>
          Edit review
        </Button>
      )}
      {replyAllowed && <ReviewReplyForm onSubmit={(r, s) => onReply(review.id, r, s)} busy={busy} />}
    </div>
  );
}

export { Stars };
