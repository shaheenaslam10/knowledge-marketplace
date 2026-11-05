"use client";

/** Expert: received reviews (published) with the one-time reply form —
 * Phase 9, BR-37 (docs/workflows/reviews.md). */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  MessageSquare,
} from "lucide-react";

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

  const metrics = useMemo(() => {
    if (!reviews || reviews.length === 0) return { avg: "5.0", count: 0, replied: 0 };
    const total = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
    const avg = (total / reviews.length).toFixed(1);
    const replied = reviews.filter((r) => r.replied_at).length;
    return { avg, count: reviews.length, replied };
  }, [reviews]);

  if (failed && reviews === null) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs -ml-2">
          <Link href="/expert/profile">
            <ArrowLeft className="size-3.5" /> Back to Expert Profile
          </Link>
        </Button>
        <Card className="p-6 border-danger/30 bg-danger/5">
          <p role="alert" className="text-danger text-sm font-medium flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            Could not load your reviews — please refresh.
          </p>
        </Card>
      </div>
    );
  }

  if (reviews === null) {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="expert-reviews-page">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted hover:text-foreground -ml-2 mb-1">
            <Link href="/expert/profile">
              <ArrowLeft className="size-3.5" /> Back to Expert Profile
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Client Reviews & Academic Ratings
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Star className="size-3 fill-amber-500 text-amber-500" />
              Verified Submissions
            </span>
          </div>
          <p className="text-muted mt-1 text-sm">
            Student feedback on completed engagements. Public ratings use a recency-weighted average (BR-39).
          </p>
        </div>
      </div>

      {/* 2. Rating Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Star className="size-5 fill-amber-500" />
          </div>
          <div>
            <span className="text-xs text-muted block">Recency Weighted Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground">{metrics.avg}</span>
              <span className="text-xs text-muted">/ 5.0</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <span className="text-xs text-muted block">Total Client Reviews</span>
            <span className="text-2xl font-black text-foreground">{metrics.count}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <span className="text-xs text-muted block">Public Replies Published</span>
            <span className="text-2xl font-black text-foreground">{metrics.replied}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 3. Reviews List */}
      {reviews.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Star className="size-8 mx-auto text-muted/60" />
          <h3 className="text-sm font-semibold text-foreground">No published reviews yet</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            Clients can review each completed order once. Verified feedback and ratings appear here the moment they are published.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} data-testid="received-review" className="p-5 border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  Order {review.order_number}
                </span>
                {review.replied_at ? (
                  <Badge tone="info" className="text-xs font-semibold">Replied</Badge>
                ) : (
                  <Badge tone="warning" className="text-xs font-semibold">Awaiting reply</Badge>
                )}
              </div>
              <ReviewCard review={review} />
              {canReplyToReview(review, true) && (
                <div className="rounded-xl border border-border/70 bg-surface-1 p-4">
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
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
