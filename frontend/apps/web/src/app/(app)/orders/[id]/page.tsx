import type { Metadata } from "next";

import { OrderWorkspaceClient } from "@/features/orders/components/order-workspace-client";

export const metadata: Metadata = { title: "Order workspace" };

export default function OrderDetailPage() {
  return <OrderWorkspaceClient />;
}
