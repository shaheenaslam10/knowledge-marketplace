"use client";

/** Order workspace — shared by student + expert across all three sources.
 * Timeline renders ONLY persisted OrderEvents; every action calls the API and
 * re-fetches (server owns all transitions — the UI never mutates status). */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Clock,
  RotateCcw,
  FileText,
  Download,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FileCheck2,
  Sparkles,
  Calendar,
  History,
  Check,
  X,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DURATIONS, EASING } from "@/lib/motion";
import { uploadFile } from "@/features/experts/api";
import { fileDownloadUrl } from "@/features/orders/api";
import { MessageThreadButton } from "@/features/messaging/MessageThreadButton";
import { DisputeSection } from "@/features/disputes/components/dispute-section";
import type { Dispute } from "@/features/disputes/types";
import { PaymentCard } from "@/features/orders/components/payment-card";
import { LiveCoachingStudio } from "./live-coaching-studio";
import { ReviewSection } from "@/features/reviews/components/review-card";
import type { SubScoreKey, Review } from "@/features/reviews/types";
import {
  EVENT_COPY,
  ORDER_STATUS_COPY,
  ORDER_STATUS_TONE,
  SOURCE_COPY,
  progressStep,
  workspaceActions,
  type OrderDetail,
  type OrderEventRecord,
  type DeliveryRecord,
  type DeadlineProposalRecord,
} from "@/features/orders/types";

const STEPS = [
  { label: "Escrow Secured", desc: "Funds held safely" },
  { label: "Specialist Working", desc: "In progress" },
  { label: "Delivery Uploaded", desc: "Inspection active" },
  { label: "Completed", desc: "Escrow released" },
] as const;

