"use client";

/** Expert: managed invitations + direct assignments (accept/decline) with visual TTL urgency rings. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { assignmentsApi } from "@/features/assignments/api";
import {
  ASSIGNMENT_STATUS_COPY,
  ASSIGNMENT_STATUS_TONE,
  isRespondable,
  type AssignmentStatus,
  type DirectAssignment,
  type PoolInvitation,
} from "@/features/assignments/types";
import { ApiError } from "@/lib/api/client";

function TTL({ expiresAt }: { expiresAt: string }) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.max(0, Math.round(diffMs / 3_600_000));
  const isUrgent = hours <= 6;
  const isModerate = hours > 6 && hours <= 24;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isUrgent
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30 animate-pulse"
          : isModerate
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
            : "bg-surface-2 text-muted"
      }`}
    >
      <Clock className="size-3" />
      <span>{hours === 0 ? "Expiring now" : `${hours}h left to respond`}</span>
    </span>
  );
}

export default function AssignmentsPage() {
  const [invitations, setInvitations] = useState<PoolInvitation[] | null>(null);
  const [assignments, setAssignments] = useState<DirectAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expected, setExpected] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    assignmentsApi.invitations().then((r) => setInvitations(r.results)).catch(() => setInvitations([]));
    assignmentsApi.assignments().then((r) => setAssignments(r.results)).catch(() => setAssignments([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, id: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const section = (title: string, count: number, children: React.ReactNode) => (
    <section className="space-y-4" aria-label={title}>
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>{title}</span>
          <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-bold">
            {count}
          </span>
        </h2>
      </div>
      {children}
    </section>
  );

  return (
    <div className="space-y-8">
      {/* 1. Header & Managed Context */}
      <div className="border-b border-border/70 pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Managed Assignments & Pool Invitations
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Zap className="size-3" /> White-Glove Routing
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted max-w-3xl leading-relaxed">
          Curated requests matched directly by platform coordinators. For pool invitations, the first vetted specialist to accept locks the engagement at the guaranteed platform-set price.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!invitations && !assignments && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {/* 2. Pool Invitations */}
      {section(
        "Pool invitations",
        invitations?.length ?? 0,
        invitations?.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1">
            <Briefcase className="size-8 mx-auto text-muted/60 mb-2" />
            <p className="text-sm font-semibold text-foreground">No active pool invitations</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              When student requests match your doctoral qualifications, white-glove invitations will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {invitations?.map((inv) => (
              <Card
                key={inv.id}
                className="group relative border-border/80 p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/opportunities/${inv.request}`}
                        className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors"
                      >
                        {inv.request_title}
                      </Link>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[inv.status as AssignmentStatus]} className="capitalize text-xs font-semibold">
                        {ASSIGNMENT_STATUS_COPY[inv.status as AssignmentStatus]}
                      </Badge>
                      {isRespondable(inv.status) && <TTL expiresAt={inv.expires_at} />}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="font-medium text-foreground bg-surface-2 px-2 py-0.5 rounded">
                        {inv.request_subject ?? "General"}
                      </span>
                      <span>·</span>
                      <span>Platform Guaranteed Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{inv.quote_amount_display}</strong></span>
                      {inv.request_budget_max && (
                        <>
                          <span>·</span>
                          <span>Student max budget: {inv.request_budget_max}</span>
                        </>
                      )}
                    </div>

                    {inv.decline_reason && (
                      <p className="text-xs text-danger font-medium">Decline reason: {inv.decline_reason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isRespondable(inv.status) && (
                    <div className="flex flex-wrap items-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div>
                        <label htmlFor={`exp-${inv.id}`} className="block text-[11px] font-medium text-muted mb-1">
                          Counter-amount (optional)
                        </label>
                        <Input
                          id={`exp-${inv.id}`}
                          className="h-9 w-36 text-xs bg-background"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 180"
                          value={expected[inv.id] ?? ""}
                          onChange={(e) => setExpected((m) => ({ ...m, [inv.id]: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={busyId === inv.id}
                        className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() =>
                          act(
                            () =>
                              assignmentsApi.acceptInvitation(
                                inv.id,
                                expected[inv.id] ? Number(expected[inv.id]) : undefined,
                              ),
                            inv.id,
                          )
                        }
                      >
                        {busyId === inv.id ? "Accepting…" : "Accept & Lock"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === inv.id}
                        className="h-9 px-3 text-xs text-muted hover:text-danger"
                        onClick={() => act(() => assignmentsApi.declineInvitation(inv.id), inv.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ),
      )}

      {/* 3. Direct Assignments */}
      {section(
        "Direct assignments",
        assignments?.length ?? 0,
        assignments?.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1">
            <Briefcase className="size-8 mx-auto text-muted/60 mb-2" />
            <p className="text-sm font-semibold text-foreground">No direct assignments assigned</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Direct appointments allocated exclusively to you by managed account coordinators will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments?.map((a) => (
              <Card
                key={a.id}
                className="group relative border-border/80 p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/opportunities/${a.request}`}
                        className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors"
                      >
                        {a.request_title}
                      </Link>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[a.status as AssignmentStatus]} className="capitalize text-xs font-semibold">
                        {ASSIGNMENT_STATUS_COPY[a.status as AssignmentStatus]}
                      </Badge>
                      {isRespondable(a.status) && <TTL expiresAt={a.expires_at} />}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="font-medium text-foreground bg-surface-2 px-2 py-0.5 rounded">
                        {a.request_subject ?? "General"}
                      </span>
                      <span>·</span>
                      <span>Agreed Compensation: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{a.amount_display} {a.currency}</strong></span>
                      {a.deadline && (
                        <>
                          <span>·</span>
                          <span>Deadline: {new Date(a.deadline).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>

                    {a.scope_note && (
                      <div className="rounded-lg bg-surface-1 p-3 text-xs text-foreground border border-border/60">
                        <strong className="text-muted block mb-0.5">Coordinator Scope Note:</strong>
                        {a.scope_note}
                      </div>
                    )}

                    {a.decline_reason && (
                      <p className="text-xs text-danger font-medium">Decline reason: {a.decline_reason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isRespondable(a.status) && (
                    <div className="flex gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <Button
                        size="sm"
                        disabled={busyId === a.id}
                        className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() => act(() => assignmentsApi.acceptAssignment(a.id), a.id)}
                      >
                        {busyId === a.id ? "Accepting…" : "Accept Direct Order"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === a.id}
                        className="h-9 px-3 text-xs text-muted hover:text-danger"
                        onClick={() => act(() => assignmentsApi.declineAssignment(a.id), a.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
