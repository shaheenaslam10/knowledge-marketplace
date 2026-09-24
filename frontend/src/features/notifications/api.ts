/** Notifications API client (browser). */
import { apiFetch } from "@/lib/api/client";

import type { NotificationItem, NotificationPreference } from "./types";

export const notificationsApi = {
  list: () =>
    apiFetch<{ unread: number; results: NotificationItem[] }>({ path: "/api/v1/me/notifications" }),
  read: (id: string) =>
    apiFetch<{ read: boolean; unread: number }>({
      path: `/api/v1/me/notifications/${id}/read`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  readAll: () =>
    apiFetch<{ read: boolean; unread: number }>({
      path: "/api/v1/me/notifications/read-all",
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
  preferences: {
    get: () =>
      apiFetch<{ results: NotificationPreference[] }>({ path: "/api/v1/me/notification-preferences" }),
    set: (category: string, emailEnabled: boolean) =>
      apiFetch<NotificationPreference>({
        path: "/api/v1/me/notification-preferences",
        method: "PUT",
        body: JSON.stringify({ category, email_enabled: emailEnabled }),
        headers: { "Content-Type": "application/json" },
      }),
  },
};
