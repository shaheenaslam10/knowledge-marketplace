"use client";

/** BR-34 report action + on-platform policy banner (Phase 9).
 * The banner is informational; the report dialog posts through messagingApi
 * and surfaces the backend's idempotency/validation copy on failure. */
import { Flag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { messagingApi } from "@/features/messaging/api";
import { ApiError } from "@/lib/api/client";

export const POLICY_BANNER =
  "Keep conversations and payments on Expert Marketplace — off-platform contact or payment isn't covered by escrow or reviews, and is bannable. Report suspicious messages.";

export function PolicyBanner() {
  return (
    <p
      className="border-border bg-primary-soft text-foreground rounded-md border px-3 py-2 text-xs"
      data-testid="policy-banner"
      role="note"
    >
      {POLICY_BANNER}
    </p>
  );
}

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "off_platform", label: "Taking conversation/payment off-platform" },
  { value: "abuse", label: "Abuse or harassment" },
  { value: "integrity", label: "Academic integrity concern" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function ReportMessageButton({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Report this message"
        title="Report this message"
        className="text-muted hover:text-danger mt-1 text-[10px] underline-offset-2 hover:underline"
        data-testid={`report-cta-${messageId}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="mr-0.5 inline size-3" aria-hidden />
        Report
      </button>
    );
  }

  if (state === "done") {
    return (
      <p className="text-success mt-1 text-[10px]" role="status" data-testid={`report-done-${messageId}`}>
        Reported — our moderation team will take a look.
      </p>
    );
  }

  return (
    <form
      className="mt-1 space-y-1.5 rounded-md border border-border bg-surface-2 p-2 text-left"
      data-testid={`report-form-${messageId}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!reason) {
          setError("Pick a reason.");
          return;
        }
        setState("sending");
        try {
          await messagingApi.reportMessage(messageId, reason, details.trim());
          setState("done");
        } catch (reportError) {
          setState("idle");
          setError(reportError instanceof ApiError ? reportError.message : "Could not send the report.");
        }
      }}
    >
      <select
        aria-label="Report reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="border-border bg-surface text-foreground w-full rounded-md border px-2 py-1 text-xs"
      >
        <option value="">Reason…</option>
        {REPORT_REASONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        aria-label="Additional details (optional)"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        placeholder="Details (optional)"
        className="border-border bg-surface text-foreground w-full rounded-md border px-2 py-1 text-xs"
      />
      {error && (
        <p role="alert" className="text-danger text-[10px]">
          {error}
        </p>
      )}
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" variant="secondary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send report"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
