"use client";

/** /portal — KPI dashboard (Phase 10): server-aggregated metrics, UTC ranges,
 * dependency-free trend bars. Definitions: observability.md §KPI dictionary. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { money, portalApi, type KpiPayload, type KpiRange } from "@/features/portal/api";
import { DataTable, FadeIn, KpiCard, RangeControl, TrendBars } from "@/features/portal/components/ops-ui";

export default function PortalDashboardPage() {
  const [range, setRange] = useState<KpiRange>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>(undefined);
  const [kpis, setKpis] = useState<KpiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setKpis(await portalApi.kpis(range, custom?.from, custom?.to));
    } catch {
      setError("Could not load KPIs — staff access and backend required.");
    } finally {
      setBusy(false);
    }
  }, [range, custom]);

  useEffect(() => {
    void load();
  }, [load]);

  const disputeOutcomeCopy: Record<string, string> = {
    refund_student_full: "Full refunds",
    refund_student_partial: "Partial refunds",
    release_expert: "Released to expert",
    split: "Split",
    no_fault_close: "No-fault closes",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Operations dashboard</h1>
          <p className="text-muted text-xs">
            Server-side aggregates (UTC) — definitions in docs/architecture/observability.md. Money reads the
            ledger, never recomputes it.
          </p>
        </div>
        <RangeControl
          value={range}
          busy={busy}
          onChange={(next) => {
            setCustom(undefined);
            setRange(next);
          }}
          onCustom={(from, to) => {
            setRange("custom");
            setCustom({ from, to });
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {!kpis ? (
        <p className="text-muted text-sm" aria-busy>
          Loading KPIs…
        </p>
      ) : (
        <>
          <FadeIn>
            <section aria-label="Marketplace" className="space-y-2">
              <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">Marketplace</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <KpiCard label="Requests" value={kpis.marketplace.total_requests} />
                <KpiCard label="Open" value={kpis.marketplace.open_requests} />
                <KpiCard label="Matched" value={kpis.marketplace.matched_requests} />
                <KpiCard label="Match rate" value={kpis.marketplace.request_to_match_rate ?? "—"} />
                <KpiCard label="Active orders" value={kpis.marketplace.active_orders} />
                <KpiCard label="Completed" value={kpis.marketplace.completed_orders} />
                <KpiCard label="Cancelled" value={kpis.marketplace.cancelled_orders} />
              </div>
            </section>

            <section aria-label="Financial" className="space-y-2 pt-2">
              <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">Financial</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard label="GMV" value={money(kpis.financial.gmv_minor, kpis.financial.default_currency)} />
                <KpiCard
                  label="Commission"
                  value={money(kpis.financial.commission_minor, kpis.financial.default_currency)}
                  hint={`take rate ${kpis.financial.take_rate ?? "—"}`}
                />
                <KpiCard
                  label="Expert payable"
                  value={money(kpis.financial.expert_payable_minor, kpis.financial.default_currency)}
                />
                <KpiCard
                  label="Refunds"
                  value={money(kpis.financial.refunds_minor, kpis.financial.default_currency)}
                />
                <KpiCard
                  label="Payouts"
                  value={
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(kpis.financial.payouts).map(([status, count]) => (
                        <Badge key={status} tone={status === "paid" ? "success" : status === "failed" ? "danger" : "neutral"}>
                          {status}: {count}
                        </Badge>
                      ))}
                    </span>
                  }
                />
              </div>
            </section>

            <div className="grid gap-4 pt-2 lg:grid-cols-2">
              <Card>
                <h2 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Orders per day</h2>
                <TrendBars series={kpis.trend.orders} label="orders" />
              </Card>
              <Card>
                <h2 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">GMV per day</h2>
                <TrendBars
                  series={Object.fromEntries(
                    Object.entries(kpis.trend.gmv_minor).map(([day, value]) => [day, Math.round(value / 100)]),
                  )}
                  label="gmv"
                />
              </Card>
            </div>

            <section aria-label="Quality and communication" className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Quality</h2>
                <ul className="space-y-1 text-sm">
                  <li>
                    Avg rating: <strong>{kpis.quality.avg_rating ?? "—"}</strong> ({kpis.quality.review_count}{" "}
                    reviews)
                  </li>
                  <li>
                    Disputes: <strong>{kpis.quality.dispute_count}</strong> (rate{" "}
                    {kpis.quality.dispute_rate ?? "—"})
                  </li>
                  <li>
                    Outcomes:{" "}
                    {Object.entries(kpis.quality.dispute_outcomes).length === 0
                      ? "—"
                      : Object.entries(kpis.quality.dispute_outcomes)
                          .map(([key, count]) => `${disputeOutcomeCopy[key] ?? key}: ${count}`)
                          .join(", ")}
                  </li>
                  <li>Revision rate: {kpis.quality.revision_rate ?? "—"}</li>
                </ul>
              </Card>
              <Card>
                <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Communication</h2>
                <ul className="space-y-1 text-sm">
                  <li>Messages: {kpis.communication.message_count}</li>
                  <li>
                    Reports: {kpis.communication.report_count} ({kpis.communication.open_reports} open)
                  </li>
                  <li>Threads: {kpis.communication.thread_count}</li>
                  <li>
                    Notifications: {kpis.communication.notifications_pushed} pushed /{" "}
                    {kpis.communication.notifications_emailed} emailed
                  </li>
                </ul>
              </Card>
              <Card>
                <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Queues</h2>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link href="/portal/moderation" className="text-primary underline">
                      Moderation queue
                    </Link>{" "}
                    — {kpis.communication.open_reports} open report(s)
                  </li>
                  <li>
                    <Link href="/portal/disputes" className="text-primary underline">
                      Dispute queue
                    </Link>{" "}
                    — {kpis.quality.dispute_count} in range
                  </li>
                  <li>
                    <Link href="/portal/finance" className="text-primary underline">
                      Reconciliation
                    </Link>
                  </li>
                  <li>
                    <Link href="/portal/audit" className="text-primary underline">
                      Audit viewer
                    </Link>
                  </li>
                </ul>
              </Card>
            </section>

            <DataTable headers={["Range (UTC)"]} testId="kpi-range-summary">
              <tr>
                <td className="px-3 py-2 text-xs">
                  {kpis.range.from} → {kpis.range.to} ({kpis.range.tz})
                </td>
              </tr>
            </DataTable>
          </FadeIn>
        </>
      )}
    </div>
  );
}
