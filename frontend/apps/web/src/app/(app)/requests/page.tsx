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
  CheckCircle2,
  Lock,
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

function getSubjectBadgeClass(subjectName?: string) {
  if (!subjectName) return "bg-primary/10 text-primary border-primary/20";
  const lower = subjectName.toLowerCase();
  if (
    lower.includes("cs") ||
    lower.includes("computer") ||
    lower.includes("code") ||
    lower.includes("software") ||
    lower.includes("ai") ||
    lower.includes("data")
  ) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25";
  }
  if (
    lower.includes("math") ||
    lower.includes("stat") ||
    lower.includes("calculus") ||
    lower.includes("algebra") ||
    lower.includes("geometry")
  ) {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25";
  }
  if (
    lower.includes("econ") ||
    lower.includes("finance") ||
    lower.includes("accounting") ||
    lower.includes("business") ||
    lower.includes("market")
  ) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
  }
  if (
    lower.includes("eng") ||
    lower.includes("physics") ||
    lower.includes("chem") ||
    lower.includes("biology")
  ) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25";
  }
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25";
}

export default function RequestsPage() {
  const { user } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    requestsApi
      .list()
      .then((r) => {
        // Filter strictly to authentic student briefs, excluding seeded portal demo records
        const scoped = (r.results || []).filter(
          (req) => !req.title?.toLowerCase().startsWith("portal demo"),
        );
        setRequests(scoped);
      })
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
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                🔥 5-Day Academic Streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" />
                <span>Escrow Guarantee Protected</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                ⭐ Top Match SLA (&lt;18m)
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

      {/* AI Quick Task Launchpad (Interactive Accelerators) */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-surface-1 to-violet-500/5 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Quick Launchpad</h2>
              <p className="text-[11px] text-muted">Select an academic challenge to generate an instant structured brief:</p>
            </div>
          </div>
          <Link
            href="/requests/new"
            className="text-xs font-semibold text-primary hover:text-primary-strong flex items-center gap-1 group self-start md:self-auto"
          >
            <span>Custom Brief Builder</span>
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[
            {
              label: "⚡ Python / Algorithm Optimization",
              title: "Python Algorithm Optimization & Vectorization",
              prompt: "Need assistance profiling and optimizing Python code bottlenecks, vectorizing operations with NumPy/Pandas, and ensuring clean asymptotic runtime complexity.",
              category: "code_review",
            },
            {
              label: "📐 Multivariable Calculus & Proofs",
              title: "Multivariable Calculus & Differential Proofs",
              prompt: "Need step-by-step conceptual walkthrough and verification of multivariable calculus proofs and coordinate transformation problems.",
              category: "tutoring",
            },
            {
              label: "📝 Academic Paper & Thesis Review",
              title: "Academic Paper & Literature Review Critique",
              prompt: "Need comprehensive peer review of academic tone, literature review framing, citation rigor, and thesis counter-arguments.",
              category: "tutoring",
            },
            {
              label: "📊 Econometrics & Regression Models",
              title: "Econometrics Regression & Time-Series Modeling",
              prompt: "Need guidance resolving heteroskedasticity, autocorrelation, and interpreting multivariate regression results in Stata / R.",
              category: "tutoring",
            },
            {
              label: "🧠 Machine Learning & PyTorch",
              title: "PyTorch Model Debugging & Loss Convergence",
              prompt: "Need specialist review of custom PyTorch loss function, gradient clipping, and validation curve overfitting.",
              category: "code_review",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={`/requests/new?title=${encodeURIComponent(item.title)}&prompt=${encodeURIComponent(item.prompt)}&category=${encodeURIComponent(item.category)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-surface-1 hover:bg-surface-2 hover:border-primary/40 text-xs font-semibold text-foreground transition-all hover:scale-[1.02] shadow-2xs group"
            >
              <span>{item.label}</span>
              <Sparkles className="size-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Balanced Asymmetric 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (67% width = 8 cols): Filter tabs, search, and compact request cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Tabs & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            {/* Visual Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "completed"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
              >
                Archives ({metrics.completed})
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search briefs by topic…"
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

          {/* Loading Skeleton State */}
          {!requests && !error && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          )}

          {/* High-Energy Empty State */}
          {requests && filteredRequests.length === 0 && (
            <Card className="p-10 text-center border-dashed border-border bg-card">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <FileText className="size-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {searchQuery ? "No matching academic briefs" : "No active task briefs in this view"}
              </h3>
              <p className="mt-1.5 text-xs text-muted max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? `No briefs matched your query "${searchQuery}". Clear your search filter to see all active requests.`
                  : "Post your first academic brief. Vetted doctoral specialists from Stanford, MIT, and Oxford will review your scope and submit blind proposals within minutes."}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                {searchQuery ? (
                  <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>
                    Clear Filter
                  </Button>
                ) : (
                  <Button asChild size="sm" className="font-semibold shadow-sm">
                    <Link href="/requests/new">
                      <Plus className="size-4 mr-1.5" /> Post Your First Academic Brief
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Compact, Well-Proportioned Request Brief Cards */}
          <div className="space-y-3.5">
            {filteredRequests.map((req) => (
              <Card
                key={req.id}
                className="p-5 border-border/80 bg-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate max-w-md">
                        {req.title || "Untitled Task Brief"}
                      </span>
                      <Badge tone={REQUEST_STATUS_TONE[req.status]}>
                        {REQUEST_STATUS_COPY[req.status]}
                      </Badge>
                      <span className="text-[10px] font-semibold text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border">
                        {req.mode === "managed" ? "White-Glove Match" : "Open Market"}
                      </span>
                      {req.subject?.name && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getSubjectBadgeClass(
                            req.subject.name,
                          )}`}
                        >
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
                      <span className="text-muted text-[11px]">
                        Created {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right Action / Proposal Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted block">
                        Proposals
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {req.offer_count === 0 ? (
                          <span className="text-muted font-normal text-[11px]">Waiting for bids…</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {req.offer_count} proposal{req.offer_count === 1 ? "" : "s"} ready
                          </span>
                        )}
                      </span>
                    </div>

                    <Button variant="secondary" size="sm" asChild className="h-8 text-xs font-semibold">
                      <Link href={`/requests/${req.id}`}>
                        <span>Inspect Proposals</span>
                        <ChevronRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column (33% width = 4 cols, sticky): Telemetry Summary, Action CTA, and Escrow Security */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Quick Telemetry Summary Card */}
          <Card className="p-5 border-border/80 bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Workspace Telemetry
              </span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-surface-1 border border-border/70 space-y-1">
                <span className="text-[11px] font-semibold text-muted block">Active Briefs</span>
                <span className="text-xl font-black text-foreground">
                  {requests ? metrics.bidding + metrics.active : <Skeleton className="h-6 w-8" />}
                </span>
                <span className="text-[10px] text-muted block">In-flight tasks</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-1 border border-border/70 space-y-1">
                <span className="text-[11px] font-semibold text-muted block">Proposals</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {requests ? metrics.totalOffers : <Skeleton className="h-6 w-8" />}
                </span>
                <span className="text-[10px] text-muted block">Specialist bids</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-1 border border-border/70 space-y-1">
                <span className="text-[11px] font-semibold text-muted block">Escrow Custody</span>
                <span className="text-xl font-black text-foreground">100%</span>
                <span className="text-[10px] text-muted block">Protected</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-1 border border-border/70 space-y-1">
                <span className="text-[11px] font-semibold text-muted block">Match SLA</span>
                <span className="text-xl font-black text-warning">&lt; 18m</span>
                <span className="text-[10px] text-muted block">Avg first proposal</span>
              </div>
            </div>
          </Card>

          {/* Action Card: Post New Brief */}
          <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>Next Academic Milestone</span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              Accelerate Your Research
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Describe your coursework, code bottlenecks, or calculus proofs. Get peer-matched in under 18 minutes.
            </p>
            <Button
              asChild
              className="w-full font-semibold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-strong hover:to-indigo-700 text-primary-foreground shadow-md shadow-primary/20"
            >
              <Link href="/requests/new" className="flex items-center justify-center gap-2">
                <Plus className="size-4" />
                <span>Create New Task Brief</span>
              </Link>
            </Button>
          </Card>

          {/* Academic Integrity & Escrow Protection Reminder Card */}
          <Card className="p-5 border-border/80 bg-card space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <ShieldCheck className="size-4" />
              <span>Trust & Escrow Protocol</span>
            </div>
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Funds held in vault until you inspect and approve completed deliverables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Double-blind competitive proposals prevent bid poaching.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span>BR-10 & BR-14 Honor Code: Tutoring & concept guidance only. Zero ghostwriting.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
