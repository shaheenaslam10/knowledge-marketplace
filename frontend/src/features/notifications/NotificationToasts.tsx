"use client";
/** Realtime toasts — rendered from the provider's queue; entries link to url. */
import Link from "next/link";

import { useNotifications } from "./NotificationsProvider";

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-state="open"
          className="hm-animate pointer-events-auto rounded-lg border border-border bg-surface p-3 shadow-lg"
          data-testid="toast"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{toast.title}</p>
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {toast.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{toast.body}</p>}
          {toast.url && (
            <Link
              href={toast.url}
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
              onClick={() => dismissToast(toast.id)}
            >
              View →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
