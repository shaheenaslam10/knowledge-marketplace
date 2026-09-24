"use client";

/** Expert: received reviews (published) with the one-time reply form —
 * Phase 9, BR-37 (docs/workflows/reviews.md). */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { reviewsApi } from "@/features/reviews/api";
import { ReviewCard, ReviewReplyForm } from "@/features/reviews/components/review-card";
import { canReplyToReview, type Review } from "@/features/reviews/types";
import { ApiError } from "@/lib/api/client";

export default function ExpertReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReviews((await reviewsApi.received()).results);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed && reviews === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <p role="alert" className="text-danger text-sm">
          Could not load your reviews — please refresh.
        </p>
      </div>
    );
  }

  if (reviews === null) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-10" aria-busy>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-3/4 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10" data-testid="expert-reviews-page">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Reviews you received</h1>
        <p className="text-muted mt-1 text-sm">
          Public ratings use a recency-weighted average (BR-39). Reply once per review — replies are public
          and permanent.
        </p>
      </div>

      {notice && (
        <p role="status" className="text-success text-sm">
          {notice}
        </p>
      )}

      {reviews.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">
            No reviews yet — clients can review each completed order once. They appear here the moment they
            are published.
          </p>
        </Card>
      ) : (
        reviews.map((review) => (
          <Card key={review.id} data-testid="received-review">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs">Order {review.order_number}</p>
                {review.replied_at ? <Badge tone="info">Replied</Badge> : <Badge tone="warning">Awaiting reply</Badge>}
              </div>
              <ReviewCard review={review} />
              {canReplyToReview(review, true) && (
                <ReviewReplyForm
                  busy={busyId === review.id}
                  onSubmit={async (reply, ratingOfStudent) => {
                    setBusyId(review.id);
                    setNotice(null);
                    try {
                      await reviewsApi.reply(review.id, reply, ratingOfStudent);
                      await load();
                      setNotice("Reply published.");
                    } catch (replyError) {
                      setNotice(
                        replyError instanceof ApiError && replyError.code === "duplicate_reply"
                          ? "You already replied to this review."
                          : "Could not post the reply.",
                      );
                    } finally {
                      setBusyId(null);
                    }
                  }}
                />
              )}
            </div>
          </Card>
        ))
      )}

      <Button variant="ghost" asChild>
        <a href="/expert/profile" className="text-sm">
          ← Expert profile
        </a>
      </Button>
    </div>
  );
}
