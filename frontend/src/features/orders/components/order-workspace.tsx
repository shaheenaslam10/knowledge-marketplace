"use client";

/** Order workspace — shared by student + expert across all three sources.
 * Timeline renders ONLY persisted OrderEvents; every action calls the API and
 * re-fetches (server owns all transitions — the UI never mutates status). */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  Sparkles,
  Lock,
  ArrowUpRight,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DURATIONS, EASING } from "@/lib/motion";

import {
  EVENT_COPY,
  ORDER_STATUS_COPY,
  ORDER_STATUS_TONE,
  SOURCE_COPY,
  progressStep,
  workspaceActions,
  type OrderDetail,
  type OrderEventRecord,
} from "@/features/orders/types";
import { uploadFile } from "@/features/experts/api";
import { fileDownloadUrl } from "@/features/orders/api";
import { MessageThreadButton } from "@/features/messaging/MessageThreadButton";
import { DisputeSection } from "@/features/disputes/components/dispute-section";
import type { Dispute } from "@/features/disputes/types";
import { PaymentCard } from "@/features/orders/components/payment-card";
import { ReviewSection } from "@/features/reviews/components/review-card";
import type { SubScoreKey, Review } from "@/features/reviews/types";

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
    <div className="space-y-3" aria-label={`Order progress: step ${step + 1} of ${STEPS.length}`}>
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((item, index) => {
          const isCurrent = index === step && !done;
          const isDone = index < step || done;

          return (
            <div key={item.label} className="relative flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white shadow-sm"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground/60 border border-border"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="size-3.5" /> : index + 1}
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold text-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-[11px] text-muted hidden sm:inline-block leading-tight">
                {item.desc}
              </span>
              <span className="text-[10px] font-medium sm:hidden text-muted truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Visual track line */}
      <div className="relative h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: done ? "100%" : `${Math.max(12, (step / (STEPS.length - 1)) * 100)}%`,
          }}
          transition={{ duration: DURATIONS.standard, ease: EASING }}
        />
      </div>
    </div>
  );
}

export function DeliveryComposer({
  onSubmit,
  busy,
}: {
  onSubmit: (summary: string, attachmentIds: string[]) => Promise<void>;
  busy: boolean;
}) {
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

function DeliveryFiles({ order }: { order: OrderDetail }) {
  const latest = order.deliveries[0];
  if (!latest || latest.attachments.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Attached Artifacts</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {latest.attachments.map((file) => (
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
                const url = await fileDownloadUrl(file.id);
                window.open(url, "_blank", "noopener");
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
  const [mode, setMode] = useState<"idle" | "deliver" | "revise" | "cancel">("idle");
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMode("idle"), [order.status, order.deliveries.length]);

  const latest = order.deliveries[0];
  const student = order.role === "student";
  const actions = workspaceActions(order);

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
                {order.status === "completed" ? "Completed On" : "Auto-Approval"}
              </span>
              <span className="text-xs font-semibold text-foreground truncate block">
                {order.status === "completed"
                  ? order.completed_at ? new Date(order.completed_at).toLocaleDateString() : "Finalized"
                  : order.auto_approve_at
                    ? new Date(order.auto_approve_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Active"}
              </span>
            </div>
          </div>
        </div>
      </Card>

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

      {/* 2. Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Deliverable Inspection & Actions (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Deliverable Inspection Panel */}
          <Card className="p-6 border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  {latest
                    ? latest.revision_number === 0
                      ? "Submitted Deliverable"
                      : `Revision Deliverable #${latest.revision_number}`
                    : "Deliverable Workspace"}
                </h2>
              </div>
              {latest && (
                <Badge
                  tone={
                    latest.status === "approved"
                      ? "success"
                      : latest.status === "revision_requested"
                        ? "warning"
                        : "info"
                  }
                  className="capitalize font-semibold text-xs"
                >
                  {latest.status.replace("_", " ")}
                </Badge>
              )}
            </div>

            {latest ? (
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
                    {latest.summary}
                  </p>
                </div>

                <DeliveryFiles order={order} />
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

            {order.status === "revision_requested" && order.deadline && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <Clock className="size-4 shrink-0" />
                <span>
                  A revised delivery is due by{" "}
                  <strong>{new Date(order.deadline).toLocaleDateString()}</strong>.
                </span>
              </div>
            )}

            {/* In-place composers */}
            {mode === "deliver" && (
              <DeliveryComposer
                busy={busy}
                onSubmit={async (summary, ids) => {
                  await onAction("deliver", { summary, ids });
                  setMode("idle");
                }}
              />
            )}
            {mode === "revise" && (
              <RevisionComposer
                busy={busy}
                onSubmit={async (note) => {
                  await onAction("revise", note);
                  setMode("idle");
                }}
              />
            )}
            {mode === "cancel" && (
              <form
                className="space-y-3 rounded-xl border border-danger/20 bg-danger/5 p-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  if (cancelReason.trim().length < 5) {
                    setError("Please tell us why — it helps support resolve things faster.");
                    return;
                  }
                  try {
                    await onAction("cancel", cancelReason.trim());
                    setMode("idle");
                  } catch (cancelError) {
                    setError(cancelError instanceof Error ? cancelError.message : "Could not cancel.");
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-danger" />
                  <h4 className="text-sm font-semibold text-foreground">Order Cancellation</h4>
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
                    <Button key={action.key} variant="ghost" onClick={() => setMode("cancel")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.key === "deliver" ? (
                    <Button key={action.key} onClick={() => setMode("deliver")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.key === "revise" ? (
                    <Button key={action.key} variant="secondary" onClick={() => setMode("revise")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : (
                    <Button key={action.key} onClick={() => void onAction(action.key)} disabled={busy}>
                      {action.label}
                    </Button>
                  ),
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
