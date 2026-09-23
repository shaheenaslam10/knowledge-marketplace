"use client";

/** Expert: managed invitations + direct assignments (accept/decline). */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  const hours = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return <span className="text-xs text-muted"> · respond within {hours}h</span>;
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
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-lg font-semibold tracking-tight">
        {title} <span className="text-muted">({count})</span>
      </h2>
      {children}
    </section>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-muted">
          Requests our team routed to you. For pool invitations, the first expert to accept is assigned (the
          platform-set price applies).
        </p>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!invitations && !assignments && <Skeleton className="h-32 w-full" />}

      {section("Pool invitations", invitations?.length ?? 0,
        invitations?.length === 0 ? (
          <Card><p className="text-sm text-muted">No invitations right now.</p></Card>
        ) : (
          <div className="grid gap-4">
            {invitations?.map((inv) => (
              <Card key={inv.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/opportunities/${inv.request}`} className="font-semibold tracking-tight hover:underline">
                        {inv.request_title}
                      </Link>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[inv.status as AssignmentStatus]}>
                        {ASSIGNMENT_STATUS_COPY[inv.status as AssignmentStatus]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {inv.request_subject ?? "General"} · platform-set price {inv.quote_amount_display} ·
                      student budget up to {inv.request_budget_max ?? "—"}
                      {isRespondable(inv.status) && <TTL expiresAt={inv.expires_at} />}
                    </p>
                    {inv.decline_reason && <p className="mt-1 text-xs text-muted">Reason: {inv.decline_reason}</p>}
                  </div>
                  {isRespondable(inv.status) && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label htmlFor={`exp-${inv.id}`} className="block text-xs text-muted">
                          Your expected amount (optional)
                        </label>
                        <Input
                          id={`exp-${inv.id}`}
                          className="mt-1 w-40"
                          type="number"
                          min="0"
                          step="0.01"
                          value={expected[inv.id] ?? ""}
                          onChange={(e) => setExpected((m) => ({ ...m, [inv.id]: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={busyId === inv.id}
                        onClick={() => act(() => assignmentsApi.acceptInvitation(inv.id, expected[inv.id] ? Number(expected[inv.id]) : undefined), inv.id)}
                      >
                        {busyId === inv.id ? "Accepting…" : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === inv.id}
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
        )
      )}

      {section("Direct assignments", assignments?.length ?? 0,
        assignments?.length === 0 ? (
          <Card><p className="text-sm text-muted">No direct assignments right now.</p></Card>
        ) : (
          <div className="grid gap-4">
            {assignments?.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/opportunities/${a.request}`} className="font-semibold tracking-tight hover:underline">
                        {a.request_title}
                      </Link>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[a.status as AssignmentStatus]}>
                        {ASSIGNMENT_STATUS_COPY[a.status as AssignmentStatus]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {a.request_subject ?? "General"} · proposed {a.amount_display} {a.currency}
                      {a.deadline && ` · deadline ${a.deadline}`}
                      {isRespondable(a.status) && <TTL expiresAt={a.expires_at} />}
                    </p>
                    {a.scope_note && <p className="mt-1 text-sm">{a.scope_note}</p>}
                    {a.decline_reason && <p className="mt-1 text-xs text-muted">Reason: {a.decline_reason}</p>}
                  </div>
                  {isRespondable(a.status) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === a.id}
                        onClick={() => act(() => assignmentsApi.acceptAssignment(a.id), a.id)}
                      >
                        {busyId === a.id ? "Accepting…" : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === a.id}
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
        )
      )}
    </div>
  );
}
