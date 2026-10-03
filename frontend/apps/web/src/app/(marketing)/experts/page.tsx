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
    <div className="mx-auto w-full max-w-5xl py-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Expert Directory</h1>
        <p className="text-sm text-muted max-w-2xl">
          Browse vetted scholars, educators, and domain practitioners. Every specialist has passed identity and credential verification.
        </p>
      </div>

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

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {experts === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="directory-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      )}

      {experts?.length === 0 && (
        <Card variant="glass" className="text-center py-12">
          <p className="text-sm text-muted" data-testid="directory-empty">
            No experts match your search query. Try broader keywords or browse subjects.
          </p>
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
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {expert.subjects.slice(0, 3).map((s) => (
                    <Badge key={s.id} tone="info">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {expert.rating_count > 0 && (
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                  <span className="font-medium text-foreground">★ {expert.rating_avg}</span>
                  <span>{expert.rating_count} review{expert.rating_count === 1 ? "" : "s"}</span>
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
