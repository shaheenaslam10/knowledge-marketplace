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
        <p className="text-sm text-slate-500 dark:text-slate-400">This expert profile is not available.</p>
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{expert.display_name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{expert.headline}</p>
          <p className="mt-2 flex items-center gap-2 text-sm" data-testid="expert-rating">
            {expert.rating_count > 0 && expert.rating_avg != null ? (
              <>
                <Stars value={Math.round(Number(expert.rating_avg))} />
                <span className="text-slate-700 dark:text-slate-200">{expert.rating_avg}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  · {expert.rating_count} review{expert.rating_count === 1 ? "" : "s"} (recency-weighted)
                </span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">No reviews yet</span>
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
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">About</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{expert.bio}</p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Expertise</dt>
          <dd className="text-slate-900 dark:text-slate-100">{expert.expertise_summary}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Experience</dt>
          <dd className="text-slate-900 dark:text-slate-100">{expert.experience_years} years</dd>
          {expert.qualifications && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Qualifications</dt>
              <dd className="text-slate-900 dark:text-slate-100">{expert.qualifications}</dd>
            </>
          )}
          {expert.languages && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Languages</dt>
              <dd className="text-slate-900 dark:text-slate-100">{expert.languages}</dd>
            </>
          )}
          <dt className="text-slate-500 dark:text-slate-400">Timezone</dt>
          <dd className="text-slate-900 dark:text-slate-100">{expert.timezone}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {expert.subjects.map((s) => (
            <Badge key={s.id} tone="info">
              {s.name}
            </Badge>
          ))}
          {expert.skills.map((s) => (
            <Badge key={s.id}>{s.name}</Badge>
          ))}
        </div>
      </Card>

      <Card className="mt-6" data-testid="expert-reviews">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reviews</h2>
        {feed === null ? null : feed.results.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
