"use client";

/** Order-workspace dispute panel (Phase 9, BR-40/41): open a dispute within
 * the window, follow its state machine, attach evidence, reach the dispute
 * thread. Resolution is admin-executed — the panel is read-only about money. */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { messagingApi } from "@/features/messaging/api";
import { fileDownloadUrl } from "@/features/orders/api";
import { ApiError } from "@/lib/api/client";

import { uploadDisputeEvidence } from "../api";
import {
  DISPUTE_OUTCOME_COPY,
  DISPUTE_REASONS,
  DISPUTE_STATUS_COPY,
  DISPUTE_STATUS_TONE,
  MAX_DESCRIPTION_CHARS,
  MIN_DESCRIPTION_CHARS,
  canOpenDispute,
  type Dispute,
} from "../types";

function EvidenceList({ dispute, onAdd }: { dispute: Dispute; onAdd?: (ids: string[]) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async (id: string) => {
    try {
      window.open(await fileDownloadUrl(id), "_blank", "noopener");
    } catch {
      setError("Could not open the file.");
    }
  };

  return (
    <div className="space-y-2" data-testid="dispute-evidence">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">Evidence</p>
      {dispute.evidence.length > 0 && (
        <ul className="space-y-1">
          {dispute.evidence.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="text-primary text-sm underline-offset-2 hover:underline"
                onClick={() => void open(file.id)}
              >
                📄 {file.original_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {onAdd && (
        <div className="space-y-2">
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            aria-label="Attach more evidence"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={async () => {
                setError(null);
                setUploading(true);
                try {
                  const ids: string[] = [];
                  for (const file of files) ids.push(await uploadDisputeEvidence(file));
                  await onAdd(ids);
                  setFiles([]);
                } catch (uploadError) {
                  setError(uploadError instanceof ApiError ? uploadError.message : "Upload failed.");
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? "Uploading…" : `Attach ${files.length} file${files.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function DisputeStatusCard({
  dispute,
  onAddEvidence,
  busy,
}: {
  dispute: Dispute;
  onAddEvidence?: (ids: string[]) => Promise<void>;
  busy: boolean;
}) {
  const router = useRouter();
  const openThread = async () => {
    const thread = await messagingApi.open({ context_type: "dispute", order_id: dispute.order_id });
    router.push(`/messages/${thread.id}`);
  };
  const active = dispute.status !== "resolved" && dispute.status !== "closed";

  return (
    <div className="space-y-3" data-testid="dispute-status">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>{DISPUTE_STATUS_COPY[dispute.status]}</Badge>
        <span className="text-muted text-sm">{dispute.reason_display}</span>
      </div>
      <p className="text-foreground whitespace-pre-line text-sm">{dispute.description}</p>
      {dispute.outcome && (
        <p className="text-sm">
          <span className="text-muted">Outcome: </span>
          <span className="text-foreground font-medium">{DISPUTE_OUTCOME_COPY[dispute.outcome]}</span>
        </p>
      )}
      {dispute.resolution_notes && (
        <div className="border-border bg-surface-2 rounded-md p-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">Resolution</p>
          <p className="text-foreground mt-1 whitespace-pre-line text-sm">{dispute.resolution_notes}</p>
        </div>
      )}
      <EvidenceList dispute={dispute} onAdd={active ? onAddEvidence : undefined} />
      <Button size="sm" variant="secondary" onClick={() => void openThread()}>
        Open dispute thread
      </Button>
      {busy && <span className="text-muted text-xs">Working…</span>}
    </div>
  );
}

function DisputeComposer({
  onSubmit,
  busy,
  defaultReason,
}: {
  onSubmit: (input: { reason: string; description: string; evidenceIds: string[] }) => Promise<void>;
  busy: boolean;
  defaultReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason ?? "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} data-testid="open-dispute-cta">
        Open a dispute
      </Button>
    );
  }

  return (
    <form
      className="space-y-3"
      data-testid="dispute-composer"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!reason) {
          setError("Pick the reason that fits best.");
          return;
        }
        if (description.trim().length < MIN_DESCRIPTION_CHARS) {
          setError(`Describe the problem in at least ${MIN_DESCRIPTION_CHARS} characters.`);
          return;
        }
        if (description.length > MAX_DESCRIPTION_CHARS) {
          setError(`Descriptions are limited to ${MAX_DESCRIPTION_CHARS.toLocaleString()} characters.`);
          return;
        }
        try {
          setUploading(true);
          const evidenceIds: string[] = [];
          for (const file of files) evidenceIds.push(await uploadDisputeEvidence(file));
          await onSubmit({ reason, description: description.trim(), evidenceIds });
        } catch (openError) {
          setError(openError instanceof ApiError ? openError.message : "Could not open the dispute.");
        } finally {
          setUploading(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="dispute-reason" className="text-sm font-medium text-foreground">
          Reason
        </label>
        <select
          id="dispute-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="border-border bg-surface text-foreground w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select a reason…</option>
          {DISPUTE_REASONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="dispute-description" className="text-sm font-medium text-foreground">
          What went wrong?
        </label>
        <Textarea
          id="dispute-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Facts first: what was agreed, what happened, what you propose."
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="dispute-evidence-files" className="text-sm font-medium text-foreground">
          Evidence (optional — PDF/JPG/PNG, ≤10 MB each)
        </label>
        <Input
          id="dispute-evidence-files"
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
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={busy || uploading}>
          {uploading ? "Uploading…" : "Open dispute"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function DisputeSection({
  orderStatus,
  orderRole,
  dispute,
  busy,
  onOpen,
  onAddEvidence,
}: {
  orderStatus: string;
  orderRole: "student" | "expert";
  dispute: Dispute | null;
  busy: boolean;
  onOpen: (input: { reason: string; description: string; evidenceIds: string[] }) => Promise<void>;
  onAddEvidence: (disputeId: string, ids: string[]) => Promise<void>;
}) {
  const eligible = canOpenDispute(orderStatus);

  return (
    <Card data-testid="dispute-section">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">Dispute</h2>
          {dispute == null && eligible && orderRole === "student" && (
            <span className="text-muted text-xs">Within the BR-40 window</span>
          )}
        </div>
        {dispute ? (
          <DisputeStatusCard
            dispute={dispute}
            busy={busy}
            onAddEvidence={async (ids) => {
              await onAddEvidence(dispute.id, ids);
            }}
          />
        ) : eligible ? (
          orderRole === "student" ? (
            <>
              <p className="text-muted text-sm">
                Something off? Open a dispute and an admin mediates (first response within 24h). The expert
                payout pauses while a dispute is open.
              </p>
              <DisputeComposer onSubmit={onOpen} busy={busy} />
            </>
          ) : (
            <p className="text-muted text-sm" data-testid="dispute-none-expert">
              No dispute on this order. If the client opens one, it appears here and the payout pauses
              until resolution.
            </p>
          )
        ) : (
          <p className="text-muted text-sm">
            Disputes open while the order is running or within 7 days after completion (BR-40).
          </p>
        )}
      </div>
    </Card>
  );
}
