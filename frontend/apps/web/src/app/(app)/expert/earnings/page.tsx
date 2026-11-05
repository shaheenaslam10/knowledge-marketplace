"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpen,
  Send,
  X,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api/client";
import { useSession } from "@/features/auth/SessionProvider";

interface LedgerItem {
  id: number;
  entry_type: string;
  amount_minor: number;
  created_at: string;
  description: string;
}

interface PayoutItem {
  id: number;
  amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
  settled_at: string | null;
}

interface FinancialAnalytics {
  orders_gmv_minor?: number;
  orders_commission_minor?: number;
  orders_net_minor?: number;
  orders_count?: number;
  catalog_gmv_minor?: number;
  catalog_commission_minor?: number;
  catalog_net_minor?: number;
  catalog_count?: number;
  total_gmv_minor?: number;
  total_commission_minor?: number;
  total_net_minor?: number;
  net_earnings_minor?: number;
  withdrawn_minor?: number;
  withdrawable_balance_minor?: number;
  currency?: string;
  recent_ledger_entries?: LedgerItem[];
  recent_credits?: LedgerItem[];
  payout_history?: PayoutItem[];
  payouts?: PayoutItem[];
}

export default function SpecialistEarningsPage() {
  const { user, status } = useSession();
  const [data, setData] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const fetchEarnings = () => {
    setLoading(true);
    apiFetch<FinancialAnalytics>({ path: "/api/v1/me/expert/earnings" })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleRequestPayout = async () => {
    if (!data) return;
    setSubmittingPayout(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amountMinor = withdrawAmount ? Math.round(parseFloat(withdrawAmount) * 100) : null;

    try {
      const res = await apiFetch<{
        payout_id: number;
        amount_minor: number;
        status: string;
        withdrawable_balance_minor: number;
      }>({
        path: "/api/v1/me/expert/payouts/request/",
        method: "POST",
        body: JSON.stringify(amountMinor ? { amount_minor: amountMinor } : {}),
      });

      setWithdrawSuccess(`Payout request for $${(res.amount_minor / 100).toFixed(2)} submitted successfully!`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      fetchEarnings();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setWithdrawError(err.message || "Failed to submit payout request.");
      } else {
        setWithdrawError("Failed to submit payout request.");
      }
    } finally {
      setSubmittingPayout(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-1" />
          ))}
        </div>
      </div>
    );
  }

  const analytics = data || {
    orders_gmv_minor: 0,
    orders_commission_minor: 0,
    orders_net_minor: 0,
    orders_count: 0,
    catalog_gmv_minor: 0,
    catalog_commission_minor: 0,
    catalog_net_minor: 0,
    catalog_count: 0,
    total_gmv_minor: 0,
    total_commission_minor: 0,
    total_net_minor: 0,
    withdrawn_minor: 0,
    withdrawable_balance_minor: 0,
    currency: "USD",
    recent_ledger_entries: [],
    payout_history: [],
  };

  const payoutHistory: PayoutItem[] = analytics.payout_history || analytics.payouts || [];
  const recentCredits: LedgerItem[] = analytics.recent_ledger_entries || analytics.recent_credits || [];
  const totalGmv = analytics.total_gmv_minor || 0;
  const totalCommission = analytics.total_commission_minor || 0;
  const totalNet = analytics.total_net_minor || analytics.net_earnings_minor || 0;
  const withdrawableBalance = analytics.withdrawable_balance_minor || 0;
  const ordersCount = analytics.orders_count || 0;
  const catalogCount = analytics.catalog_count || 0;
  const ordersGmv = analytics.orders_gmv_minor || 0;
  const ordersCommission = analytics.orders_commission_minor || 0;
  const ordersNet = analytics.orders_net_minor || 0;
  const catalogGmv = analytics.catalog_gmv_minor || 0;
  const catalogCommission = analytics.catalog_commission_minor || 0;
  const catalogNet = analytics.catalog_net_minor || 0;
  const withdrawnTotal = analytics.withdrawn_minor || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 space-y-8" data-testid="expert-earnings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <DollarSign className="size-4" />
            <span>Specialist Financial Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Earnings & Payout Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Audited double-entry ledger earnings with 85% specialist payout split, GMV analytics and instant withdrawal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="glow"
            size="sm"
            onClick={() => {
              setWithdrawAmount((withdrawableBalance / 100).toFixed(2));
              setShowWithdrawModal(true);
            }}
            disabled={withdrawableBalance < 1000}
            className="text-xs font-bold shadow-md shadow-primary/20"
            data-testid="open-payout-modal-btn"
          >
            <ArrowUpRight className="size-3.5 mr-1.5" />
            Request Payout Withdrawal
          </Button>
        </div>
      </div>

      {withdrawSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{withdrawSuccess}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross GMV */}
        <Card className="space-y-2 border-border/80">
          <div className="flex items-center justify-between text-muted text-xs font-medium">
            <span>Gross GMV Volume</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground" data-testid="stat-gross-gmv">
            ${(totalGmv / 100).toFixed(2)}
          </div>
          <p className="text-[11px] text-muted">
            Total sales processed across 1:1 orders & catalog
          </p>
        </Card>

        {/* Platform 15% Split */}
        <Card className="space-y-2 border-border/80">
          <div className="flex items-center justify-between text-muted text-xs font-medium">
            <span>Platform Commission (15%)</span>
            <ShieldCheck className="size-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground" data-testid="stat-platform-commission">
            ${(totalCommission / 100).toFixed(2)}
          </div>
          <p className="text-[11px] text-muted">
            Escrow protection, WebRTC & infrastructure fee
          </p>
        </Card>

        {/* Net 85% Earnings */}
        <Card className="space-y-2 border-border/80">
          <div className="flex items-center justify-between text-muted text-xs font-medium">
            <span>Specialist Net (85%)</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400" data-testid="stat-net-earnings">
            ${(totalNet / 100).toFixed(2)}
          </div>
          <p className="text-[11px] text-muted">
            Cumulative payable earnings credited to your ledger
          </p>
        </Card>

        {/* Withdrawable Balance */}
        <Card className="space-y-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-md shadow-primary/5">
          <div className="flex items-center justify-between text-muted text-xs font-medium">
            <span className="font-bold text-foreground">Withdrawable Balance</span>
            <CreditCard className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary" data-testid="stat-withdrawable-balance">
            ${(withdrawableBalance / 100).toFixed(2)}
          </div>
          <p className="text-[11px] text-muted">
            {withdrawableBalance >= 1000
              ? "Available for instant settlement ($10 min)"
              : "Minimum $10.00 required for withdrawal"}
          </p>
        </Card>
      </div>

      {/* Breakdown: 1:1 Live Sessions vs Digital Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">1:1 Sessions & Coaching Orders</h3>
            </div>
            <Badge tone="neutral" className="text-[10px] font-bold">
              {ordersCount} Order{analytics.orders_count === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-muted">Gross GMV</span>
              <p className="text-sm font-extrabold text-foreground mt-1">
                ${(ordersGmv / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-muted">15% Fee</span>
              <p className="text-sm font-extrabold text-muted mt-1">
                ${(ordersCommission / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-emerald-600">85% Net</span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ${(ordersNet / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-emerald-500" />
              <h3 className="font-bold text-sm text-foreground">Knowledge Catalog Products</h3>
            </div>
            <Badge tone="neutral" className="text-[10px] font-bold">
              {catalogCount} Product Sale{analytics.catalog_count === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-muted">Gross GMV</span>
              <p className="text-sm font-extrabold text-foreground mt-1">
                ${(catalogGmv / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-muted">15% Fee</span>
              <p className="text-sm font-extrabold text-muted mt-1">
                ${(catalogCommission / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-1 p-3">
              <span className="text-[10px] uppercase font-bold text-emerald-600">85% Net</span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ${(catalogNet / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payout History & Ledger Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Payout Withdrawals</h3>
            <span className="text-[11px] text-muted">Total Paid: ${(withdrawnTotal / 100).toFixed(2)}</span>
          </div>

          {payoutHistory.length === 0 ? (
            <Card className="text-center py-8 text-xs text-muted">
              No payout withdrawals requested yet.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs" data-testid="payouts-table">
                <thead className="border-b border-border/80 bg-surface-1/70 uppercase tracking-wider text-[10px] font-extrabold text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Amount</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payoutHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-1/40">
                      <td className="px-3.5 py-2.5 text-muted">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                        ${(p.amount_minor / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {p.status === "paid" ? <CheckCircle2 className="size-2.5" /> : <Clock className="size-2.5" />}
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Ledger Credits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Recent Double-Entry Credits</h3>
            <span className="text-[11px] text-muted">Append-only audit trail</span>
          </div>

          {recentCredits.length === 0 ? (
            <Card className="text-center py-8 text-xs text-muted">
              No ledger transactions recorded yet.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs" data-testid="ledger-table">
                <thead className="border-b border-border/80 bg-surface-1/70 uppercase tracking-wider text-[10px] font-extrabold text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Description</th>
                    <th className="px-3.5 py-2.5 text-right">Net Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentCredits.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-1/40">
                      <td className="px-3.5 py-2.5 text-muted">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-foreground max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +${(entry.amount_minor / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payout Request Modal */}
      {showWithdrawModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground space-y-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="payout-request-modal"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="font-bold text-base">Request Payout Settlement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-md text-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-1 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted">Available Withdrawable Balance</span>
                <p className="text-xl font-black text-primary">
                  ${(withdrawableBalance / 100).toFixed(2)} USD
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Withdrawal Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="10.00"
                    max={(withdrawableBalance / 100).toFixed(2)}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-1 pl-7 pr-3 py-2 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none"
                    placeholder="50.00"
                    data-testid="payout-amount-input"
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[11px] text-muted">
                  <span>Minimum withdrawal: $10.00</span>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount((withdrawableBalance / 100).toFixed(2))}
                    className="text-primary font-semibold hover:underline"
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              {withdrawError && (
                <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-2.5 text-xs text-danger">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <Button
                type="button"
                variant="glow"
                size="lg"
                onClick={() => void handleRequestPayout()}
                disabled={submittingPayout || !withdrawAmount || parseFloat(withdrawAmount) < 10}
                className="w-full font-bold shadow-md shadow-primary/20 text-xs py-3 h-auto"
                data-testid="submit-payout-btn"
              >
                {submittingPayout ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting Payout Request...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    Submit Payout Request
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