function Timeline({ events }: { events: OrderEventRecord[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative border-l border-border/60 ml-2 space-y-4">
      {events.map((event, index) => (
        <motion.li
          key={`${event.event_type}-${event.created_at}-${index}`}
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATIONS.fast, delay: index * 0.04, ease: EASING }}
          className="relative pl-5 text-sm"
        >
          <span
            aria-hidden
            className="absolute -left-1.5 top-1.5 size-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background"
          />
          <div>
            <p className="font-semibold text-foreground text-xs sm:text-sm">
              {EVENT_COPY[event.event_type] ?? event.event_type}
            </p>
            <time className="text-[11px] text-muted font-mono" dateTime={event.created_at}>
              {new Date(event.created_at).toLocaleString()}
            </time>
            {event.event_type === "live_session_completed" && event.data && (
              <div className="mt-1.5 space-y-1">
                {typeof event.data.duration_seconds === "number" && (
                  <Badge tone="success" className="text-[10px]">
                    {Math.max(1, Math.round(Number(event.data.duration_seconds) / 60))} min coaching
                  </Badge>
                )}
                {Boolean(event.data.scratchpad_content) && (
                  <details className="mt-1 text-[11px] text-muted">
                    <summary className="cursor-pointer text-primary hover:underline">
                      View Saved Scratchpad Snapshot
                    </summary>
                    <pre className="mt-1.5 p-2 bg-zinc-950/80 rounded border border-border/80 font-mono text-[10px] text-foreground overflow-x-auto whitespace-pre-wrap">
                      {String(event.data.scratchpad_content)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function ProgressRail({ status }: { status: OrderDetail["status"] }) {
  const step = progressStep(status);
  const done = status === "completed";
  return (
    <div className="flex items-center gap-1" aria-label={`Order progress: step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((stepItem, index) => (
        <div key={stepItem.label} className="flex flex-1 items-center gap-1">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <motion.span
                className={`block size-2.5 rounded-full ${index <= step ? "bg-primary ring-2 ring-primary/20" : "bg-border"}`}
                animate={
                  index === step && !done ? { scale: [1, 1.25, 1] } : { scale: 1 }
                }
                transition={
                  index === step && !done ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : undefined
                }
              />
              <span className={`text-[11px] font-semibold leading-none ${index <= step ? "text-foreground" : "text-muted"}`}>
                {stepItem.label}
              </span>
            </div>
            <span className="text-[10px] text-muted hidden sm:inline leading-none">
              {stepItem.desc}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div className="relative h-0.5 flex-1 bg-border/60 mx-1">
              <motion.div
                className="bg-primary absolute inset-y-0 left-0"
                initial={{ width: 0 }}
                animate={{ width: index < step ? "100%" : "0%" }}
                transition={{ duration: DURATIONS.standard, ease: EASING }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DeliveryComposer({ onSubmit, busy }: { onSubmit: (summary: string, files: string[]) => Promise<void>; busy: boolean }) {
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (summary.trim().length < 20) {
          setError("Summarize the work in at least 20 characters.");
          return;
        }
        try {
          setUploading(true);
          const ids: string[] = [];
          for (const file of files) ids.push((await uploadFile(file, "delivery")).id);
          await onSubmit(summary.trim(), ids);
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : "Could not submit delivery.");
        } finally {
          setUploading(false);
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
        <FileCheck2 className="size-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upload Work Deliverable</h3>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="delivery-summary" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Delivery summary
        </label>
        <Textarea
          id="delivery-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          placeholder="What did you deliver? Detail key methodology, answers, citations, and output files..."
          className="bg-background text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="delivery-files" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Files (PDF/JPG/PNG, ≤25 MB each)
        </label>
        <Input
          id="delivery-files"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="bg-background"
        />
      </div>
      {error && (
        <p role="alert" className="text-danger text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy || uploading}>
          {uploading ? "Uploading Deliverable…" : "Submit delivery"}
        </Button>
      </div>
    </form>
  );
}

function RevisionComposer({ onSubmit, busy }: { onSubmit: (note: string) => Promise<void>; busy: boolean }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (note.trim().length < 10) {
          setError("Tell the expert what to change (at least 10 characters).");
          return;
        }
        try {
          await onSubmit(note.trim());
        } catch (revisionError) {
          setError(revisionError instanceof Error ? revisionError.message : "Could not request revision.");
        }
      }}
    >
      <div className="flex items-center gap-2">
        <RotateCcw className="size-4 text-amber-500" />
        <h4 className="text-sm font-semibold text-foreground">Specify Required Revisions</h4>
      </div>
      <Textarea
        aria-label="Revision note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="Detail specific sections, questions, or formatting that need adjustment..."
        className="bg-background text-sm"
      />
      {error && (
        <p role="alert" className="text-danger text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={busy}>
          Request revision
        </Button>
      </div>
    </form>
  );
}

export function DeadlineProposalComposer({
  currentDeadline,
  onSubmit,
  onCancel,
  busy,
}: {
  currentDeadline: string | null;
  onSubmit: (proposedDueAt: string, note: string) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 animate-in fade-in"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!dueDate) {
          setError("Please pick a new delivery deadline.");
          return;
        }
        const selected = new Date(dueDate);
        if (selected <= new Date()) {
          setError("The proposed deadline must be set in the future.");
          return;
        }
        try {
          await onSubmit(selected.toISOString(), note.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to propose deadline extension.");
        }
      }}
    >
      <div className="flex items-center justify-between border-b border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Propose New Delivery Deadline</h4>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-foreground text-xs p-1"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            New Target Due Date & Time (UTC)
          </label>
          <Input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-background text-sm"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Current Deadline
          </label>
          <div className="h-9 flex items-center px-3 rounded-lg border border-border/60 bg-surface-1 text-xs text-muted">
            {currentDeadline ? new Date(currentDeadline).toLocaleString() : "Not set"}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Reason / Justification Note (optional)
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Explain why additional time is requested (e.g., complex dataset analysis, supplementary references)..."
          className="bg-background text-sm"
        />
      </div>

      {error && (
        <p role="alert" className="text-danger text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy} className="text-xs h-8">
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="text-xs h-8 gap-1.5 font-semibold">
          <Send className="size-3.5" />
          Submit Proposal
        </Button>
      </div>
    </form>
  );
}

export function DeadlineProposalBanner({
  proposal,
  currentDeadline,
  viewerRole,
  onRespond,
  busy,
}: {
  proposal: DeadlineProposalRecord;
  currentDeadline: string | null;
  viewerRole: "student" | "expert";
  onRespond: (action: "accept" | "decline" | "withdraw") => Promise<void>;
  busy: boolean;
}) {
  const isCounterpart =
    (viewerRole === "student" && proposal.proposed_by_role === "expert") ||
    (viewerRole === "expert" && proposal.proposed_by_role === "student");

  const proposerLabel =
    proposal.proposed_by_role === "expert" ? "Assigned Specialist" : "Client / Student";

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-foreground">
            {proposal.proposed_by_role === "expert"
              ? "Specialist Proposed Deadline Extension"
              : "Student Requested Delivery Deadline Change"}
          </h3>
          <Badge tone="warning" className="text-[10px] font-semibold">
            Action Pending
          </Badge>
        </div>
        <span className="text-[11px] text-muted font-mono">
          Proposed {new Date(proposal.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-lg bg-background/80 p-2.5 border border-border/60">
          <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">Current Deadline</span>
          <span className="font-medium text-foreground">
            {currentDeadline ? new Date(currentDeadline).toLocaleString() : "Not set"}
          </span>
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 border border-primary/30 sm:col-span-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-primary block mb-0.5">Proposed New Deadline</span>
            <span className="font-bold text-foreground text-sm">
              {new Date(proposal.proposed_due_at).toLocaleString()}
            </span>
          </div>
          {proposal.delta_hours ? (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold text-xs">
              {proposal.delta_hours > 0 ? `+${proposal.delta_hours}h` : `${proposal.delta_hours}h`}
            </span>
          ) : null}
        </div>
      </div>

      {proposal.note && (
        <div className="rounded-lg bg-surface-1 p-3 border border-border/60 text-xs">
          <span className="font-semibold text-muted block mb-1">Note from {proposerLabel}:</span>
          <p className="text-foreground italic whitespace-pre-line">&ldquo;{proposal.note}&rdquo;</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-primary/10">
        {isCounterpart ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void onRespond("decline")}
              disabled={busy}
              className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-semibold gap-1"
            >
              <X className="size-3.5" />
              Decline Proposal
            </Button>
            <Button
              size="sm"
              onClick={() => void onRespond("accept")}
              disabled={busy}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
            >
              <Check className="size-3.5" />
              Accept New Deadline
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onRespond("withdraw")}
            disabled={busy}
            className="text-xs h-8 text-muted hover:text-foreground font-semibold"
          >
            Withdraw Proposal
          </Button>
        )}
      </div>
    </div>
  );
}

function DeliveryFiles({ delivery }: { delivery: DeliveryRecord }) {
  if (!delivery || delivery.attachments.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Attached Artifacts</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {delivery.attachments.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between rounded-lg border border-border/80 bg-surface-1 px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:bg-surface-2"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="font-medium text-foreground truncate">{file.original_name}</span>
              <span className="text-[10px] text-muted shrink-0">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
            </div>
            <button
              type="button"
              className="text-primary hover:text-primary/80 transition-colors p-1"
              aria-label={`Download ${file.original_name}`}
              onClick={async () => {
                if (file.download_url) {
                  window.open(file.download_url, "_blank", "noopener");
                } else {
                  const url = await fileDownloadUrl(file.id);
                  window.open(url, "_blank", "noopener");
                }
              }}
            >
              <Download className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type ReviewAction = { rating: number; body: string; subs: Record<SubScoreKey, number | null> };

export function OrderWorkspace({
  order,
  review = null,
  dispute = null,
  onAction,
  busy,
}: {
  order: OrderDetail;
  review?: Review | null;
  dispute?: Dispute | null;
  onAction: (key: string, payload?: unknown) => Promise<void>;
  busy: boolean;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"idle" | "deliver" | "revise" | "cancel" | "propose_deadline">("idle");
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => setMode("idle"), [order.status, order.deliveries.length]);

  // Sort deliveries newest first
  const sortedDeliveries = [...order.deliveries].sort((a, b) => b.revision_number - a.revision_number);
  const latestDelivery = sortedDeliveries[0];
  const priorDeliveries = sortedDeliveries.slice(1);

  const student = order.role === "student";
  const actions = workspaceActions(order);
  const currentDeadline = order.delivery_due_at || order.deadline;
  const pendingProposal = order.deadline_proposal && order.deadline_proposal.status === "pending" ? order.deadline_proposal : null;

  return (
    <div className="space-y-6">
      {/* 1. Header Order Banner */}
      <Card className="p-6 border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-sm">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {order.number}
                </span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted font-medium">{SOURCE_COPY[order.source]}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{order.request_title}</h1>
              <p className="text-xs sm:text-sm text-muted">
                {student ? (
                  <>
                    Matched Expert: <strong className="text-foreground">{order.counterparty}</strong>
                  </>
                ) : (
                  <>
                    Client / Student: <strong className="text-foreground">{order.counterparty}</strong>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <MessageThreadButton
                context={{ context_type: "order", order_id: order.id }}
                disabled={order.status === "cancelled"}
                disabledReason="Ended orders are read-only"
              />
              <motion.span
                key={order.status}
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: DURATIONS.fast }}
              >
                <Badge tone={ORDER_STATUS_TONE[order.status]} className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                  {ORDER_STATUS_COPY[order.status]}
                </Badge>
              </motion.span>
            </div>
          </div>

          <div className="pt-2 pb-1 border-t border-b border-border/50">
            <ProgressRail status={order.status} />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-surface-1 p-3 border border-border/50">
              <span className="text-xs text-muted block mb-0.5">Total Escrow Value</span>
              <span className="text-lg font-bold text-foreground">
                {order.currency} {order.amount_display.toLocaleString()}
              </span>
            </div>
            {student ? (
              <div className="rounded-lg bg-surface-1 p-3 border border-border/50">
                <span className="text-xs text-muted block mb-0.5">Expert Payout</span>
                <span className="text-lg font-bold text-foreground">
                  {order.currency} {order.expert_amount_display.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="rounded-lg bg-surface-1 p-3 border border-border/50">
                <span className="text-xs text-muted block mb-0.5">Your Net Earnings</span>
                <span className="text-lg font-bold text-emerald-500">
                  {order.currency} {order.expert_amount_display.toLocaleString()}
                </span>
              </div>
            )}
            <div className="rounded-lg bg-surface-1 p-3 border border-border/50">
              <span className="text-xs text-muted block mb-0.5">Revisions Allowed</span>
              <span className="text-lg font-bold text-foreground">
                {order.revisions_used} <span className="text-xs font-normal text-muted">/ {order.revisions_allowed} used</span>
              </span>
            </div>
            <div className="rounded-lg bg-surface-1 p-3 border border-border/50">
              <span className="text-xs text-muted block mb-0.5">
                {order.status === "completed" ? "Completed On" : "Delivery Due Date"}
              </span>
              <span className="text-xs font-semibold text-foreground truncate block">
                {order.status === "completed"
                  ? order.completed_at ? new Date(order.completed_at).toLocaleDateString() : "Finalized"
                  : currentDeadline
                    ? new Date(currentDeadline).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Flexible"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Feature 1: Pending Deadline Proposal Card */}
      {pendingProposal && (
        <DeadlineProposalBanner
          proposal={pendingProposal}
          currentDeadline={currentDeadline}
          viewerRole={order.role}
          onRespond={async (action) => {
            await onAction("respond-deadline", { action });
          }}
          busy={busy}
        />
      )}

      {/* Payment Rail Card if payment needed */}
      {order.payment && (
        <PaymentCard
          payment={order.payment}
          role={order.role}
          busy={busy}
          onPay={async () => {
            await onAction("pay");
          }}
          onConfirm={async () => {
            await onAction("confirm-payment");
          }}
        />
      )}

      {/* Feature 2: Live 1:1 Coaching Studio Card */}
      {(order.status === "active" || order.status === "delivered" || order.status === "revision_requested") && (
        <LiveCoachingStudio order={order} onRefresh={() => void onAction("refresh")} />
      )}

      {/* 2. Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Deliverable Inspection, Version History & Actions (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Deliverable Inspection Panel */}
          <Card className="p-6 border-border/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  {latestDelivery
                    ? latestDelivery.version_label
                      ? `Deliverable (${latestDelivery.version_label} · Latest)`
                      : `Deliverable #${latestDelivery.revision_number + 1} (Latest)`
                    : "Deliverable Workspace"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Propose new deadline trigger */}
                {!pendingProposal && (order.status === "active" || order.status === "revision_requested") && mode !== "propose_deadline" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMode("propose_deadline")}
                    disabled={busy}
                    className="text-xs h-7 gap-1.5 font-semibold text-muted hover:text-foreground"
                  >
                    <Calendar className="size-3.5 text-primary" />
                    Propose Deadline
                  </Button>
                )}
                {latestDelivery && (
                  <Badge
                    tone={
                      latestDelivery.status === "approved"
                        ? "success"
                        : latestDelivery.status === "revision_requested"
                          ? "warning"
                          : "info"
                    }
                    className="capitalize font-semibold text-xs"
                  >
                    {latestDelivery.status.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>

            {/* In-place Deadline Proposal Composer */}
            {mode === "propose_deadline" && (
              <DeadlineProposalComposer
                currentDeadline={currentDeadline}
                onSubmit={async (proposedDueAt, note) => {
                  await onAction("propose-deadline", { proposedDueAt, note });
                  setMode("idle");
                }}
                onCancel={() => setMode("idle")}
                busy={busy}
              />
            )}

            {latestDelivery ? (
              <div className="space-y-4">
                {/* Deliverable inspection callout for student */}
                {student && order.status === "delivered" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
                        <Sparkles className="size-4" />
                        <span>Work ready for your inspection</span>
                      </div>
                      <p className="text-xs text-muted">
                        Review files thoroughly. Once satisfied, release escrow funds to compensate the specialist.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => void onAction("approve")}
                        disabled={busy}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3 gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="size-3.5" />
                        Approve & Release Escrow
                      </Button>
                      {order.revisions_used < order.revisions_allowed && (
                        <Button
                          variant="secondary"
                          onClick={() => setMode("revise")}
                          disabled={busy}
                          className="text-xs h-9 px-3 gap-1"
                        >
                          <RotateCcw className="size-3.5" />
                          Request Revision
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery summary text box */}
                <div className="rounded-lg bg-surface-1 p-4 border border-border/60">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                    Specialist Submission Notes
                  </span>
                  <p className="text-foreground whitespace-pre-line text-sm leading-relaxed">
                    {latestDelivery.summary}
                  </p>
                </div>

                <DeliveryFiles delivery={latestDelivery} />
              </div>
            ) : (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/70 bg-surface-1">
                <Clock className="size-8 mx-auto text-muted mb-2 animate-pulse" />
                <h3 className="text-sm font-semibold text-foreground">Awaiting Work Delivery</h3>
                <p className="text-muted text-xs max-w-sm mx-auto mt-1">
                  {student
                    ? "Your expert is actively researching and drafting your requirements. You will be notified the instant the deliverable is uploaded."
                    : "You are currently assigned to this order. Prepare your deliverables and submit when ready."}
                </p>
                {!student && order.status === "active" && mode === "idle" && (
                  <Button
                    onClick={() => setMode("deliver")}
                    disabled={busy}
                    className="mt-4 text-xs font-semibold"
                  >
                    Submit Delivery Now
                  </Button>
                )}
              </div>
            )}

            {/* Feature 2: Multi-Version Revision History Stepper */}
            {priorDeliveries.length > 0 && (
              <div className="pt-4 border-t border-border/70 space-y-3">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                      Deliverable Version History ({priorDeliveries.length} earlier iteration{priorDeliveries.length > 1 ? "s" : ""})
                    </h3>
                  </div>
                  {historyOpen ? (
                    <ChevronDown className="size-4 text-muted group-hover:text-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted group-hover:text-foreground" />
                  )}
                </button>

                {historyOpen && (
                  <div className="space-y-4 pl-2 border-l-2 border-primary/20 mt-2">
                    {priorDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="rounded-xl border border-border/70 bg-surface-1/60 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {delivery.version_label ?? `v${delivery.revision_number + 1}`}
                            </span>
                            <span className="text-xs text-muted">
                              Submitted {delivery.submitted_at ? new Date(delivery.submitted_at).toLocaleString() : ""}
                            </span>
                          </div>
                          <Badge tone="neutral" className="text-[10px]">
                            Superseded
                          </Badge>
                        </div>

                        {/* Specialist Notes */}
                        <div className="text-xs">
                          <span className="font-semibold text-muted block mb-1">Submission Notes:</span>
                          <p className="text-foreground whitespace-pre-line leading-relaxed">{delivery.summary}</p>
                        </div>

                        {/* Attachments */}
                        <DeliveryFiles delivery={delivery} />

                        {/* Student Revision Feedback Callout */}
                        {delivery.student_revision_note && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                              <RotateCcw className="size-3.5" />
                              <span>Student Revision Request Feedback:</span>
                            </div>
                            <p className="text-foreground italic leading-relaxed pl-5">
                              &ldquo;{delivery.student_revision_note}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* In-place composers */}
            {mode === "deliver" && (
              <DeliveryComposer
                onSubmit={async (summary, ids) => {
                  await onAction("deliver", { summary, ids });
                }}
                busy={busy}
              />
            )}

            {mode === "revise" && (
              <RevisionComposer
                onSubmit={async (note) => {
                  await onAction("revise", note);
                }}
                busy={busy}
              />
            )}

            {mode === "cancel" && (
              <form
                className="space-y-3 rounded-xl border border-danger/20 bg-danger/5 p-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  if (!cancelReason.trim()) {
                    setError("Cancellation reason is required.");
                    return;
                  }
                  try {
                    await onAction("cancel", cancelReason.trim());
                  } catch (cancelError) {
                    setError(cancelError instanceof Error ? cancelError.message : "Could not cancel order.");
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-danger" />
                  <h4 className="text-sm font-semibold text-foreground">Confirm Cancellation</h4>
                </div>
                <Textarea
                  aria-label="Cancellation reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  placeholder="Why are you cancelling?"
                  className="bg-background text-sm"
                />
                {error && (
                  <p role="alert" className="text-danger text-xs font-medium">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
                    Back
                  </Button>
                  <Button type="submit" variant="secondary" disabled={busy}>
                    Confirm cancellation
                  </Button>
                </div>
              </form>
            )}

            {/* Review Section */}
            {(order.status === "completed" || review) && (
              <div className="border-t border-border pt-4">
                <ReviewSection
                  orderRole={order.role === "student" ? "student" : "expert"}
                  review={review}
                  busy={busy}
                  onSubmit={async (input) => {
                    await onAction("submit-review", input);
                  }}
                  onEdit={async (reviewId: string, input: ReviewAction) => {
                    await onAction("edit-review", { ...input, reviewId });
                  }}
                  onReply={async (reviewId: string, reply: string, ratingOfStudent: number | null) => {
                    await onAction("reply-review", { reviewId, reply, ratingOfStudent });
                  }}
                />
              </div>
            )}

            {/* Action Bar */}
            {actions.length > 0 && mode === "idle" && (
              <div className="border-t border-border flex flex-wrap items-center gap-2.5 pt-4">
                {actions.map((action) =>
                  action.key === "pay" ? (
                    <Button key={action.key} onClick={() => void onAction("pay")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.tone === "ghost" ? (
                    <span key={action.key} className="text-muted self-center text-xs font-medium">
                      {action.label}
                    </span>
                  ) : action.key === "cancel" ? (
                    <Button
                      key={action.key}
                      variant="ghost"
                      onClick={() => setMode("cancel")}
                      disabled={busy}
                      className="text-danger hover:text-danger hover:bg-danger/10 text-xs"
                    >
                      {action.label}
                    </Button>
                  ) : action.key === "deliver" ? (
                    <Button key={action.key} onClick={() => setMode("deliver")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.key === "approve" ? (
                    <Button key={action.key} onClick={() => void onAction("approve")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.key === "revise" ? (
                    <Button
                      key={action.key}
                      variant="secondary"
                      onClick={() => setMode("revise")}
                      disabled={busy}
                    >
                      {action.label}
                    </Button>
                  ) : null,
                )}
              </div>
            )}
          </Card>

          {/* Dispute section */}
          <DisputeSection
            orderStatus={order.status}
            orderRole={order.role === "student" ? "student" : "expert"}
            dispute={dispute}
            busy={busy}
            onOpen={async (input) => {
              await onAction("open-dispute", input);
            }}
            onAddEvidence={async (disputeId: string, evidenceIds: string[]) => {
              await onAction("add-evidence", { disputeId, evidenceIds });
            }}
          />
        </div>

        {/* Right Column: Order Timeline & Integrity Guarantee */}
        <div className="space-y-4">
          <Card className="p-5 border-border/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Clock className="size-4 text-muted" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Audit Timeline</h2>
            </div>
            <Timeline events={order.events} />
          </Card>

          {/* Escrow Guarantee Pill */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="size-4" />
              <span>Escrow Protection Active</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Funds remain secured in neutral platform escrow. The specialist will receive compensation only when you approve the delivered work or the 72h inspection window lapses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
