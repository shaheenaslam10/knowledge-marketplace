"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  Search,
  DollarSign,
  ArrowRight,
  Filter,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { feedApi } from "@/features/requests/api";
import { REQUEST_CATEGORIES, type ServiceRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/features/auth/SessionProvider";

type QuickFilter = "all" | "urgent" | "high_budget" | "managed" | "unbid";

export default function OpportunitiesPage() {
  const { user } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const load = useCallback(async (params: Record<string, string>) => {
    setError(null);
    try {
      const page = await feedApi.list(params);
      setRequests(page.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the feed.");
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    load({});
  }, [load]);

  // Compute live market intelligence
  const marketIntelligence = useMemo(() => {
    if (!requests) return { poolTotal: 0, count: 0, highBudgetCount: 0, urgentCount: 0 };
    let poolTotal = 0;
    let highBudgetCount = 0;
    let urgentCount = 0;

    requests.forEach((r) => {
      const budget = r.budget_max || r.budget_max_display || 0;
      poolTotal += budget;
      if (budget >= 150) highBudgetCount++;
      if (r.deadline && (r.deadline.includes("hour") || r.deadline.includes("12h") || r.deadline.includes("24h"))) {
        urgentCount++;
      }
    });

    return {
      poolTotal,
      count: requests.length,
      highBudgetCount,
      urgentCount,
    };
  }, [requests]);

  // Filter requests based on search, category, and quick filter pills
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((req) => {
      // Category filter
      if (category && req.category !== category) return false;

      // Quick filter
      const budget = req.budget_max || req.budget_max_display || 0;
      if (quickFilter === "urgent") {
        if (!req.deadline || (!req.deadline.includes("hour") && !req.deadline.includes("24h") && !req.deadline.includes("12h"))) {
          // If no explicit urgent string, skip
          return false;
        }
      } else if (quickFilter === "high_budget") {
        if (budget < 150) return false;
      } else if (quickFilter === "managed") {
        if (req.mode !== "managed") return false;
      } else if (quickFilter === "unbid") {
        if (req.bidding?.my_offer_status) return false;
      }

      // Search query
      if (q.trim()) {
        const query = q.toLowerCase();
        const titleMatch = req.title?.toLowerCase().includes(query);
        const descMatch = req.description?.toLowerCase().includes(query);
        const subjectMatch = req.subject?.name?.toLowerCase().includes(query);
        return titleMatch || descMatch || subjectMatch;
      }

      return true;
    });
  }, [requests, category, quickFilter, q]);

  return (
    <div className="space-y-8">
      {/* 1. Terminal Executive Header & Live Market Intelligence */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/50 px-3 py-0.5 text-xs font-semibold text-primary">
                <Zap className="size-3.5" />
                <span>Specialist Opportunity Terminal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Feed Active</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Market Opportunities
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Real-time academic briefs from students worldwide. One binding offer per brief (BR-15). Guaranteed milestone escrow protection with 85% net specialist payout.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild variant="secondary" className="h-10 text-xs font-semibold">
              <Link href="/assignments">
                <Briefcase className="size-3.5 mr-1.5" />
                <span>Managed Assignments</span>
              </Link>
            </Button>
            <Button asChild className="h-10 text-xs font-semibold bg-primary hover:bg-primary-strong text-primary-foreground shadow-md shadow-primary/25">
              <Link href="/expert/profile">
                <span>Specialist Cockpit</span>
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Live Market Intelligence Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Available Bounty Pool</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {requests ? `$${marketIntelligence.poolTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <Skeleton className="h-8 w-20" />}
            </span>
            <p className="mt-1 text-[11px] text-muted">Total active task budget pool</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Live Open Briefs</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {requests ? marketIntelligence.count : <Skeleton className="h-8 w-12" />}
            </span>
            <p className="mt-1 text-[11px] text-muted">Accepting specialist proposals</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Specialist Net Payout</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">85.0%</span>
            <p className="mt-1 text-[11px] text-muted">Flat 15% platform commission (BR-03)</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Urgent Opportunities</span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-warning flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {requests ? marketIntelligence.urgentCount : <Skeleton className="h-8 w-12" />}
            </span>
            <p className="mt-1 text-[11px] text-muted">Expedited turnaround (&lt; 24h)</p>
          </div>
        </Card>
      </div>

      {/* 3. Search & High-Frequency Control Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-sm">
          <form
            className="flex flex-1 flex-wrap items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              load({ ...(q ? { q } : {}), ...(category ? { category } : {}) });
            }}
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-surface-2/60 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                placeholder="Search title, discipline, or description…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search opportunities"
              />
            </div>

            <select
              className="h-9 rounded-xl border border-border bg-surface-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
            >
              <option value="">All Categories</option>
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs font-semibold">
              Filter Feed
            </Button>
          </form>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 md:pt-0 border-t md:border-t-0 border-border">
            <button
              type="button"
              onClick={() => setQuickFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                quickFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("high_budget")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                quickFilter === "high_budget"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              💎 High Budget ($150+)
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("managed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                quickFilter === "managed"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              🤝 Managed Tasks
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("unbid")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                quickFilter === "unbid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              Unbid Briefs
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3" role="alert">
            <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
              <Zap className="size-4 text-amber-500" />
              <span>Specialist Verification Required</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {error} Complete your academic specialist dossier to unlock access to live student bounties, direct quote requests, and fast-track escrow payouts.
            </p>
            <Button asChild size="sm" className="text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
              <Link href="/expert/apply">
                <span>Complete Specialist Application →</span>
              </Link>
            </Button>
          </div>
        )}

        {/* Loading State */}
        {!requests && !error && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        )}

        {/* Empty State */}
        {requests && filteredRequests.length === 0 && (
          <Card className="p-12 text-center border-dashed border-border bg-card">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Briefcase className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No opportunities matching your criteria</h3>
            <p className="mt-1.5 text-xs text-muted max-w-md mx-auto leading-relaxed">
              New academic briefs arrive continuously. Try adjusting your search query or switching filter pills to view available bounties.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQ("");
                  setCategory("");
                  setQuickFilter("all");
                  load({});
                }}
              >
                Reset All Filters
              </Button>
            </div>
          </Card>
        )}

        {/* 4. Terminal Opportunity Rows */}
        <div className="grid gap-4">
          {filteredRequests.map((req) => {
            const maxBudget = req.budget_max || req.budget_max_display || 0;
            const netTakeHome = (maxBudget * 0.85).toFixed(2);
            const hasOffered = Boolean(req.bidding?.my_offer_status);

            return (
              <Card
                key={req.id}
                className="p-5 sm:p-6 border-border/80 bg-card hover:border-primary/40 transition-all duration-200 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {req.title}
                      </span>
                      {hasOffered ? (
                        <Badge tone="info" className="text-[11px] font-bold">
                          ✓ Offer Submitted
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="text-[11px]">
                          Accepting Proposals
                        </Badge>
                      )}
                      <span className="text-[11px] font-semibold text-muted bg-surface-2 px-2.5 py-0.5 rounded-full border border-border">
                        {req.mode === "managed" ? "White-Glove Match" : "Open Market"}
                      </span>
                      {req.subject?.name && (
                        <span className="text-[11px] font-medium text-primary bg-primary-soft/40 px-2.5 py-0.5 rounded-full border border-primary/20">
                          {req.subject.name}
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-2 text-xs text-muted leading-relaxed">
                      {req.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted pt-1">
                      {req.offer_count != null && (
                        <span className="text-foreground font-medium">
                          {req.offer_count} competing bid{req.offer_count === 1 ? "" : "s"}
                        </span>
                      )}
                      {req.deadline && (
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <Clock className="size-3 text-warning" />
                          <span>Needed by {req.deadline}</span>
                        </span>
                      )}
                      {req.attachments && req.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Paperclip className="size-3" />
                          <span>{req.attachments.length} attached document{req.attachments.length === 1 ? "" : "s"}</span>
                        </span>
                      )}
                      <span className="text-muted text-[11px]">
                        Posted {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Financial Payout Terminal & Action Box */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
                    <div className="text-left lg:text-right">
                      {maxBudget > 0 ? (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                            Student Budget: {maxBudget} {req.currency}
                          </span>
                          <p className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ${netTakeHome} <span className="text-xs font-normal text-muted">Net Payout</span>
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-muted">Open to Quotes</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasOffered ? "secondary" : "primary"}
                        size="sm"
                        asChild
                        className={`h-9 px-4 text-xs font-semibold shadow-sm ${
                          !hasOffered ? "bg-primary hover:bg-primary-strong text-primary-foreground" : ""
                        }`}
                      >
                        <Link href={`/opportunities/${req.id}`}>
                          <span>{hasOffered ? "View Offer Status" : "Calculate & Bid"}</span>
                          <ArrowRight className="size-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
