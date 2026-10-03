import type { Metadata } from "next";

import { OrdersListClient } from "@/features/orders/components/orders-list-client";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Order Engagements
          </h1>
          <p className="text-sm text-muted mt-1">
            Track active academic deliverables, escrow milestones, and completed submissions across open and managed channels.
          </p>
        </div>
      </div>
      <OrdersListClient />
    </div>
  );
}

