"use client";

/** Student + expert order list — one implementation for all three sources. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const metrics = useMemo(() => {
    if (!orders) return { active: 0, delivered: 0, completed: 0, totalAmount: 0 };
    return {
      active: orders.filter((o) => o.status === "active").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      completed: orders.filter((o) => o.status === "completed").length,
      totalAmount: orders.reduce((sum, o) => sum + (o.amount_display || 0), 0),
    };
  }, [orders]);

  if (failed) {
    return (
      <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" />
        <span>Couldn&apos;t load your orders — refresh to try again.</span>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const visible = orders.filter((order) => {
    const matchesFilter = filter === "all" ? true : order.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      order.request_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <EarningsCard />

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
          <span className="text-xs text-muted block mb-1">Active In-Progress</span>
          <span className="text-2xl font-black text-foreground">{metrics.active}</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
          <span className="text-xs text-muted block mb-1">Awaiting Inspection</span>
          <span className="text-2xl font-black text-amber-500">{metrics.delivered}</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
          <span className="text-xs text-muted block mb-1">Completed Orders</span>
          <span className="text-2xl font-black text-emerald-500">{metrics.completed}</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
          <span className="text-xs text-muted block mb-1">Total Volume</span>
          <span className="text-2xl font-black text-primary">{price(metrics.totalAmount)}</span>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-1 border border-border/70 rounded-xl" role="tablist" aria-label="Filter orders by status">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-1 border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1 space-y-3">
          <Briefcase className="size-10 mx-auto text-muted/60" />
          <h3 className="text-sm font-semibold text-foreground">No orders found</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            {orders.length === 0
              ? "Once a request is matched or an offer is accepted, the working order and escrow tracking will appear here."
              : "No orders match your selected filters. Try searching for a different keyword or reset status."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="group relative block rounded-2xl border border-border/80 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {order.number}
                      </span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted font-medium">{SOURCE_COPY[order.source]}</span>
                      <span className="text-xs text-muted">·</span>
                      <time className="text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {order.request_title}
                    </h2>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="text-right">
                      <span className="text-xs text-muted block">Escrow Amount</span>
                      <span className="text-base font-extrabold text-foreground">{price(order.amount_display)}</span>
                    </div>
                    <Badge
                      tone={ORDER_STATUS_TONE[order.status as OrderStatus]}
                      className="px-2.5 py-1 text-xs font-semibold capitalize"
                    >
                      {ORDER_STATUS_COPY[order.status as OrderStatus]}
                    </Badge>
                    <div className="size-8 rounded-full bg-surface-2 flex items-center justify-center text-muted group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
