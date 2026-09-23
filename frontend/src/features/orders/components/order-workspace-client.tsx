"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/features/orders/api";
import { OrderWorkspace } from "@/features/orders/components/order-workspace";
import type { OrderDetail } from "@/features/orders/types";

export function OrderWorkspaceClient() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setOrder(await ordersApi.detail(orderId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAction(key: string, payload?: unknown) {
    if (!orderId) return;
    setBusy(true);
    try {
      if (key === "deliver" && typeof payload === "object" && payload !== null) {
        const { summary, ids } = payload as { summary: string; ids: string[] };
        await ordersApi.deliver(orderId, summary, ids);
      } else if (key === "approve") {
        await ordersApi.approve(orderId);
      } else if (key === "revise" && typeof payload === "string") {
        await ordersApi.requestRevision(orderId, payload);
      } else if (key === "cancel" && typeof payload === "string") {
        await ordersApi.cancel(orderId, payload);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (failed && !order) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <p role="alert" className="text-danger text-sm">
          This order isn&apos;t available — it may not exist, or your account may not be a participant.
        </p>
        <Button variant="ghost" asChild>
          <Link href="/orders">← Back to my orders</Link>
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8" aria-busy>
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
      <Button variant="ghost" asChild>
        <Link href="/orders" className="text-sm">
          ← My orders
        </Link>
      </Button>
      <OrderWorkspace order={order} onAction={onAction} busy={busy} />
    </div>
  );
}
