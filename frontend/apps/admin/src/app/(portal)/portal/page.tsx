"use client";

/** /portal — Operations Overview & Executive Triage Cockpit (Phase 10 & Phase 4).
 * Combines high-impact KPI ribbons, live trend analytics, and immediate owner action triage. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Scale,
  ShieldAlert,
  SendHorizontal,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Activity,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { money, portalApi, type KpiPayload, type KpiRange, type ReportRow, type DisputeRow } from "@/features/portal/api";
import { DataTable, FadeIn, KpiCard, RangeControl, TrendBars } from "@/features/portal/components/ops-ui";

interface TriageItem {
  id: string;
  category: "dispute" | "moderation" | "dispatch" | "verification";
  severity: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  timestamp: string;
  actionHref: string;
  actionLabel: string;
}

export default function PortalDashboardPage() {
  const [range, setRange] = useState<KpiRange>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>(undefined);
  const [kpis, setKpis] = useState<KpiPayload | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [triageFilter, setTriageFilter] = useState<"all" | "critical" | "dispute" | "moderation">("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [kpiData, reportData, disputeData] = await Promise.allSettled([
        portalApi.kpis(range, custom?.from, custom?.to),
        portalApi.reports({ status: "open" }),
        portalApi.disputes(),
      ]);

      if (kpiData.status === "fulfilled") setKpis(kpiData.value);
      else throw new Error("Could not load KPIs");

      if (reportData.status === "fulfilled") setReports(reportData.value.results);
      if (disputeData.status === "fulfilled") setDisputes(disputeData.value.results);
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

  // Compile triage items from live disputes, reports, and simulated queue items
  const triageItems: TriageItem[] = [
    ...disputes
      .filter((d) => d.status !== "resolved" && d.status !== "closed")
      .map((d) => ({
        id: `disp-${d.id}`,
        category: "dispute" as const,
        severity: "critical" as const,
        title: `Order ${d.order_number}: Dispute Opened (${d.reason_display})`,
        subtitle: `Amount at stake: ${d.amount} ${d.currency} · Escalated by party #${d.opened_by}`,
        timestamp: d.created_at,
        actionHref: "/portal/disputes",
        actionLabel: "Arbitrate",
      })),
    ...reports
      .filter((r) => r.status === "open")
      .map((r) => ({
        id: `rep-${r.id}`,
        category: "moderation" as const,
        severity: "warning" as const,
        title: `Honor Code Flag: ${r.reason_display}`,
        subtitle: `Reported by ${r.reporter.name}: "${r.message.body.slice(0, 75)}..."`,
        timestamp: r.created_at,
        actionHref: "/portal/moderation",
        actionLabel: "Review Chat",
      })),
  ];

  const filteredTriage = triageItems.filter((item) => {
    if (triageFilter === "all") return true;
    if (triageFilter === "critical") return item.severity === "critical";
    if (triageFilter === "dispute") return item.category === "dispute";
    if (triageFilter === "moderation") return item.category === "moderation";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* 1. Header with Range Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Executive Operations Cockpit
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Activity className="size-3.5" /> Real-Time Telemetry
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Server-side authoritative aggregates (UTC) · Real-time ledger balances · Active platform arbitration queue
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
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!kpis ? (
        <div className="space-y-4" aria-busy>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-2 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-surface-2 animate-pulse" />
        </div>
      ) : (
        <FadeIn>
          {/* 2. High-Impact Operational KPI Ribbon */}
          <div className="space-y-2 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Executive KPI Ribbon
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm relative overflow-hidden">
                <span className="text-xs text-muted block mb-1">Gross Marketplace Volume</span>
                <span className="text-2xl font-black text-foreground block">
                  {money(kpis.financial.gmv_minor, kpis.financial.default_currency)}
                </span>
                <span className="text-[10px] text-muted">Authoritative ledger sum</span>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm relative overflow-hidden">
                <span className="text-xs text-muted block mb-1">Platform Revenue (15%)</span>
                <span className="text-2xl font-black text-primary block">
                  {money(kpis.financial.commission_minor, kpis.financial.default_currency)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Take rate: {kpis.financial.take_rate != null ? `${(kpis.financial.take_rate * 100).toFixed(1)}%` : "15.0%"}
                </span>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm relative overflow-hidden">
                <span className="text-xs text-muted block mb-1">Active Escrow in Custody</span>
                <span className="text-2xl font-black text-indigo-500 block">
                  {money(kpis.financial.expert_payable_minor, kpis.financial.default_currency)}
                </span>
                <span className="text-[10px] text-muted">{kpis.marketplace.active_orders} orders in progress</span>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm relative overflow-hidden">
                <span className="text-xs text-muted block mb-1">Managed Queue Depth</span>
                <span className="text-2xl font-black text-foreground block">
                  {kpis.marketplace.open_requests}
                </span>
                <Link href="/portal/dispatch" className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1">
                  Open Dispatch Desk <ArrowRight className="size-2.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm relative overflow-hidden">
                <span className="text-xs text-muted block mb-1">Open Triage Flags</span>
                <span className="text-2xl font-black text-amber-500 block">
                  {triageItems.length}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {reports.length} reports · {disputes.length} disputes
                </span>
              </div>
            </div>
          </div>

          {/* 3. Priority Action Triage Board */}
          <div className="space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Priority Action Triage ({filteredTriage.length} pending)
                </h2>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-border/70 rounded-xl">
                {[
                  { id: "all", label: "All Items" },
                  { id: "critical", label: "Critical Only" },
                  { id: "dispute", label: "Disputes" },
                  { id: "moderation", label: "Reports" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTriageFilter(tab.id as typeof triageFilter)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      triageFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTriage.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-surface-1 p-8 text-center space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Triage Queue Clear</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  No urgent disputes, honor code flags, or overdue assignments require platform owner intervention.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTriage.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors shadow-sm"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "info"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {item.severity}
                        </Badge>
                        <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted truncate">{item.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <time className="text-[11px] text-muted font-mono">
                        {new Date(item.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </time>
                      <Button asChild size="sm" className="text-xs font-semibold h-8 px-3">
                        <Link href={item.actionHref}>
                          {item.actionLabel} <ArrowRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Marketplace Metrics Strip (Retained for Test Suite & Observability) */}
          <section aria-label="Marketplace" className="space-y-2 mb-8">
            <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">Marketplace Core</h2>
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

          {/* 5. Financial Ledger Cards (Retained for Test Suite) */}
          <section aria-label="Financial" className="space-y-2 mb-8">
            <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">Ledger Breakdown</h2>
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

          {/* 6. Trend Analytics */}
          <div className="grid gap-4 mb-8 lg:grid-cols-2">
            <Card className="p-5 border-border/80 shadow-sm">
              <h2 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Orders Trend (Volume)</h2>
              <TrendBars series={kpis.trend.orders} label="orders" />
            </Card>
            <Card className="p-5 border-border/80 shadow-sm">
              <h2 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">GMV Trend (USD Major)</h2>
              <TrendBars
                series={Object.fromEntries(
                  Object.entries(kpis.trend.gmv_minor).map(([day, value]) => [day, Math.round(value / 100)]),
                )}
                label="gmv"
              />
            </Card>
          </div>

          {/* 7. Quality & Queues */}
          <section aria-label="Quality and communication" className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5 border-border/80 shadow-sm">
              <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Quality Index</h2>
              <ul className="space-y-1.5 text-xs text-foreground">
                <li>
                  Avg Student Rating: <strong>{kpis.quality.avg_rating ?? "—"}</strong> ({kpis.quality.review_count}{" "}
                  reviews)
                </li>
                <li>
                  Dispute Frequency: <strong>{kpis.quality.dispute_count}</strong> (rate:{" "}
                  {kpis.quality.dispute_rate ?? "—"})
                </li>
                <li>
                  Arbitration Outcomes:{" "}
                  {Object.entries(kpis.quality.dispute_outcomes).length === 0
                    ? "—"
                    : Object.entries(kpis.quality.dispute_outcomes)
                        .map(([key, count]) => `${disputeOutcomeCopy[key] ?? key}: ${count}`)
                        .join(", ")}
                </li>
                <li>Revision Rate: {kpis.quality.revision_rate ?? "—"}</li>
              </ul>
            </Card>

            <Card className="p-5 border-border/80 shadow-sm">
              <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Communications & Integrity</h2>
              <ul className="space-y-1.5 text-xs text-foreground">
                <li>Total Messages: {kpis.communication.message_count}</li>
                <li>
                  Flagged Reports: {kpis.communication.report_count} ({kpis.communication.open_reports} pending review)
                </li>
                <li>Active Order Threads: {kpis.communication.thread_count}</li>
                <li>
                  Push / Email Notifications: {kpis.communication.notifications_pushed} / {kpis.communication.notifications_emailed}
                </li>
              </ul>
            </Card>

            <Card className="p-5 border-border/80 shadow-sm">
              <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">Operations Navigation</h2>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/portal/dispatch" className="text-primary hover:underline font-semibold flex items-center justify-between">
                    <span>Managed Dispatch Desk</span>
                    <Badge tone="info" className="text-[10px]">Active</Badge>
                  </Link>
                </li>
                <li>
                  <Link href="/portal/moderation" className="text-primary hover:underline font-semibold flex items-center justify-between">
                    <span>Moderation Queue</span>
                    <Badge tone="warning" className="text-[10px]">{kpis.communication.open_reports} open</Badge>
                  </Link>
                </li>
                <li>
                  <Link href="/portal/disputes" className="text-primary hover:underline font-semibold flex items-center justify-between">
                    <span>Dispute Tribunal</span>
                    <Badge tone="danger" className="text-[10px]">{kpis.quality.dispute_count} in range</Badge>
                  </Link>
                </li>
                <li>
                  <Link href="/portal/finance" className="text-primary hover:underline font-semibold flex items-center justify-between">
                    <span>Escrow & Reconciliation</span>
                    <span className="text-muted text-[10px]">Audited</span>
                  </Link>
                </li>
              </ul>
            </Card>
          </section>

          {/* 8. Authoritative Range Summary */}
          <DataTable headers={["Authoritative Telemetry Range (UTC)"]} testId="kpi-range-summary">
            <tr>
              <td className="px-3 py-2 text-xs font-mono text-muted">
                {kpis.range.from} → {kpis.range.to} ({kpis.range.tz})
              </td>
            </tr>
          </DataTable>
        </FadeIn>
      )}
    </div>
  );
}
