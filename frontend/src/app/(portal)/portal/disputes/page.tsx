"use client";

/** /portal/disputes — operational dispute queue (Phase 10): triage view +
 * deep-link into the Django admin resolve form (money actions stay there). */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { money, portalApi, type DisputeRow } from "@/features/portal/api";
import { DataTable, FadeIn, OpsSelect } from "@/features/portal/components/ops-ui";

const STATUS_COPY: Record<string, { label: string; tone: "warning" | "info" | "success" | "neutral" }> = {
  open: { label: "Open", tone: "warning" },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dispute queue</h1>
          <p className="text-muted text-xs">
            Triage + visibility. Resolution (refund/release/split) stays the audited Django admin service action —
            use the admin link per row.
          </p>
        </div>
        <OpsSelect
          label="Status"
          value={status}
          options={[
            ["", "All"],
            ["open", "Open"],
            ["under_review", "Under review"],
            ["awaiting_response", "Awaiting response"],
            ["resolved", "Resolved"],
            ["closed", "Closed"],
          ]}
          onChange={setStatus}
        />
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {disputes === null ? (
        <p className="text-muted text-sm" aria-busy>
          Loading queue…
        </p>
      ) : disputes.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No disputes match this filter.</p>
        </Card>
      ) : (
        <FadeIn>
          <DataTable
            headers={["Status", "Order", "Reason", "Amount", "Opened", "Outcome", ""]}
            testId="dispute-queue"
          >
            {disputes.map((dispute) => {
              const statusCopy = STATUS_COPY[dispute.status] ?? { label: dispute.status, tone: "neutral" as const };
              return (
                <tr key={dispute.id} className="hover:bg-surface-2/50">
                  <td className="px-3 py-2">
                    <Badge tone={statusCopy.tone}>{statusCopy.label}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <p className="font-medium">{dispute.order_number}</p>
                    <p className="text-muted">{dispute.order_status}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{dispute.reason_display}</td>
                  <td className="px-3 py-2 tabular-nums">{money(dispute.amount, dispute.currency)}</td>
                  <td className="text-muted px-3 py-2 text-xs">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-xs">{dispute.outcome ? dispute.outcome.replace(/_/g, " ") : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <a href={dispute.admin_url} className="text-primary text-xs underline" target="_blank" rel="noreferrer">
                      Resolve in admin ↗
                    </a>
                  </td>
                </tr>
              );
            })}
          </DataTable>
          <p className="text-muted mt-2 text-xs">{total} dispute(s)</p>
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </FadeIn>
      )}
    </div>
  );
}
