"use client";
/** Header notification bell — unread badge + dropdown center (Phase 8). */
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useNotifications } from "./NotificationsProvider";

const TYPE_ICONS: Record<string, string> = {
  message_new: "💬",
  order_paid_activated: "✅",
  order_delivered: "📦",
  order_revision_requested: "🔁",
  order_approved_completed: "🎉",
  order_cancelled: "🚫",
  order_deadline_warning: "⏰",
  request_new_offer: "✉️",
  offer_accepted: "🤝",
  assignment_new: "📌",
  invitation_new: "📌",
  payment_failed: "⚠️",
  payout_paid: "💸",
};

export function NotificationBell() {
  const { unread, items, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications (${unread} unread)`} data-testid="bell">
          <Bell className="size-4" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
              data-testid="bell-badge"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">No notifications yet.</p>
        ) : (
          items.slice(0, 10).map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={cn("flex cursor-pointer flex-col items-start gap-0.5 py-2", !item.read && "bg-primary-soft/40")}
              onSelect={async () => {
                if (!item.read) await markRead(item.id);
                if (item.url) router.push(item.url);
              }}
            >
              <span className="flex w-full items-center gap-2 text-sm font-medium">
                <span aria-hidden>{TYPE_ICONS[item.type] ?? "🔔"}</span>
                {item.title}
                {!item.read && <span className="ml-auto size-2 rounded-full bg-primary" aria-label="unread" />}
              </span>
              {item.body && <span className="line-clamp-2 text-xs text-muted">{item.body}</span>}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/messages" className="cursor-pointer text-sm text-primary">
            Open messages inbox
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
