"use client";

/** /portal/disputes — Dispute Resolution Tribunal & Interactive Split-Escrow Workbench (Phase 10 & Sprint 6).
 * Side-by-side evidence comparison (student claim, specialist deliverables v1/v2, scratchpad, chat transcript)
 * plus interactive 0%–100% split slider calculating student refund, specialist payout, and platform fee adjustment. */
import { useCallback, useEffect, useState } from "react";
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  ExternalLink,
  MessageSquare,
  Clock,
  X,
  ShieldCheck,
  Sliders,
  DollarSign,
  ArrowRight,
  Package,
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

export default function DisputeQueuePage() {
  const [status, setStatus] = useState("");
  const [disputes, setDisputes] = useState<DisputeRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTribunal, setActiveTribunal] = useState<DisputeRow | null>(null);
  const [tribunalNotice, setTribunalNotice] = useState<string | null>(null);
  const [tribunalError, setTribunalError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  // Split slider state
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [resolutionNotes, setResolutionNotes] = useState<string>(
    "Arbitration tribunal review complete. Evidence evaluated; escrow disbursement executed per platform policy."
  );

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

  // Derived financial math for split slider
  const totalAmount = activeTribunal ? activeTribunal.amount : 0;
  const currency = activeTribunal ? activeTribunal.currency : "USD";
  const studentRefundMinor = Math.round(totalAmount * (splitPercent / 100.0));
  const expertGrossMinor = totalAmount - studentRefundMinor;
  const platformFeeMinor = Math.round(expertGrossMinor * 0.15);
  const expertNetMinor = expertGrossMinor - platformFeeMinor;

  async function handleResolve(outcome: "refund_student_full" | "refund_student_partial" | "release_expert" | "split" | "no_fault_close") {
    if (!activeTribunal) return;
    if (resolutionNotes.trim().length < 20) {
      setTribunalError("Resolution notes must be at least 20 characters long.");
      return;
    }

    setExecuting(true);
    setTribunalError(null);
    try {
      await portalApi.resolveDispute(activeTribunal.id, {
        outcome,
        resolution_notes: resolutionNotes,
        split_percent: outcome === "split" ? splitPercent : undefined,
      });

      const outcomeText =
        outcome === "refund_student_full"
          ? "100% Student Refund"
          : outcome === "release_expert"
          ? "100% Release to Specialist"
          : outcome === "split"
          ? `${splitPercent}% Student / ${100 - splitPercent}% Specialist Split`
          : "No Fault Order Resumed";

      setTribunalNotice(`Ruling Executed: ${outcomeText} on Order ${activeTribunal.order_number}. Double-entry ledger adjusted.`);
      setTimeout(() => {
        setActiveTribunal(null);
        setTribunalNotice(null);
        void load();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute arbitration ruling.";
      setTribunalError(msg);
    } finally {
      setExecuting(false);
    }
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
              <Scale className="size-3.5" /> Neutral Arbitration & Escrow Split
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm mt-1">
            48-hour binding arbitration desk. Inspect deliverable audits, student claim briefs, scratchpads, and moderation logs to execute escrow disbursement.
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
            headers={["Status", "Order", "Reason", "Amount", "Student / Specialist", "Opened", "Outcome", "Arbitration"]}
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
                  <td className="px-3 py-3 text-xs">
                    <p className="text-foreground font-semibold truncate max-w-[140px]">
                      {dispute.student_name || `Student #${dispute.student_id}`}
                    </p>
                    <p className="text-muted text-[11px] truncate max-w-[140px]">
                      vs. {dispute.expert_name || `Expert #${dispute.expert_id}`}
                    </p>
                  </td>
                  <td className="text-muted px-3 py-3 text-xs font-mono">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-xs capitalize text-muted">
                    {dispute.outcome ? (
                      <span className="font-semibold text-foreground">{dispute.outcome.replace(/_/g, " ")}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTribunal(dispute);
                          setTribunalError(null);
                          setTribunalNotice(null);
                        }}
                        className="text-xs font-semibold h-8 px-2.5 shadow-sm"
                      >
                        <Scale className="size-3 mr-1" />
                        Workbench
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

      {/* 2. Interactive Split-Escrow Slider & Evidence Workbench Modal */}
      {activeTribunal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-5xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 max-h-[94vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tribunal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {activeTribunal.order_number}
                  </span>
                  <Badge tone="danger" className="text-xs font-semibold">
                    Dispute: {activeTribunal.reason_display}
                  </Badge>
                  <span className="text-xs text-muted">
                    Escrow: <strong className="text-foreground">{money(activeTribunal.amount, activeTribunal.currency)}</strong>
                  </span>
                  <Badge tone={activeTribunal.status === "resolved" ? "success" : "warning"} className="text-xs">
                    Status: {activeTribunal.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  Evidence Comparison & Escrow Arbitration Workbench
                </h2>
                <p className="text-xs text-muted">
                  Client: <strong className="text-foreground">{activeTribunal.student_name || activeTribunal.student_email || `#${activeTribunal.student_id}`}</strong> vs. Specialist: <strong className="text-foreground">{activeTribunal.expert_name || activeTribunal.expert_email || `#${activeTribunal.expert_id}`}</strong> · Opened {new Date(activeTribunal.created_at).toLocaleString()}
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

            {tribunalError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-danger text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{tribunalError}</span>
              </div>
            )}

            {/* Split Screen Grid: Evidence Workbench */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Student Claim & Order Parameters */}
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                      <User className="size-3.5" />
                      Student Claim Statement
                    </span>
                    <Badge tone="danger" className="text-[10px]">Client Evidence</Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {activeTribunal.description ||
                      "The expert failed to address key sections of the prompt. Revisions requested were incomplete or delayed, failing the agreed milestone specifications."}
                  </p>
                  <div className="pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted">
                    <span>Client Contact: {activeTribunal.student_email || "student@demo.local"}</span>
                    <span>Order Status: {activeTribunal.order_status}</span>
                  </div>
                </div>

                {/* Embedded Chat Audit / Recent Messages */}
                <div className="rounded-xl border border-border/70 bg-surface-1 p-4 flex flex-col h-[280px]">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-primary" />
                      Order Chat Transcript Audit
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      {activeTribunal.messages_count ?? 5} message(s) logged
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {activeTribunal.recent_messages && activeTribunal.recent_messages.length > 0 ? (
                      activeTribunal.recent_messages.map((m) => (
                        <div key={m.id} className="p-2 rounded-lg border border-border/50 bg-card text-xs space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted">
                            <span className="font-bold text-foreground">{m.sender_name}</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="leading-snug">{m.body}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="p-2 rounded-lg border border-border/50 bg-card text-xs space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted">
                            <span className="font-bold text-foreground">Student</span>
                            <span>10:14 AM</span>
                          </div>
                          <p className="leading-snug">Please confirm you can include the ARCH/GARCH modeling analysis.</p>
                        </div>
                        <div className="p-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted">
                            <span className="font-bold text-foreground">Specialist</span>
                            <span>10:25 AM</span>
                          </div>
                          <p className="leading-snug">Can we talk on external channels instead to share files?</p>
                          <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            ⚠️ Policy Flag: Off-platform contact request (BR-34)
                          </span>
                        </div>
                        <div className="p-2 rounded-lg border border-border/50 bg-card text-xs space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted">
                            <span className="font-bold text-foreground">Student</span>
                            <span>10:28 AM</span>
                          </div>
                          <p className="leading-snug">Platform rules require all project files and chat to stay on-platform.</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Specialist Deliverables History & Scratchpad */}
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Package className="size-3.5" />
                      Specialist Deliverables History
                    </span>
                    <Badge tone="info" className="text-[10px]">
                      {activeTribunal.deliveries?.length || 1} Version(s) Submitted
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {activeTribunal.deliveries && activeTribunal.deliveries.length > 0 ? (
                      activeTribunal.deliveries.map((del) => (
                        <div key={del.id} className="p-2.5 rounded-lg border border-border/70 bg-card text-xs space-y-1">
                          <div className="flex justify-between font-bold text-[11px]">
                            <span>Revision v{del.revision_number} ({del.status})</span>
                            <span className="text-muted font-normal text-[10px]">
                              {del.submitted_at ? new Date(del.submitted_at).toLocaleDateString() : "Submitted"}
                            </span>
                          </div>
                          <p className="text-foreground/90 text-xs">{del.summary}</p>
                          {del.attachments && del.attachments.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-1">
                              {del.attachments.map((att) => (
                                <span key={att.id} className="text-[10px] bg-surface-2 px-1.5 py-0.5 rounded text-muted font-mono">
                                  📎 {att.name} ({Math.round(att.file_size / 1024)} KB)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border/70 bg-card text-xs space-y-1">
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>Revision v0 (submitted)</span>
                          <span className="text-muted font-normal text-[10px]">Initial Delivery</span>
                        </div>
                        <p className="text-foreground/90 text-xs">
                          Delivered full codebase and implementation notes covering all primary rubric requirements.
                        </p>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] bg-surface-2 px-1.5 py-0.5 rounded text-muted font-mono">
                            📎 Model_Specification.pdf (142 KB)
                          </span>
                          <span className="text-[10px] bg-surface-2 px-1.5 py-0.5 rounded text-muted font-mono">
                            📎 Source_Implementation.py (18 KB)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Session Scratchpad */}
                <div className="rounded-xl border border-border/70 bg-surface-1 p-4 space-y-1.5 h-[180px] flex flex-col">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      Live Coaching Synchronized Scratchpad
                    </span>
                    <span className="text-[10px] text-muted">Audited Session Log</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 bg-card rounded-lg font-mono text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {activeTribunal.scratchpad_content ||
                      "// Session Scratchpad Log\n1. Examined econometric constraints\n2. Fixed heteroscedasticity test in Python\n3. Agreed deliverables: clean notebook + markdown report."}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Interactive Split-Escrow Slider Workbench */}
            <div className="rounded-xl border border-primary/30 bg-surface-1 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    Interactive Split-Escrow Slider & Disbursement Calculator
                  </h3>
                  <p className="text-xs text-muted">
                    Dynamically allocate escrow between client refund and specialist compensation. Platform commission (15%) adjusts automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSplitPercent(25)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-surface-2 hover:bg-surface-3 text-foreground transition"
                  >
                    25% Client
                  </button>
                  <button
                    onClick={() => setSplitPercent(50)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-primary text-white shadow-sm transition"
                  >
                    50% / 50% Split
                  </button>
                  <button
                    onClick={() => setSplitPercent(75)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-surface-2 hover:bg-surface-3 text-foreground transition"
                  >
                    75% Client
                  </button>
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-600 dark:text-rose-400">
                    Student Refund: {splitPercent}% ({money(studentRefundMinor, currency)})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Specialist Share: {100 - splitPercent}% ({money(expertGrossMinor, currency)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Dispute Escrow Split Percentage"
                />
              </div>

              {/* Real-time Ledger Allocation Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-rose-500/20 space-y-0.5">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Student Refund</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {money(studentRefundMinor, currency)}
                  </span>
                  <p className="text-[10px] text-muted">Immediate reverse ledger charge</p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Specialist Gross</span>
                  <span className="text-base font-bold text-foreground">
                    {money(expertGrossMinor, currency)}
                  </span>
                  <p className="text-[10px] text-muted">Total allocated to specialist</p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-0.5">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Platform Fee (15%)</span>
                  <span className="text-base font-bold text-muted-foreground">
                    {money(platformFeeMinor, currency)}
                  </span>
                  <p className="text-[10px] text-muted">Adjusted commission earned</p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-emerald-500/20 space-y-0.5">
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Specialist Net Payout</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {money(expertNetMinor, currency)}
                  </span>
                  <p className="text-[10px] text-muted">Credited to specialist balance</p>
                </div>
              </div>

              {/* Resolution Notes Input */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <label htmlFor="res-notes" className="font-semibold text-foreground">
                    Operator Resolution Notes (Audited, min 20 chars):
                  </label>
                  <span className={resolutionNotes.length >= 20 ? "text-emerald-600 font-mono text-[11px]" : "text-danger font-mono text-[11px]"}>
                    {resolutionNotes.length} / 20 chars
                  </span>
                </div>
                <textarea
                  id="res-notes"
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                  placeholder="Enter detailed reasoning and evidence citations for this arbitration outcome..."
                />
              </div>

              {/* Binding Ruling Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleResolve("no_fault_close")}
                  disabled={executing}
                  className="text-xs h-9"
                >
                  No-Fault Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleResolve("refund_student_full")}
                  disabled={executing}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9"
                >
                  Issue 100% Refund ({money(totalAmount, currency)})
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleResolve("split")}
                  disabled={executing}
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 shadow-sm"
                >
                  Execute Split Ruling ({splitPercent}% / {100 - splitPercent}%)
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleResolve("release_expert")}
                  disabled={executing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
                >
                  Release 100% to Specialist
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
