"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import type { PublicExpert } from "@/features/experts/types";

/**
 * Public expert directory (Phase 3): approved + public-visibility experts only.
 * Server-side rules do the real filtering; this is a search/browse surface.
 */
export default function ExpertDirectoryPage() {
  const [experts, setExperts] = useState<PublicExpert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    expertsApi
      .directory(params)
      .then((page) => {
        if (!cancelled) setExperts(page.results);
      })
      .catch(() => {
        if (!cancelled) setError("The directory is unavailable right now. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Expert directory</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Vetted tutors and coaches — every expert here has passed credential review.
      </p>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, focus or bio…"
        aria-label="Search experts"
        className="mt-6 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {experts === null && !error && (
        <div className="mt-8 space-y-3" data-testid="directory-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
          ))}
        </div>
      )}

      {experts?.length === 0 && (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400" data-testid="directory-empty">
          No experts match your search yet.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2" data-testid="directory-list">
        {experts?.map((expert) => (
          <Link key={expert.slug} href={`/experts/${expert.slug}`} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{expert.display_name}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{expert.headline}</p>
                </div>
                {expert.availability === "available" ? (
                  <Badge tone="success">Available</Badge>
                ) : (
                  <Badge tone="neutral">Paused</Badge>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{expert.expertise_summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {expert.subjects.slice(0, 3).map((s) => (
                  <Badge key={s.id} tone="info">
                    {s.name}
                  </Badge>
                ))}
              </div>
              {expert.rating_count > 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  ★ {expert.rating_avg} · {expert.rating_count} review{expert.rating_count === 1 ? "" : "s"}
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
