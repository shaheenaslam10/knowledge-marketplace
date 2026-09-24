"use client";
/**
 * "Message" entry point for order/request pages (Phase 8, BR-34): lazily
 * opens (or reuses) the context thread and routes to it.
 */
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { messagingApi } from "./api";

export function MessageThreadButton({
  context,
  label = "Message",
  variant = "secondary",
  size = "sm",
  disabled = false,
  disabledReason,
}: {
  context: { context_type: "order"; order_id: string } | { context_type: "request"; request_id: string };
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const thread = await messagingApi.open(context);
      router.push(`/messages/${thread.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} disabled={busy || disabled} onClick={() => void open()} title={disabledReason}>
      <MessageCircle className="size-4" aria-hidden />
      {busy ? "Opening…" : label}
    </Button>
  );
}
