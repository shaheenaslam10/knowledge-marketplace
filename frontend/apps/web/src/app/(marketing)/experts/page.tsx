"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, BookOpen, Star, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import type { PublicExpert } from "@/features/experts/types";

/**
 * Public expert directory (Phase 3 & Sprint 6): approved + public-visibility experts only.
 * High-moat filters: Instant 1:1 Booking, Published Catalog Assets, 4.5+ Rating.
 */
export default function ExpertDirectoryPage() {
  const [experts, setExperts] = useState<PublicExpert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [hasAssetsOnly, setHasAssetsOnly] = useState(false);
  const [ratingMin, setRatingMin] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (availableOnly) params.availability = "available";
    if (hasAssetsOnly) params.has_assets = "true";
    if (ratingMin) params.rating_min = ratingMin;

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
  }, [q, availableOnly, hasAssetsOnly, ratingMin]);

  const activeFiltersCount =
    (availableOnly ? 1 : 0) + (hasAssetsOnly ? 1 : 0) + (ratingMin ? 1 : 0);

  function clearFilters() {
    setAvailableOnly(false);
    setHasAssetsOnly(false);
    setRatingMin("");
    setQ("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Expert Directory</h1>
        <p className="text-sm text-muted max-w-2xl">
          Browse vetted scholars, educators, and domain practitioners. Every specialist has passed identity and credential verification.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, expertise, or keywords…"
            aria-label="Search experts"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="flex items-center gap-1 text-muted font-medium pr-1">
            <SlidersHorizontal className="size-3.5" /> Filter by:
          </span>

          <button
            onClick={() => setAvailableOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 border ${
              availableOnly
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface-1 text-muted border-border hover:border-primary/40 hover:text-foreground"
            }`}
            data-testid="filter-instant-booking"
          >
            <Zap className={`size-3.5 ${availableOnly ? "text-amber-300" : "text-amber-500"}`} />
            Available for Instant 1:1 Booking
          </button>

          <button
            onClick={() => setHasAssetsOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 border ${
              hasAssetsOnly
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface-1 text-muted border-border hover:border-primary/40 hover:text-foreground"
            }`}
            data-testid="filter-has-assets"
          >
            <BookOpen className="size-3.5" />
            Has Published Digital Assets
          </button>

          <button
            onClick={() => setRatingMin((prev) => (prev === "4.5" ? "" : "4.5"))}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 border ${
              ratingMin === "4.5"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface-1 text-muted border-border hover:border-primary/40 hover:text-foreground"
            }`}
            data-testid="filter-rating-45"
          >
            <Star className={`size-3.5 ${ratingMin === "4.5" ? "text-amber-300 fill-amber-300" : "text-amber-500"}`} />
            Top Rated (4.5+ ★)
          </button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-7 px-2 text-muted hover:text-danger gap-1"
            >
              <X className="size-3" /> Clear filters ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {experts === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="directory-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      )}

      {experts?.length === 0 && (
        <Card variant="glass" className="text-center py-12 space-y-3">
          <p className="text-sm text-muted font-medium" data-testid="directory-empty">
            No experts match your current filters.
          </p>
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Reset Filters
          </Button>
        </Card>
      )}

      <div className="grid gap-5 sm:grid-cols-2" data-testid="directory-list">
        {experts?.map((expert) => (
          <Link key={expert.slug} href={`/experts/${expert.slug}`} className="group">
            <Card variant="glass" hover className="h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {expert.display_name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted font-medium">{expert.headline}</p>
                  </div>
                  {expert.availability === "available" ? (
                    <Badge tone="success" pulse>Available</Badge>
                  ) : (
                    <Badge tone="neutral">Paused</Badge>
                  )}
                </div>

                <p className="line-clamp-2 text-xs text-muted leading-relaxed">{expert.expertise_summary}</p>

                {/* Badges row: subjects + high-moat features */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {expert.subjects.slice(0, 3).map((s) => (
                    <Badge key={s.id} tone="info">
                      {s.name}
                    </Badge>
                  ))}
                  {expert.availability === "available" && expert.session_30m_price && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Zap className="size-3" /> 1:1 Instant: ${(expert.session_30m_price / 100).toFixed(0)}/30m
                    </span>
                  )}
                  {expert.has_published_assets && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <BookOpen className="size-3" /> Author
                    </span>
                  )}
                </div>
              </div>

              {expert.rating_count > 0 ? (
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    {expert.rating_avg}
                  </span>
                  <span>{expert.rating_count} review{expert.rating_count === 1 ? "" : "s"}</span>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                  <span className="text-[11px] text-muted">New specialist</span>
                  <span className="text-[11px] text-muted">{expert.experience_years}y exp</span>
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
