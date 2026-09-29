"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  Clock,
  Coins,
  FileCheck,
  Filter,
  GraduationCap,
  Layers,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { requestsApi } from "@/features/requests/api";
import {
  REQUEST_STATUS_COPY,
  REQUEST_STATUS_TONE,
  type ServiceRequest,
  type RequestStatus,
} from "@/features/requests/types";

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    requestsApi
      .list()
      .then((r) => setRequests(r.results))
      .catch(() => setError("Could not load your requests."));
  }, []);

  // Calculate dashboard metric cards
  const metrics = useMemo(() => {
    if (!requests) return { activeOrders: 0, pendingBids: 0, totalEscrow: 0, completed: 0 };
    const activeOrders = requests.filter((r) => r.status === "matched" || r.status === "in_progress").length;
    const pendingBids = requests.reduce((acc, r) => acc + (r.offer_count || 0), 0);
    const completed = requests.filter((r) => r.status === "completed").length;
    const totalEscrow = requests
      .filter((r) => r.status === "matched" || r.status === "in_progress")
      .reduce((acc, r) => acc + (r.budget_max_display || 0), 0);

    return { activeOrders, pendingBids, totalEscrow, completed };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "open" && (r.status === "open" || r.status === "in_review" || r.status === "pooled")) ||
        (filterStatus === "active" && (r.status === "matched" || r.status === "in_progress")) ||
        (filterStatus === "completed" && r.status === "completed");

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, filterStatus]);

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Learning Dashboard
            </h1>
            <Badge tone="info">Student Workspace</Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Track active consultation requests, compare specialist bids, and inspect milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="h-10 px-5 text-xs font-semibold shadow-md shadow-primary/20">
            <Link href="/requests/new">
              <span className="flex items-center gap-1.5">
                <Plus className="size-4" /> Create Request
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards (Studybay Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: In-Progress Orders */}
        <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">In-Progress Orders</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {metrics.activeOrders}
            </span>
            <span className="text-xs text-muted">active</span>
          </div>
        </div>

        {/* Metric 2: Pending Expert Bids */}
        <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Pending Expert Bids</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {metrics.pendingBids}
            </span>
            <span className="text-xs text-muted">proposals</span>
          </div>
        </div>

        {/* Metric 3: Funds in Escrow */}
        <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Funds in Escrow</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              ${metrics.totalEscrow}
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold">100% Protected</span>
          </div>
        </div>

        {/* Metric 4: Completed Projects */}
        <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Completed Projects</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-surface-2 text-foreground">
              <FileCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {metrics.completed}
            </span>
            <span className="text-xs text-muted">sessions</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="inline-flex rounded-xl border border-border/80 bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            All Requests ({requests?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("open")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "open"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Open for Bids
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("active")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Active In-Progress
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("completed")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === "completed"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Filter requests by title or subject…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!requests && !error && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      )}

      {/* Empty State */}
      {requests && filteredRequests.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border/80 bg-surface/50 p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Plus className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">No matching requests found</h3>
          <p className="mt-1 text-xs sm:text-sm text-muted max-w-md mx-auto">
            {searchQuery
              ? "Try adjusting your search query or status filter."
              : "Describe your project or assignment needs to let verified doctoral specialists bid or get matched instantly."}
          </p>
          <div className="mt-6">
            <Link href="/requests/new">
              <Button size="sm" className="h-10 px-5 text-xs font-semibold">
                Post New Request
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Rich Request Cards List */}
      <div className="grid gap-4">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className="group rounded-2xl border border-border/80 bg-surface/90 p-5 sm:p-6 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    {req.subject?.name ?? "General Discipline"}
                  </span>
                  <Badge tone={REQUEST_STATUS_TONE[req.status]}>
                    {REQUEST_STATUS_COPY[req.status]}
                  </Badge>
                  {req.mode === "managed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      <Sparkles className="size-3" /> Managed Matching
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                      <Users className="size-3" /> Open Bids Pool
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {req.title || "Untitled draft"}
                </h2>

                <p className="line-clamp-2 text-xs sm:text-sm text-muted leading-relaxed">
                  {req.description}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Users className="size-3.5 text-primary" />
                    <span>{req.offer_count} {req.offer_count === 1 ? "bid received" : "bids received"}</span>
                  </span>
                  {req.budget_max_display != null && (
                    <span className="flex items-center gap-1">
                      <Coins className="size-3.5 text-muted" />
                      <span>Budget: <strong className="text-foreground">{req.budget_max_display} {req.currency}</strong></span>
                    </span>
                  )}
                  {req.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 text-muted" />
                      <span>Deadline: {new Date(req.deadline).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                <Button variant="secondary" size="sm" asChild className="text-xs font-semibold">
                  <Link href={`/requests/${req.id}`}>
                    <span className="flex items-center gap-1">
                      Inspect Details <ArrowRight className="size-3.5" />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
