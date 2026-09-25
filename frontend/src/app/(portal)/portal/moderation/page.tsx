"use client";

/** /portal/moderation — report queue (Phase 10, BR-34/35): filter, inspect,
 * dismiss or confirm+hide. Actions are service-backed + audited server-side;
 * this UI only sends the intent. No account suspension actions exist by
 * design (recorded decision, admin-journey.md). */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { portalApi, type ReportRow } from "@/features/portal/api";
import { DataTable, FadeIn, OpsSelect } from "@/features/portal/components/ops-ui";
import { ApiError } from "@/lib/api/client";

const STATUS_OPTIONS: [string, string][] = [
  ["", "All"],
  ["open", "Open"],
  ["reviewed", "Reviewed"],
  ["dismissed", "Dismissed"],
];

const REASON_OPTIONS: [string, string][] = [
  ["", "All reasons"],
  ["off_platform", "Off-platform"],
  ["abuse", "Abuse"],
  ["integrity", "Integrity"],
  ["spam", "Spam"],
  ["other", "Other"],
];

function ReviewDrawer({
  report,
  onClose,
  onDone,
}: {
  report: ReportRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "dismiss" | "confirm_hide") => {
    setBusy(true);
    setError(null);
    try {
      await portalApi.reviewReport(report.id, action, note.trim());
      onDone();
    } catch (reviewError) {
      setError(
        reviewError instanceof ApiError
          ? reviewError.code === "report_not_open"
            ? "Already reviewed — refreshing."
            : reviewError.message
          : "Action failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    /* Radix dialog: focus trap, ESC-to-close and aria wiring for free
       (accessibility pass, Phase 11). */
    <Sheet open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto p-5"
        data-testid="report-drawer"
        aria-label={`Review report ${report.reason_display}`}
      >
        <DialogPrimitive.Title className="text-base font-semibold">{report.reason_display}</DialogPrimitive.Title>
        <p className="text-muted text-xs">Report {report.id.slice(0, 8)}…</p>
        <div />

        <div className="border-border bg-surface-2 mt-4 rounded-md p-3 text-sm">
          <p className="text-muted text-xs">
            {report.message.sender} · {new Date(report.message.created_at).toLocaleString()} ·{" "}
            {report.message.is_hidden ? "hidden" : "visible"}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap">{report.message.body}</p>
        </div>
        <p className="text-muted mt-2 text-xs">
          Reported by {report.reporter.name} · {new Date(report.created_at).toLocaleString()}
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor="mod-note" className="text-xs font-medium">
            Reviewer note (audited)
          </label>
          <Textarea id="mod-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        {error && (
          <p role="alert" className="text-danger mt-2 text-xs">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => void act("dismiss")} data-testid="dismiss-report">
            Dismiss report
          </Button>
          <Button disabled={busy} onClick={() => void act("confirm_hide")} data-testid="hide-message">
            Confirm & hide message
          </Button>
        </div>
        <p className="text-muted mt-3 text-[11px]">
          Hiding uses the audited messaging service; the reporter and sender keep their thread history. Account
          warnings/suspensions are not available from the portal (no such service — recorded decision).
        </p>
      </SheetContent>
    </Sheet>
  );
}

export default function ModerationQueuePage() {
  const [status, setStatus] = useState("open");
  const [reason, setReason] = useState("");
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await portalApi.reports({ status: status || undefined, reason: reason || undefined });
      setReports(body.results);
      setTotal(body.total);
      setError(null);
    } catch {
      setError("Could not load the report queue.");
    }
  }, [status, reason]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Moderation queue</h1>
          <p className="text-muted text-xs">
            Message reports (BR-34) — actions audited; grounds-gated thread view applies (BR-35).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OpsSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          <OpsSelect label="Reason" value={reason} options={REASON_OPTIONS} onChange={setReason} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {reports === null ? (
        <p className="text-muted text-sm" aria-busy>
          Loading queue…
        </p>
      ) : reports.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No reports match these filters.</p>
        </Card>
      ) : (
        <FadeIn>
          <DataTable headers={["Status", "Reason", "Message", "Reporter", "Age", ""]} testId="report-queue">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-surface-2/50">
                <td className="px-3 py-2">
                  <Badge tone={report.status === "open" ? "warning" : report.status === "reviewed" ? "success" : "neutral"}>
                    {report.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">{report.reason_display}</td>
                <td className="max-w-[280px] px-3 py-2">
                  <p className="truncate">{report.message.body}</p>
                  <p className="text-muted text-[11px]">
                    {report.message.sender} · {report.message.is_hidden ? "hidden" : "visible"}
                  </p>
                </td>
                <td className="px-3 py-2 text-xs">{report.reporter.name}</td>
                <td className="text-muted px-3 py-2 text-xs">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {report.status === "open" && (
                    <Button size="sm" variant="secondary" onClick={() => setSelected(report)}>
                      Review
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          <p className="text-muted mt-2 text-xs">{total} report(s) total</p>
        </FadeIn>
      )}

      {selected && (
        <ReviewDrawer
          report={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
