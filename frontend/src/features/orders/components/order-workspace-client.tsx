"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { disputesApi } from "@/features/disputes/api";
import type { Dispute } from "@/features/disputes/types";
import { ordersApi } from "@/features/orders/api";
import { OrderWorkspace } from "@/features/orders/components/order-workspace";
import type { OrderDetail } from "@/features/orders/types";
import { reviewsApi } from "@/features/reviews/api";
import type { Review } from "@/features/reviews/types";

export function OrderWorkspaceClient() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setOrder(await ordersApi.detail(orderId));
      setFailed(false);
    } catch {
      setFailed(true);
      return;
    }
    // Phase 9 side panels — 404 means "none yet", not an error.
    const [reviewResult, disputeResult] = await Promise.allSettled([
      reviewsApi.forOrder(orderId),
      disputesApi.forOrder(orderId),
    ]);
    setReview(reviewResult.status === "fulfilled" ? reviewResult.value : null);
    setDispute(disputeResult.status === "fulfilled" ? disputeResult.value : null);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAction(key: string, payload?: unknown) {
    if (!orderId) return;
    setBusy(true);
    try {
      if (key === "pay") {
        await ordersApi.pay(orderId);
      } else if (key === "confirm-payment") {
        await ordersApi.confirmPayment(orderId);
      } else if (key === "deliver" && typeof payload === "object" && payload !== null) {
        const { summary, ids } = payload as { summary: string; ids: string[] };
        await ordersApi.deliver(orderId, summary, ids);
      } else if (key === "approve") {
        await ordersApi.approve(orderId);
      } else if (key === "revise" && typeof payload === "string") {
        await ordersApi.requestRevision(orderId, payload);
      } else if (key === "cancel" && typeof payload === "string") {
        await ordersApi.cancel(orderId, payload);
      } else if (key === "submit-review" && typeof payload === "object" && payload !== null) {
        const { rating, body, subs } = payload as {
          rating: number;
          body: string;
          subs: { sub_quality: number | null; sub_communication: number | null; sub_timeliness: number | null };
        };
        const created = await reviewsApi.submit(orderId, { rating, body, ...subs });
        setReview(created);
      } else if (key === "edit-review" && typeof payload === "object" && payload !== null) {
        const { reviewId, rating, body, subs } = payload as {
          reviewId: string;
          rating: number;
          body: string;
          subs: { sub_quality: number | null; sub_communication: number | null; sub_timeliness: number | null };
        };
        const updated = await reviewsApi.edit(reviewId, { rating, body, ...subs });
        setReview(updated);
      } else if (key === "reply-review" && typeof payload === "object" && payload !== null) {
        const { reviewId, reply, ratingOfStudent } = payload as {
          reviewId: string;
          reply: string;
          ratingOfStudent: number | null;
        };
        const updated = await reviewsApi.reply(reviewId, reply, ratingOfStudent);
        setReview(updated);
      } else if (key === "open-dispute" && typeof payload === "object" && payload !== null) {
        const { reason, description, evidenceIds } = payload as {
          reason: string;
          description: string;
          evidenceIds: string[];
        };
        const created = await disputesApi.open(orderId, { reason, description, evidence_ids: evidenceIds });
        setDispute(created);
      } else if (key === "add-evidence" && typeof payload === "object" && payload !== null) {
        const { disputeId, evidenceIds } = payload as { disputeId: string; evidenceIds: string[] };
        await disputesApi.addEvidence(disputeId, evidenceIds);
        setDispute(await disputesApi.detail(disputeId));
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
      <OrderWorkspace order={order} review={review} dispute={dispute} onAction={onAction} busy={busy} />
    </div>
  );
}
