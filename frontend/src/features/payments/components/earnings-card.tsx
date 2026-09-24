"use client";

/** Expert earnings foundation — ledger-derived summary + payout status.
 * Deliberately NOT a finance dashboard (Phase 10 owns that). */
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { paymentsApi } from "@/features/payments/api";
import { PAYOUT_STATUS_COPY, type EarningsSummary, type PayoutRecord } from "@/features/payments/types";

export function EarningsCard() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    paymentsApi
      .earnings()
      .then((summary) => {
        if (!cancelled) setEarnings(summary);
      })
      .catch(() => {
        if (!cancelled) setEarnings(null);
      });
    paymentsApi
      .payouts()
      .then((response) => {
        if (!cancelled) setPayouts(response.results.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setPayouts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!earnings || earnings.expert_credit_minor === 0) return null;

  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">Earnings</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted">Earned (net)</dt>
            <dd className="font-medium">
              {earnings.currency} {earnings.expert_credit_display.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Paid out</dt>
            <dd className="font-medium">
              {earnings.currency} {earnings.payout_display.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Available</dt>
            <dd className="font-medium">
              {earnings.currency} {earnings.outstanding_display.toLocaleString()}
            </dd>
          </div>
        </dl>
        {payouts && payouts.length > 0 && (
          <ul className="border-border space-y-1.5 border-t pt-3 text-sm">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-2">
                <span className="text-muted truncate">{payout.order_number}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {payout.currency} {payout.amount_display.toLocaleString()}
                  </span>
                  <Badge tone={payout.status === "paid" ? "success" : payout.status === "failed" ? "danger" : "info"}>
                    {PAYOUT_STATUS_COPY[payout.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
