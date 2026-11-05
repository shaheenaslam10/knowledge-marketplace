"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Sparkles, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface CohortItem {
  id: string;
  slug: string;
  title: string;
  expert: string;
  credential: string;
  price: string;
  enrolled: number;
  maxSeats: number;
  dateStr: string;
  summary: string;
}

const FEATURED_COHORTS: CohortItem[] = [
  {
    id: "rag-workshop",
    slug: "production-rag-evaluation-workshop",
    title: "Production RAG Systems: Evaluation & Benchmarking Workshop",
    expert: "Dr. Ayra K.",
    credential: "Ph.D. Distributed Systems · MIT",
    price: "$65.00",
    enrolled: 14,
    maxSeats: 20,
    dateStr: "Nov 12, 2026 · 18:00 UTC",
    summary: "Hands-on engineering workshop covering RAG triad evaluation, embedding drift, and hybrid retrieval tuning.",
  },
  {
    id: "dist-systems",
    slug: "distributed-systems-design-masterclass",
    title: "Distributed Systems Design & Fault Tolerance Masterclass",
    expert: "Dr. Elena R.",
    credential: "Postdoc Econometrics · Stanford",
    price: "$85.00",
    enrolled: 8,
    maxSeats: 15,
    dateStr: "Nov 15, 2026 · 17:00 UTC",
    summary: "Multi-datacenter consensus, Raft quorum nuances, and chaos engineering simulations with live code review.",
  },
  {
    id: "postgres-deepdive",
    slug: "postgres-internals-indexing-deep-dive",
    title: "PostgreSQL Internals & Query Optimization Deep Dive",
    expert: "Dr. Elena R.",
    credential: "Postdoc Econometrics · Stanford",
    price: "$75.00",
    enrolled: 24,
    maxSeats: 25,
    dateStr: "Nov 18, 2026 · 19:00 UTC",
    summary: "B-Tree vs BRIN indexing, WAL architecture, buffer cache tuning, and EXPLAIN ANALYZE bottleneck tracing.",
  },
];

export function FeaturedCohortsShowcase() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Users className="size-3.5" />
            <span>Interactive Multi-Seat Micro-Cohorts</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Trending Live Workshops &amp; Cohorts
          </h2>
          <p className="text-sm text-muted max-w-xl">
            Learn interactively in small, scheduled cohorts hosted by verified scholars. Real-time capacity limits and calendar sync included.
          </p>
        </div>

        <Button variant="ghost" asChild className="self-start sm:self-auto text-xs font-bold">
          <Link href="/catalog?type=live_cohort">View All Workshops &amp; Blueprints →</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURED_COHORTS.map((cohort) => {
          const percent = Math.min(100, Math.round((cohort.enrolled / cohort.maxSeats) * 100));
          const isNearlyFull = percent >= 80;

          return (
            <div
              key={cohort.id}
              className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Video className="size-3.5" /> Live Workshop
                  </span>
                  <span className="font-mono font-extrabold text-sm text-foreground">
                    {cohort.price}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-foreground leading-snug line-clamp-2">
                  {cohort.title}
                </h3>

                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                  {cohort.summary}
                </p>

                {/* Seat Scarcity Telemetry */}
                <div className="rounded-xl bg-surface-2/60 border border-border/60 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted">Seats Reserved</span>
                    <span className={isNearlyFull ? "text-danger" : "text-foreground"}>
                      {cohort.enrolled} / {cohort.maxSeats} Booked
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearlyFull ? "bg-danger" : "bg-amber-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-primary" /> {cohort.dateStr}
                    </span>
                    {isNearlyFull && (
                      <span className="font-bold text-danger">Almost Full!</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">{cohort.expert}</p>
                  <p className="text-[10px] text-muted truncate max-w-[140px]">{cohort.credential}</p>
                </div>

                <Button size="sm" variant="glow" asChild className="h-8 px-3 text-xs font-bold">
                  <Link href={`/catalog`}>
                    Reserve Seat
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

