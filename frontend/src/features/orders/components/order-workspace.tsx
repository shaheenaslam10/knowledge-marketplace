"use client";

/** Order workspace — shared by student + expert across all three sources.
 * Timeline renders ONLY persisted OrderEvents; every action calls the API and
 * re-fetches (server owns all transitions — the UI never mutates status). */
import { motion } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

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
import { fileDownloadUrl } from "@/features/orders/api";
import { MessageThreadButton } from "@/features/messaging/MessageThreadButton";
import { DisputeSection } from "@/features/disputes/components/dispute-section";
import type { Dispute } from "@/features/disputes/types";
import { PaymentCard } from "@/features/orders/components/payment-card";
import { ReviewSection } from "@/features/reviews/components/review-card";
import type { SubScoreKey } from "@/features/reviews/types";
import type { Review } from "@/features/reviews/types";

const STEPS = ["Confirmed", "In progress", "Delivered", "Completed"] as const;

function Timeline({ events }: { events: OrderEventRecord[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="space-y-3">
      {events.map((event, index) => (
        <motion.li
          key={`${event.event_type}-${event.created_at}-${index}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATIONS.fast, delay: index * 0.04, ease: EASING }}
          className="flex items-start gap-3 text-sm"
        >
          <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
          <div>
            <p className="font-medium text-foreground">{EVENT_COPY[event.event_type] ?? event.event_type}</p>
            <time className="text-xs text-muted" dateTime={event.created_at}>
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
    <div className="flex items-center gap-1" aria-label={`Order progress: step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((label, index) => (
        <div key={label} className="flex flex-1 items-center gap-1">
          <div className="flex flex-col items-center gap-1.5">
            <motion.span
              className={`block size-2.5 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`}
              animate={
                index === step && !done ? { scale: [1, 1.3, 1] } : { scale: 1 }
              }
              transition={
                index === step && !done ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : undefined
              }
            />
            <span className={`text-[10px] leading-none ${index <= step ? "text-foreground" : "text-muted"}`}>
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div className="relative h-px flex-1 bg-border">
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
      className="space-y-3"
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
          for (const file of files) {
            const form = new FormData();
            form.set("purpose", "delivery");
            form.set("uploaded_file", file);
            const response = await fetch("/api/v1/files", { method: "POST", body: form });
            if (!response.ok) {
              const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
              throw new Error(body?.error?.message ?? "Upload failed");
            }
            const body = (await response.json()) as { id: string };
            ids.push(body.id);
          }
          await onSubmit(summary.trim(), ids);
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : "Could not submit delivery.");
        } finally {
          setUploading(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="delivery-summary" className="text-sm font-medium text-foreground">
          Delivery summary
        </label>
        <Textarea
          id="delivery-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          placeholder="What did you deliver? How does it answer the request?"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="delivery-files" className="text-sm font-medium text-foreground">
          Files (PDF/JPG/PNG, ≤25 MB each)
        </label>
        <Input
          id="delivery-files"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || uploading}>
        {uploading ? "Uploading…" : "Submit delivery"}
      </Button>
    </form>
  );
}

function RevisionComposer({ onSubmit, busy }: { onSubmit: (note: string) => Promise<void>; busy: boolean }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-2"
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
      <Textarea
        aria-label="Revision note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="What needs to change?"
      />
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy}>
        Request revision
      </Button>
    </form>
  );
}

function DeliveryFiles({ order }: { order: OrderDetail }) {
  const latest = order.deliveries[0];
  if (!latest || latest.attachments.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {latest.attachments.map((file) => (
        <li key={file.id}>
          <button
            type="button"
            className="text-primary text-sm underline-offset-2 hover:underline"
            onClick={async () => {
              const url = await fileDownloadUrl(file.id);
              window.open(url, "_blank", "noopener");
            }}
          >
            {file.original_name} ({Math.max(1, Math.round(file.size / 1024))} KB)
          </button>
        </li>
      ))}
    </ul>
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
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted text-sm">{order.number}</p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{order.request_title}</h1>
              <p className="text-muted mt-1 text-sm">
                {SOURCE_COPY[order.source]} · {student ? `Expert: ${order.counterparty}` : `Client: ${order.counterparty}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_COPY[order.status]}</Badge>
              </motion.span>
            </div>
          </div>
          <ProgressRail status={order.status} />
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Agreed price</dt>
              <dd className="font-medium">
                {order.currency} {order.amount_display.toLocaleString()}
              </dd>
            </div>
            {student && (
              <div>
                <dt className="text-muted">Expert receives</dt>
                <dd className="font-medium">
                  {order.currency} {order.expert_amount_display.toLocaleString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Revisions</dt>
              <dd className="font-medium">
                {order.revisions_used} / {order.revisions_allowed}
              </dd>
            </div>
            {order.auto_approve_at && order.status !== "completed" && (
              <div>
                <dt className="text-muted">Auto-approves</dt>
                <dd className="font-medium">{new Date(order.auto_approve_at).toLocaleString()}</dd>
              </div>
            )}
          </dl>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-4">
            {latest ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">
                    {latest.revision_number === 0 ? "Delivery" : `Revision ${latest.revision_number}`}
                  </h2>
                  <Badge
                    tone={
                      latest.status === "approved"
                        ? "success"
                        : latest.status === "revision_requested"
                          ? "warning"
                          : "info"
                    }
                  >
                    {latest.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-foreground whitespace-pre-line text-sm">{latest.summary}</p>
                <DeliveryFiles order={order} />
              </div>
            ) : (
              <p className="text-muted text-sm">
                No delivery yet.{" "}
                {student
                  ? "Your expert is working — the timeline updates the moment it lands."
                  : "Submit your work when it's ready."}
              </p>
            )}

            {order.status === "revision_requested" && order.deadline && (
              <p className="text-muted text-sm">
                A revised delivery is due by{" "}
                <strong className="text-foreground">{new Date(order.deadline).toLocaleDateString()}</strong>.
              </p>
            )}

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
                className="space-y-2"
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
                <Textarea
                  aria-label="Cancellation reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  placeholder="Why are you cancelling?"
                />
                {error && (
                  <p role="alert" className="text-danger text-sm">
                    {error}
                  </p>
                )}
                <Button type="submit" variant="secondary" disabled={busy}>
                  Confirm cancellation
                </Button>
              </form>
            )}

            {(order.status === "completed" || review) && (
              <div className="border-border border-t pt-4">
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

            {actions.length > 0 && mode === "idle" && (
              <div className="border-border flex flex-wrap gap-2 border-t pt-4">
                {actions.map((action) =>
                  action.key === "pay" ? (
                    <Button key={action.key} onClick={() => void onAction("pay")} disabled={busy}>
                      {action.label}
                    </Button>
                  ) : action.tone === "ghost" ? (
                    <span key={action.key} className="text-muted self-center text-xs">
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
          </div>
        </Card>

        <Card>
          <div>
            <h2 className="text-muted mb-3 text-sm font-semibold uppercase tracking-wide">Timeline</h2>
            <Timeline events={order.events} />
          </div>
        </Card>
      </div>

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
  );
}
