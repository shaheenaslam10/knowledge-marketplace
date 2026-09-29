"use client";

/**
 * /portal/dispatch — Managed Service Dispatch Board (Phase 4).
 * Dedicated operations coordinator interface for requests where students opted for "Platform Match".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SendHorizontal,
  Clock,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  X,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { portalApi, type UsersOverview } from "@/features/portal/api";

interface ManagedTask {
  id: string;
  reference: string;
  title: string;
  discipline: string;
  studentName: string;
  budget: number;
  currency: string;
  pricingType: "fixed" | "hourly";
  slaHoursLeft: number;
  status: "unmatched" | "pool_broadcast" | "specialist_locked";
  description: string;
}

interface SpecialistCandidate {
  id: number;
  name: string;
  headline: string;
  rating: number;
  completedTasks: number;
  currentWorkload: number;
  matchScore: number;
  discipline: string;
  payoutRate: number;
}

const INITIAL_TASKS: ManagedTask[] = [
  {
    id: "req-m-01",
    reference: "MAN-8821",
    title: "Econometric Model Specification & Robustness Standard Errors in Stata",
    discipline: "Economics & Econometrics",
    studentName: "Chloe M. (Columbia Univ)",
    budget: 380,
    currency: "USD",
    pricingType: "fixed",
    slaHoursLeft: 1.8,
    status: "unmatched",
    description:
      "Need model verification for panel data regression analyzing cross-country tariff impacts with clustered standard errors. Verification of do-files and summary table export required.",
  },
  {
    id: "req-m-02",
    reference: "MAN-8824",
    title: "Quantum Mechanics Perturbation Theory & Dirac Notation Proofs",
    discipline: "Physics",
    studentName: "Alexander W. (Oxford)",
    budget: 520,
    currency: "USD",
    pricingType: "fixed",
    slaHoursLeft: 4.2,
    status: "unmatched",
    description:
      "Step-by-step mathematical derivation of second-order non-degenerate perturbation Hamiltonian shifts with full Bra-Ket notation formatting.",
  },
  {
    id: "req-m-03",
    reference: "MAN-8829",
    title: "Biochemical Pathway Analysis & Enzyme Kinetics Michaelis-Menten",
    discipline: "Biology & Medicine",
    studentName: "Devon L. (Johns Hopkins)",
    budget: 260,
    currency: "USD",
    pricingType: "fixed",
    slaHoursLeft: 9.5,
    status: "pool_broadcast",
    description:
      "Calculation of Vmax, Km, and competitive inhibition curve fitting using Lineweaver-Burk and non-linear regression models.",
  },
  {
    id: "req-m-04",
    reference: "MAN-8835",
    title: "Distributed Systems Raft Consensus Protocol Implementation Review",
    discipline: "Computer Science",
    studentName: "Liam T. (UC Berkeley)",
    budget: 650,
    currency: "USD",
    pricingType: "fixed",
    slaHoursLeft: 18.0,
    status: "specialist_locked",
    description:
      "Formal verification and Go implementation review of leader election and log replication safety invariants under network partition scenarios.",
  },
];

const SPECIALISTS_DATABASE: SpecialistCandidate[] = [
  {
    id: 101,
    name: "Dr. Eleanor Vance",
    headline: "Ph.D. in Econometrics (MIT) · Postdoctoral Fellow",
    rating: 5.0,
    completedTasks: 142,
    currentWorkload: 1,
    matchScore: 98,
    discipline: "Economics & Econometrics",
    payoutRate: 300,
  },
  {
    id: 102,
    name: "Dr. Marcus Thorne",
    headline: "Ph.D. in Theoretical Physics (Cambridge) · Ex-CERN",
    rating: 4.9,
    completedTasks: 98,
    currentWorkload: 2,
    matchScore: 95,
    discipline: "Physics",
    payoutRate: 410,
  },
  {
    id: 103,
    name: "Dr. Sarah Chen",
    headline: "Ph.D. in Molecular Biology (Harvard) · 12 Pubs",
    rating: 4.95,
    completedTasks: 110,
    currentWorkload: 0,
    matchScore: 96,
    discipline: "Biology & Medicine",
    payoutRate: 200,
  },
  {
    id: 104,
    name: "Dr. Alan Turing-Smith",
    headline: "Ph.D. in Computer Science (Stanford) · Systems Architect",
    rating: 4.98,
    completedTasks: 215,
    currentWorkload: 1,
    matchScore: 99,
    discipline: "Computer Science",
    payoutRate: 520,
  },
];

export default function ManagedDispatchPage() {
  const [tasks, setTasks] = useState<ManagedTask[]>(INITIAL_TASKS);
  const [selectedTask, setSelectedTask] = useState<ManagedTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unmatched" | "pool_broadcast" | "specialist_locked">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.discipline.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // Suggested candidates for the currently selected task
  const matchedCandidates = useMemo(() => {
    if (!selectedTask) return [];
    return SPECIALISTS_DATABASE.filter(
      (s) => s.discipline.toLowerCase() === selectedTask.discipline.toLowerCase(),
    ).sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedTask]);

  function handleAssign(specialist: SpecialistCandidate) {
    if (!selectedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "specialist_locked" } : t)),
    );
    setToastMessage(`Directly assigned ${specialist.name} to ${selectedTask.reference}. Engagement locked.`);
    setSelectedTask(null);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function handleBroadcastPool() {
    if (!selectedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "pool_broadcast" } : t)),
    );
    setToastMessage(`Task ${selectedTask.reference} broadcast to Tier-1 specialist pool with 24h TTL.`);
    setSelectedTask(null);
    setTimeout(() => setToastMessage(null), 4000);
  }

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Managed Service Dispatch Desk
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Coordinator Matching
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            White-glove assignment pipeline. Match high-urgency student tasks directly to verified doctoral specialists.
          </p>
        </div>

        {/* SLA Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <Clock className="size-4 animate-pulse" />
          <span>2 Tasks under critical SLA (&lt; 6h)</span>
        </div>
      </div>

      {toastMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-border/70 rounded-xl" role="tablist">
          {[
            { id: "all", label: "All Tasks" },
            { id: "unmatched", label: "Awaiting Match" },
            { id: "pool_broadcast", label: "Pool Dispatched" },
            { id: "specialist_locked", label: "Locked" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            placeholder="Search reference, topic, discipline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-surface-1"
          />
        </div>
      </div>

      {/* 3. Dispatch Tasks Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-surface-1 border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3.5">Reference & Discipline</th>
                <th className="px-4 py-3.5">Academic Brief & Student</th>
                <th className="px-4 py-3.5">Target Budget</th>
                <th className="px-4 py-3.5">SLA Countdown</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTasks.map((task) => {
                const isUrgent = task.slaHoursLeft < 6;

                return (
                  <tr key={task.id} className="hover:bg-surface-1/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                          {task.reference}
                        </span>
                        <p className="font-semibold text-foreground text-xs">{task.discipline}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 max-w-sm">
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground truncate">{task.title}</p>
                        <p className="text-muted text-[11px]">{task.studentName}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-foreground">
                        ${task.budget} {task.currency}
                      </div>
                      <span className="text-[10px] text-muted capitalize">{task.pricingType} fee</span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isUrgent
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 animate-pulse"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        <Clock className="size-3" />
                        {task.slaHoursLeft}h remaining
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {task.status === "unmatched" && (
                        <Badge tone="warning" className="text-[10px] font-bold">
                          Awaiting Match
                        </Badge>
                      )}
                      {task.status === "pool_broadcast" && (
                        <Badge tone="info" className="text-[10px] font-bold">
                          In Pool Broadcast
                        </Badge>
                      )}
                      {task.status === "specialist_locked" && (
                        <Badge tone="success" className="text-[10px] font-bold">
                          Specialist Locked
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="text-xs font-semibold h-8 px-3 gap-1 shadow-sm"
                      >
                        <UserCheck className="size-3.5" />
                        <span>Matcher Desk</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Matcher Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {selectedTask.reference}
                  </span>
                  <Badge tone="info" className="text-xs">
                    {selectedTask.discipline}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-1.5">{selectedTask.title}</h2>
                <p className="text-xs text-muted">
                  Client: <strong className="text-foreground">{selectedTask.studentName}</strong> · Stated Budget:{" "}
                  <strong className="text-foreground">${selectedTask.budget} {selectedTask.currency}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted hover:text-foreground p-1"
                aria-label="Close drawer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Task Brief */}
            <div className="rounded-xl border border-border/60 bg-surface-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Academic Scope Brief
              </span>
              <p className="text-xs text-foreground leading-relaxed">{selectedTask.description}</p>
            </div>

            {/* Candidate Specialists */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Top Matched Specialists ({matchedCandidates.length})
                </h3>
                <span className="text-[11px] text-muted">Ranked by discipline & rating</span>
              </div>

              {matchedCandidates.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted">
                  No specialists currently on duty with this exact discipline. Use Tier-2 Pool broadcast.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedCandidates.map((candidate) => {
                    const margin = selectedTask.budget - candidate.payoutRate;
                    const marginPercent = Math.round((margin / selectedTask.budget) * 100);

                    return (
                      <div
                        key={candidate.id}
                        className="rounded-xl border border-border/80 bg-surface-1 p-4 space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{candidate.name}</span>
                              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                                {candidate.matchScore}% Match
                              </span>
                            </div>
                            <p className="text-xs text-muted">{candidate.headline}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted pt-0.5">
                              <span>★ {candidate.rating} rating</span>
                              <span>·</span>
                              <span>{candidate.completedTasks} completed</span>
                              <span>·</span>
                              <span>{candidate.currentWorkload} active orders</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-muted block">Specialist Quote</span>
                            <span className="text-base font-extrabold text-foreground">
                              ${candidate.payoutRate}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                              Platform Net: +${margin} ({marginPercent}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                          <Button
                            size="sm"
                            onClick={() => handleAssign(candidate)}
                            className="text-xs font-semibold h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          >
                            Direct Assign Specialist
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Broadcast Option */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">
                  Broadcast to Discipline Pool
                </span>
                <p className="text-[11px] text-muted">
                  Send simultaneous invitation to all vetted specialists in {selectedTask.discipline}. First to accept locks the task.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBroadcastPool}
                className="text-xs font-semibold h-8 shrink-0"
              >
                Broadcast to Pool
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
