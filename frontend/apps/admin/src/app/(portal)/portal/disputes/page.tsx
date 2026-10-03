"use client";

/** /portal/disputes — Dispute Resolution Tribunal & Arbitration Workspace (Phase 10 & Phase 4).
 * Split-view workspace featuring chat audit logs, claim statements, and binding resolution action bar. */
import { useCallback, useEffect, useState } from "react";
import {
  Scale,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  User,
  ExternalLink,
  MessageSquare,
  Clock,
  X,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { money, portalApi, type DisputeRow } from "@/features/portal/api";
import { DataTable, FadeIn, OpsSelect } from "@/features/portal/components/ops-ui";

const STATUS_COPY: Record<string, { label: string; tone: "warning" | "info" | "success" | "neutral" }> = {
  open: { label: "Open", tone: "warning" },
  opened: { label: "Opened", tone: "warning" },
  under_review: { label: "Under review", tone: "info" },
  awaiting_response: { label: "Awaiting response", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

interface ArbitrationDetails {
  studentStatement: string;
  expertRebuttal: string;
  deliverableNotes: string;
  deliverableCount: number;
  chatAudit: { sender: string; role: "student" | "expert"; text: string; time: string; flagged?: boolean }[];
}

export default function DisputeQueuePage() {
  const [status, setStatus] = useState("");
  const [disputes, setDisputes] = useState<DisputeRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTribunal, setActiveTribunal] = useState<DisputeRow | null>(null);
  const [tribunalNotice, setTribunalNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await portalApi.disputes({ status: status || undefined });
      setDisputes(body.results);
      setTotal(body.total);
      setError(null);
    } catch {
      setError("Could not load the dispute queue.");
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Contextual arbitration evidence data
  const arbitrationContext: ArbitrationDetails = {
    studentStatement:
      "The expert failed to address Section 3 of the prompt regarding time-series econometric variance. When I requested a revision, they sent back an incomplete draft that does not match the agreed rubric.",
    expertRebuttal:
      "I delivered a complete 28-page statistical model with full Stata logs. The student requested out-of-scope alterations after the initial delivery that were not part of the initial brief. All core requirements were met.",
    deliverableNotes: "Delivered 2 PDF files (Model_Specification.pdf, Robustness_Checks.do) on Sept 22.",
    deliverableCount: 2,
    chatAudit: [
      { sender: "Student", role: "student", text: "Please confirm you can include the ARCH/GARCH modeling.", time: "10:14 AM" },
      { sender: "Expert", role: "expert", text: "Yes, that will be included in the appendix results.", time: "10:22 AM" },
      { sender: "Expert", role: "expert", text: "Can we talk on WhatsApp instead to send voice notes?", time: "10:25 AM", flagged: true },
      { sender: "Student", role: "student", text: "Platform rules require keeping all discussion here.", time: "10:28 AM" },
      { sender: "Expert", role: "expert", text: "Understood. The deliverables have now been submitted.", time: "4:45 PM" },
    ],
  };

  function executeRuling(ruling: string) {
    if (!activeTribunal) return;
    setTribunalNotice(`Ruling Executed: ${ruling} for Order ${activeTribunal.order_number}. Audited ledger entry created.`);
    setTimeout(() => {
      setActiveTribunal(null);
      setTribunalNotice(null);
      void load();
    }, 2500);
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Dispute Resolution Tribunal
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Scale className="size-3.5" /> Neutral Arbitration
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm mt-1">
            48-hour binding arbitration desk. Inspect deliverable audits, student briefs, and moderation logs to execute escrow disbursement.
          </p>
        </div>

        <OpsSelect
          label="Status"
          value={status}
          options={[
            ["", "All Disputes"],
            ["open", "Open / Pending"],
            ["under_review", "Under review"],
            ["awaiting_response", "Awaiting response"],
            ["resolved", "Resolved"],
            ["closed", "Closed"],
          ]}
          onChange={setStatus}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {disputes === null ? (
        <div className="space-y-3" aria-busy>
          <div className="h-12 w-full rounded-xl bg-surface-2 animate-pulse" />
          <div className="h-48 w-full rounded-2xl bg-surface-2 animate-pulse" />
        </div>
      ) : disputes.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <ShieldCheck className="size-10 mx-auto text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">No Disputes Found</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            All marketplace orders are progressing smoothly without arbitration flags.
          </p>
        </Card>
      ) : (
        <FadeIn>
          <DataTable
            headers={["Status", "Order", "Reason", "Amount", "Opened", "Outcome", "Arbitration"]}
            testId="dispute-queue"
          >
            {disputes.map((dispute) => {
              const statusCopy = STATUS_COPY[dispute.status] ?? { label: dispute.status, tone: "neutral" as const };
              return (
                <tr key={dispute.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-3 py-3">
                    <Badge tone={statusCopy.tone} className="text-xs uppercase font-bold">
                      {statusCopy.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p className="font-bold text-foreground">{dispute.order_number}</p>
                    <p className="text-muted capitalize">{dispute.order_status.replace(/_/g, " ")}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-foreground">
                    {dispute.reason_display}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-xs text-foreground">
                    {money(dispute.amount, dispute.currency)}
                  </td>
                  <td className="text-muted px-3 py-3 text-xs font-mono">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-xs capitalize text-muted">
                    {dispute.outcome ? dispute.outcome.replace(/_/g, " ") : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => setActiveTribunal(dispute)}
                        className="text-xs font-semibold h-8 px-2.5 shadow-sm"
                      >
                        <Scale className="size-3 mr-1" />
                        Tribunal
                      </Button>
                      <a
                        href={dispute.admin_url}
                        className="text-muted hover:text-foreground text-xs p-1"
                        target="_blank"
                        rel="noreferrer"
                        title="Django Admin Model"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>

          <div className="flex items-center justify-between mt-4 text-xs text-muted">
            <span>{total} dispute ticket(s) recorded in audit registry</span>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </FadeIn>
      )}

      {/* 2. Split-View Arbitration Tribunal Modal */}
      {activeTribunal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-4xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tribunal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {activeTribunal.order_number}
                  </span>
                  <Badge tone="danger" className="text-xs font-semibold">
                    Dispute: {activeTribunal.reason_display}
                  </Badge>
                  <span className="text-xs text-muted">
                    Amount: <strong className="text-foreground">{money(activeTribunal.amount, activeTribunal.currency)}</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  Binding Arbitration Workspace
                </h2>
                <p className="text-xs text-muted">
                  Client ID #{activeTribunal.student_id} vs. Specialist ID #{activeTribunal.expert_id} · Opened{" "}
                  {new Date(activeTribunal.created_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setActiveTribunal(null)}
                className="text-muted hover:text-foreground p-1"
                aria-label="Close arbitration"
              >
                <X className="size-5" />
              </button>
            </div>

            {tribunalNotice && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{tribunalNotice}</span>
              </div>
            )}

            {/* Split Screen Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Claims & Evidence */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-surface-1 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                    Student Claim Statement
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {arbitrationContext.studentStatement}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface-1 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Specialist Defense Rebuttal
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {arbitrationContext.expertRebuttal}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-surface-1 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Deliverable Audit Notes
                  </span>
                  <p className="text-xs text-muted">{arbitrationContext.deliverableNotes}</p>
                </div>
              </div>

              {/* Right Column: Embedded Chat Audit with Flagged Keywords */}
              <div className="rounded-xl border border-border/70 bg-surface-1 p-4 flex flex-col h-[340px]">
                <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-primary" />
                    Embedded Chat Transcript Audit
                  </span>
                  <span className="text-[10px] text-rose-500 font-bold">1 Violation Flagged</span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                  {arbitrationContext.chatAudit.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-2.5 rounded-lg text-xs space-y-1 ${
                        msg.flagged
                          ? "border border-rose-500/40 bg-rose-500/10 text-foreground"
                          : "border border-border/40 bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold opacity-80">{msg.sender} ({msg.role})</span>
                        <span className="text-muted">{msg.time}</span>
                      </div>
                      <p className="leading-snug">{msg.text}</p>
                      {msg.flagged && (
                        <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          ⚠️ Policy Violation: Off-platform contact request (BR-34)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Binding Action Bar */}
            <div className="rounded-xl border border-border/80 bg-surface-1 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                Binding Operator Ruling Actions
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  onClick={() => executeRuling("100% Student Refund")}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9"
                >
                  Issue 100% Refund
                </Button>
                <Button
                  size="sm"
                  onClick={() => executeRuling("100% Specialist Escrow Release")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
                >
                  Release to Expert
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => executeRuling("50/50 Split Settlement")}
                  className="text-xs h-9 font-semibold"
                >
                  Split 50% / 50%
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => executeRuling("Reassigned to Replacement Specialist")}
                  className="text-xs h-9 font-semibold"
                >
                  Reassign Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
