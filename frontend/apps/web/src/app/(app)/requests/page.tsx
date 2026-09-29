"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  ShieldCheck,
  Clock,
  MessageSquare,
  FileText,
  DollarSign,
  ChevronRight,
  Search,
  Filter,
  GraduationCap,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { requestsApi } from "@/features/requests/api";
import {
  REQUEST_STATUS_COPY,
  REQUEST_STATUS_TONE,
  type RequestStatus,
  type ServiceRequest,
} from "@/features/requests/types";
import { useSession } from "@/features/auth/SessionProvider";

type FilterTab = "all" | "bidding" | "active" | "completed";

export default function RequestsPage() {
  const { user } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    requestsApi
      .list()
      .then((r) => setRequests(r.results))
      .catch(() => setError("Could not load your requests."));
  }, []);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!requests) return { total: 0, bidding: 0, active: 0, completed: 0, totalOffers: 0 };
    let bidding = 0;
    let active = 0;
    let completed = 0;
    let totalOffers = 0;

    requests.forEach((req) => {
      totalOffers += req.offer_count || 0;
      if (req.status === "open" || req.status === "pooled" || req.status === "draft") {
        bidding += 1;
      } else if (req.status === "matched" || req.status === "in_progress" || req.status === "in_review") {
        active += 1;
      } else {
        completed += 1;
      }
    });

    return {
      total: requests.length,
      bidding,
      active,
      completed,
      totalOffers,
    };
  }, [requests]);

  // Filter requests based on tab and search
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((req) => {
      // Tab filter
      if (activeTab === "bidding") {
        if (!["open", "pooled", "draft"].includes(req.status)) return false;
      } else if (activeTab === "active") {
        if (!["matched", "in_progress", "in_review"].includes(req.status)) return false;
      } else if (activeTab === "completed") {
        if (!["completed", "cancelled", "expired", "rejected"].includes(req.status)) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = req.title?.toLowerCase().includes(query);
        const descMatch = req.description?.toLowerCase().includes(query);
        const subjectMatch = req.subject?.name?.toLowerCase().includes(query);
        return titleMatch || descMatch || subjectMatch;
      }
      return true;
    });
  }, [requests, activeTab, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 1. Executive Top Hero Strip */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/50 px-3 py-0.5 text-xs font-semibold text-primary">
                <GraduationCap className="size-3.5" />
                <span>Student Learning Workspace</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" />
                <span>Escrow Guarantee Protected</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(" ")[0] ?? "Scholar"}
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl">
              Track your academic briefs, review competitive proposals from verified doctoral specialists, and manage milestone deliverables.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              asChild
              className="h-11 px-5 font-semibold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-strong hover:to-indigo-700 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              <Link href="/requests/new" className="flex items-center gap-2">
                <Plus className="size-4" />
                <span>Start New Task Brief</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Quick Telemetry & Escrow Health Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Active Briefs</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {requests ? metrics.bidding + metrics.active : <Skeleton className="h-8 w-12" />}
            </span>
            <p className="mt-1 text-[11px] text-muted">Awaiting bids or in-flight</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Proposals Received</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {requests ? metrics.totalOffers : <Skeleton className="h-8 w-12" />}
            </span>
            <p className="mt-1 text-[11px] text-muted">Total specialist bids received</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Secure Escrow Protection</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">100%</span>
            <p className="mt-1 text-[11px] text-muted">Milestone-gated custodian hold</p>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Average Match SLA</span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-warning flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">&lt; 18m</span>
            <p className="mt-1 text-[11px] text-muted">Median time to first proposal</p>
          </div>
        </Card>
      </div>

      {/* 3. Dynamic Project Radar Navigation & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Visual Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              All Briefs ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bidding")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "bidding"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              Awaiting Bids ({metrics.bidding})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              In Progress ({metrics.active})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "completed"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              Archives ({metrics.completed})
            </button>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search briefs by title or topic…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-surface-2/60 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft/60 p-4 text-xs font-medium text-danger" role="alert">
            {error}
          </div>
        )}

        {/* Loading State */}
        {!requests && !error && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        )}

        {/* Empty State */}
        {requests && filteredRequests.length === 0 && (
          <Card className="p-12 text-center border-dashed border-border bg-card">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <FileText className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No academic briefs in this view</h3>
            <p className="mt-1.5 text-xs text-muted max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `No briefs matched your filter "${searchQuery}". Clear your search to see all active requests.`
                : "You haven't posted any requests in this category yet. Describe the academic assistance you need and vetted doctoral specialists will submit competitive proposals."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {searchQuery ? (
                <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>
                  Clear Filter
                </Button>
              ) : (
                <Button asChild size="sm" className="font-semibold">
                  <Link href="/requests/new">
                    <Plus className="size-4 mr-1.5" /> Create New Brief
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* 4. Rich Request Brief Cards */}
        <div className="grid gap-4">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              className="p-5 sm:p-6 border-border/80 bg-card hover:border-primary/40 transition-all duration-200 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {req.title || "Untitled Task Brief"}
                    </span>
                    <Badge tone={REQUEST_STATUS_TONE[req.status]}>
                      {REQUEST_STATUS_COPY[req.status]}
                    </Badge>
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

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted pt-1">
                    {req.budget_max_display != null && (
                      <span className="flex items-center gap-1 font-mono font-semibold text-foreground">
                        <DollarSign className="size-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Budget: Up to {req.budget_max_display} {req.currency}</span>
                      </span>
                    )}
                    {req.deadline && (
                      <span className="flex items-center gap-1 text-foreground">
                        <Clock className="size-3 text-warning" />
                        <span>Deadline: {req.deadline}</span>
                      </span>
                    )}
                    <span className="text-muted">
                      Created on {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right Action / Proposal Pill */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted block">
                      Proposals Status
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {req.offer_count === 0 ? (
                        <span className="text-muted font-normal text-xs">Waiting for specialists…</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {req.offer_count} proposal{req.offer_count === 1 ? "" : "s"} ready
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" asChild className="h-8 text-xs font-semibold">
                      <Link href={`/requests/${req.id}`}>
                        <span>Inspect Proposals</span>
                        <ChevronRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

