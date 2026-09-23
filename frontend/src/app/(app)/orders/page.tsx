import type { Metadata } from "next";

import { OrdersListClient } from "@/features/orders/components/orders-list-client";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Every engagement — open marketplace, managed pool, or managed direct — lives here from payment to completion.
        </p>
      </header>
      <OrdersListClient />
    </div>
  );
}
