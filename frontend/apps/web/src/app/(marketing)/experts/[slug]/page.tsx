"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import type { PublicExpert } from "@/features/experts/types";
import { reviewsApi } from "@/features/reviews/api";
import { ReviewCard, Stars } from "@/features/reviews/components/review-card";
import type { PublicReviewsFeed } from "@/features/reviews/types";

export default function ExpertPublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [expert, setExpert] = useState<PublicExpert | null>(null);
  const [feed, setFeed] = useState<PublicReviewsFeed | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    expertsApi
      .publicExpert(slug)
      .then((data) => {
        if (cancelled) return;
        setExpert(data);
        setState("ready");
        // reviews are secondary — the profile renders without them on failure
        reviewsApi
          .public(slug)
          .then((reviews) => {
            if (!cancelled) setFeed(reviews);
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" data-testid="profile-loading" />
      </div>
    );
  }

  if (state === "missing" || !expert) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted">This expert profile is not available.</p>
        <Link href="/experts" className="mt-4 inline-block text-sm underline">
          Back to the directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/experts" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Directory
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{expert.display_name}</h1>
          <p className="mt-1 text-sm text-muted">{expert.headline}</p>
          <p className="mt-2 flex items-center gap-2 text-sm" data-testid="expert-rating">
            {expert.rating_count > 0 && expert.rating_avg != null ? (
              <>
                <Stars value={Math.round(Number(expert.rating_avg))} />
                <span className="text-slate-700 dark:text-slate-200">{expert.rating_avg}</span>
                <span className="text-muted">
                  · {expert.rating_count} review{expert.rating_count === 1 ? "" : "s"} (recency-weighted)
                </span>
              </>
            ) : (
              <span className="text-muted">No reviews yet</span>
            )}
          </p>
        </div>
        {expert.availability === "available" ? (
          <Badge tone="success">Available</Badge>
        ) : (
          <Badge tone="neutral">Paused</Badge>
        )}
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">About</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted">{expert.bio}</p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Expertise</dt>
          <dd className="text-foreground">{expert.expertise_summary}</dd>
          <dt className="text-muted">Experience</dt>
          <dd className="text-foreground">{expert.experience_years} years</dd>
          {expert.qualifications && (
            <>
              <dt className="text-muted">Qualifications</dt>
              <dd className="text-foreground">{expert.qualifications}</dd>
            </>
          )}
          {expert.languages && (
            <>
              <dt className="text-muted">Languages</dt>
              <dd className="text-foreground">{expert.languages}</dd>
            </>
          )}
          <dt className="text-muted">Timezone</dt>
          <dd className="text-foreground">{expert.timezone}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {/* Subjects link to their landing page — this is the "spoke" half of
              the hub-and-spoke internal linking seo-ux.md asks for. */}
          {expert.subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.slug}`}>
              <Badge tone="info">{s.name}</Badge>
            </Link>
          ))}
          {expert.skills.map((s) => (
            <Badge key={s.id}>{s.name}</Badge>
          ))}
        </div>
      </Card>

      <Card className="mt-6" data-testid="expert-reviews">
        <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
        {feed === null ? null : feed.results.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No published reviews yet{feed.rating_count === 0 ? "" : " (moderation may hide reviews temporarily)"}.
          </p>
        ) : (
          <ul className="mt-4 space-y-5">
            {feed.results.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}