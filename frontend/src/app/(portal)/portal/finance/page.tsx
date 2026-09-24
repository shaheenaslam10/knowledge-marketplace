"use client";

/** /portal/finance — financial reconciliation (Phase 10): read-only
 * consistency checks over orders/payments/refunds/payouts/ledger/webhooks.
 * No repair actions exist here by design — fixes run as Django-admin service
 * actions (admin-journey.md). */
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { portalApi, type ReconciliationPayload } from "@/features/portal/api";
import { DataTable, FadeIn } from "@/features/portal/components/ops-ui";

const CHECK_COPY: Record<string, string> = {
  ledger_identity: "Ledger identity (charge + refund = commission + credit + fee)",
  refund_ledger_parity: "Refund rows vs REFUND ledger entries",
  payout_credit_parity: "Unsettled payouts vs unallocated expert credit",
  payment_ledger_coverage: "Succeeded payments missing charge entries",
  payment_refund_state: "Payment.refunded_minor vs refund rows",
  webhook_failures: "Failed webhook events (replay from admin)",
};

export default function ReconciliationPage() {
  const [report, setReport] = useState<ReconciliationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setReport(await portalApi.reconciliation());
      setError(null);
    } catch {
      setError("Could not load the reconciliation report.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Financial reconciliation</h1>
          <p className="text-muted text-xs">
            Read-only consistency surfaces. Repairs = Django-admin service actions only.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load()} disabled={busy}>
          {busy ? "Checking…" : "Re-run checks"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {!report ? (
        <p className="text-muted text-sm" aria-busy>
          Running checks…
        </p>
      ) : (
        <FadeIn>
          <div className="flex flex-wrap items-center gap-2">
            {report.ok ? (
              <Badge tone="success">All checks pass</Badge>
            ) : (
              <Badge tone="danger">{report.findings.length} finding(s)</Badge>
            )}
            <span className="text-muted text-xs">as of {new Date(report.generated_at).toLocaleString()}</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Card>
              <p className="text-muted text-[11px] uppercase">Succeeded payments</p>
              <p className="text-lg font-semibold tabular-nums">{report.summary.succeeded_payments}</p>
            </Card>
            <Card>
              <p className="text-muted text-[11px] uppercase">Refunds</p>
              <p className="text-lg font-semibold tabular-nums">{report.summary.refund_count}</p>
            </Card>
            <Card>
              <p className="text-muted text-[11px] uppercase">Payouts</p>
              <p className="text-sm">
                {Object.entries(report.summary.payout_counts).map(([status, count]) => (
                  <Badge key={status} tone={status === "paid" ? "success" : status === "failed" ? "danger" : "neutral"}>
                    {status}: {count}
                  </Badge>
                ))}
              </p>
            </Card>
            <Card>
              <p className="text-muted text-[11px] uppercase">Failed webhooks</p>
              <p className="text-lg font-semibold tabular-nums">{report.summary.failed_webhooks}</p>
            </Card>
          </div>

          {report.findings.length > 0 && (
            <div className="mt-4">
              <DataTable headers={["Severity", "Check", "Reference", "Detail"]} testId="reconciliation-findings">
                {report.findings.map((finding, index) => (
                  <tr key={`${finding.check}-${index}`}>
                    <td className="px-3 py-2">
                      <Badge tone={finding.severity === "high" ? "danger" : "warning"}>{finding.severity}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{CHECK_COPY[finding.check] ?? finding.check}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {finding.order_id ?? finding.payment_id ?? "—"}
                    </td>
                    <td className="max-w-[320px] truncate px-3 py-2 font-mono text-[11px] text-muted">
                      {JSON.stringify(finding.detail)}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </FadeIn>
      )}
    </div>
  );
}
