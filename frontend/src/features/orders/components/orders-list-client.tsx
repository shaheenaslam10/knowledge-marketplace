"use client";

/** Student + expert order list — one implementation for all three sources. */
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/features/orders/api";
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
      <p role="alert" className="text-danger text-sm">
        Couldn&apos;t load your orders — refresh to try again.
      </p>
    );
  }
  if (!orders) {
    return (
      <div className="space-y-3" aria-busy>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const visible = orders.filter((order) => (filter === "all" ? true : order.status === filter));

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="tablist" aria-label="Filter orders by status">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
              filter === status
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted text-sm">
          {orders.length === 0
            ? "No orders yet. Once a request is matched or an offer is accepted, the working order shows up here."
            : "No orders in this view — try another status."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="border-border bg-surface hover:shadow-sm block rounded-xl border p-4 transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-muted text-xs">
                      {order.number} · {SOURCE_COPY[order.source]}
                    </p>
                    <h2 className="text-foreground truncate font-medium">{order.request_title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{price(order.amount_display)}</span>
                    <Badge tone={ORDER_STATUS_TONE[order.status as OrderStatus]}>
                      {ORDER_STATUS_COPY[order.status as OrderStatus]}
                    </Badge>
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
