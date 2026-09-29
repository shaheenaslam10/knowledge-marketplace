"use client";

/** Expert opportunity feed — Studypool-style opportunity discovery feed with instant filters & cards. */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { feedApi } from "@/features/requests/api";
import { REQUEST_CATEGORIES, type ServiceRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api/client";

export default function OpportunitiesPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [budgetFilter, setBudgetFilter] = useState<"all" | "low" | "medium" | "high">("all");

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

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((req) => {
      if (budgetFilter === "all") return true;
      const max = req.budget_max_display ?? 0;
      if (budgetFilter === "low") return max < 100;
      if (budgetFilter === "medium") return max >= 100 && max <= 300;
      if (budgetFilter === "high") return max > 300;
      return true;
    });
  }, [requests, budgetFilter]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    if (!requests) return { totalOpportunities: 0, totalPoolValue: 0, avgBudget: 0, myOffers: 0 };
    const totalOpportunities = requests.length;
    const totalPoolValue = requests.reduce((sum, r) => sum + (r.budget_max_display || 0), 0);
    const avgBudget = totalOpportunities > 0 ? Math.round(totalPoolValue / totalOpportunities) : 0;
    const myOffers = requests.filter((r) => r.bidding?.my_offer_status).length;
    return { totalOpportunities, totalPoolValue, avgBudget, myOffers };
  }, [requests]);

  return (
    <div className="space-y-8">
      {/* 1. Header & Live Market Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Opportunity Intelligence Feed
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Bidding
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Vetted student academic requests. Compete on quality and credentials with blind bidding (BR-15).
          </p>
        </div>
      </div>

      {/* 2. Market Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <span className="text-xs text-muted block mb-1">Open Requests</span>
          <span className="text-2xl font-black text-foreground">{metrics.totalOpportunities}</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <span className="text-xs text-muted block mb-1">Total Market Pool</span>
          <span className="text-2xl font-black text-primary">
            ${metrics.totalPoolValue.toLocaleString()}
          </span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <span className="text-xs text-muted block mb-1">Avg. Request Value</span>
          <span className="text-2xl font-black text-emerald-500">
            ${metrics.avgBudget}
          </span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <span className="text-xs text-muted block mb-1">Your Active Bids</span>
          <span className="text-2xl font-black text-indigo-500">{metrics.myOffers}</span>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Controls */}
      <div className="space-y-3">
        <form
          className="flex flex-col sm:flex-row gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            load({ ...(q ? { q } : {}), ...(category ? { category } : {}) });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              className="pl-10 h-10 text-sm rounded-xl bg-surface-1 border-border/70"
              placeholder="Search by topic, methodology, keywords (e.g. Econometrics, Python, Calculus)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search"
            />
          </div>
          <select
            className="h-10 rounded-xl border border-border/70 bg-surface-1 px-3.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              load({ ...(q ? { q } : {}), ...(e.target.value ? { category: e.target.value } : {}) });
            }}
            aria-label="Category"
          >
            <option value="">All Disciplines & Categories</option>
            {REQUEST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" className="h-10 px-5 text-xs font-semibold shrink-0">
            Filter Results
          </Button>
        </form>

        {/* Budget filter chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted font-medium flex items-center gap-1 mr-1">
            <Filter className="size-3" /> Budget:
          </span>
          {[
            { id: "all", label: "All Budgets" },
            { id: "low", label: "Under $100" },
            { id: "medium", label: "$100 – $300" },
            { id: "high", label: "$300+" },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setBudgetFilter(chip.id as typeof budgetFilter)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                budgetFilter === chip.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted hover:text-foreground hover:bg-surface-3"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Requests Feed */}
      {!requests && !error && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {requests && filteredRequests.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1 space-y-3">
          <Briefcase className="size-10 mx-auto text-muted/60" />
          <h3 className="text-sm font-semibold text-foreground">No matching opportunities found</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            Try adjusting your search query, selecting a broader discipline, or clearing budget filters.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setQ("");
              setCategory("");
              setBudgetFilter("all");
              load({});
            }}
            className="text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {filteredRequests.map((req) => {
          const hasBids = req.offer_count > 0;
          const myOffer = req.bidding?.my_offer_status;

          return (
            <Card
              key={req.id}
              className="group relative overflow-hidden border-border/80 p-5 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {req.subject?.name ?? req.category}
                    </span>
                    {req.deadline && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Clock className="size-3" />
                        Due {new Date(req.deadline).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    )}
                    {myOffer ? (
                      <Badge tone={myOffer === "pending" ? "info" : "neutral"} className="text-[11px]">
                        ✓ Your Offer: {myOffer}
                      </Badge>
                    ) : null}
                  </div>

                  <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {req.title}
                  </h2>

                  <p className="line-clamp-2 text-xs text-muted leading-relaxed">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <TrendingUp className="size-3.5 text-primary" />
                      {req.offer_count} {req.offer_count === 1 ? "expert offer" : "expert offers"}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{req.pricing_type} scope</span>
                    {req.attachments.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-muted">
                          <FileText className="size-3" />
                          {req.attachments.length} attachment{req.attachments.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Price & Bid Action Box */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">
                      Student Budget
                    </span>
                    <span className="text-lg sm:text-xl font-black text-foreground">
                      {req.budget_max_display != null
                        ? `$${req.budget_max_display} ${req.currency}`
                        : "Open Budget"}
                    </span>
                    {req.budget_max_display != null && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                        Net ~${Math.round(req.budget_max_display * 0.85)} take-home
                      </span>
                    )}
                  </div>

                  <Button asChild size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                    <Link href={`/opportunities/${req.id}`}>
                      {myOffer ? "Review / Edit Offer" : "Inspect & Place Bid"}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
