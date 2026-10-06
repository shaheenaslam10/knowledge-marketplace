"use client";

/** Student + expert order list — one implementation for all three sources. */
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PackageCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  FileCheck2,
  CheckCircle2,
  Lock,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/features/orders/api";
import { EarningsCard } from "@/features/payments/components/earnings-card";
import {
  ORDER_STATUS_COPY,
  ORDER_STATUS_TONE,
  SOURCE_COPY,
  type OrderListItem,
  type OrderStatus,
} from "@/features/orders/types";

const STATUS_FILTERS = ["all", "active", "delivered", "completed"] as const;

function price(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OrdersListClient() {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list()
      .then((response) => {
        if (!cancelled) setOrders(response.results);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger-soft/60 p-4 text-xs font-medium text-danger" role="alert">
        Couldn&apos;t load your orders — refresh to try again.
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-3" aria-busy>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const visible = orders.filter((order) => (filter === "all" ? true : order.status === filter));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column (67% width = 8 cols): Filter pills and structured order cards */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Filter orders by status">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                filter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted hover:text-foreground hover:bg-surface-3"
              }`}
            >
              {status} ({orders.filter((o) => status === "all" || o.status === status).length})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-border bg-card">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <PackageCheck className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {orders.length === 0 ? "No active orders yet" : "No orders matching this status"}
            </h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {orders.length === 0
                ? "Once a task brief is matched with an expert or an offer is accepted, the escrow-funded working order appears here."
                : "Try selecting another status tab above to see your order history."}
            </p>
            {orders.length === 0 && (
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href="/requests/new">
                    <Plus className="size-3.5 mr-1" /> Post a Brief
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group block rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border">
                          {order.number}
                        </span>
                        <span className="text-[11px] font-semibold text-muted">
                          {SOURCE_COPY[order.source]}
                        </span>
                        <Badge tone={ORDER_STATUS_TONE[order.status as OrderStatus]}>
                          {ORDER_STATUS_COPY[order.status as OrderStatus]}
                        </Badge>
                      </div>
                      <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-md">
                        {order.request_title}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <span className="text-sm font-black font-mono text-foreground">
                        {price(order.amount_display)}
                      </span>
                      <div className="flex items-center text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right Column (33% width = 4 cols, sticky): Earnings/Escrow telemetry and safety */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
        <EarningsCard />

        {/* Milestone Escrow Security Capsule */}
        <Card className="p-5 border-border/80 bg-card space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Escrow Custody Safe</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Order deposits are held in double-entry custodial vault escrow. Funds are never released until you inspect the submitted deliverables.
          </p>
          <div className="pt-2 border-t border-border/60 space-y-2 text-[11px] text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>72-hour deliverable inspection window</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 text-primary shrink-0" />
              <span>Binding dispute arbitration tribunal</span>
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <FileCheck2 className="size-4" />
            <span>Need More Guidance?</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Have another course, code review, or exam prep requirement? Launch a new brief in under 2 minutes.
          </p>
          <Button asChild size="sm" className="w-full font-semibold shadow-xs">
            <Link href="/requests/new" className="flex items-center justify-center gap-1.5">
              <Plus className="size-3.5" />
              <span>Post New Academic Brief</span>
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
