"use client";
/**
 * Notification center state (Phase 8). ONE websocket (`/ws/notifications/`)
 * for the whole app — pushes are HINTS that trigger refetch + a toast; the
 * DB (via REST) remains the source of truth. Fallbacks when the socket is
 * down: focus/visibility/online refetch + a slow interval poll, so the badge
 * and list stay correct with no realtime transport at all.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { notificationsApi } from "./api";
import type { NotificationItem, NotificationPreference } from "./types";

export interface Toast {
  id: string;
  title: string;
  body: string;
  url: string;
}

interface NotificationsValue {
  unread: number;
  items: NotificationItem[];
  preferences: NotificationPreference[];
  loading: boolean;
  toasts: Toast[];
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setEmailEnabled: (category: string, enabled: boolean) => Promise<void>;
  dismissToast: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const page = await notificationsApi.list();
      setUnread(page.unread);
      setItems(page.results);
    } catch {
      // offline or logged out — badge just stays stale until the next refetch
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPreferences = useCallback(async () => {
    try {
      const page = await notificationsApi.preferences.get();
      setPreferences(page.results);
    } catch {
      // preferences are settings, not critical path
    }
  }, []);

  const pushToast = useCallback((toast: Toast) => {
    setToasts((current) => [...current.slice(-2), toast]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== toast.id)), 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Initial load + refetch hints (focus/visibility/online) + slow poll fallback.
  useEffect(() => {
    void refresh();
    void refreshPreferences();
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("online", onFocus);
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("online", onFocus);
      clearInterval(interval);
    };
  }, [refresh, refreshPreferences]);

  // Realtime: one socket, pushes trigger toast + refetch (WS is a hint only).
  useEffect(() => {
    let closedByUs = false;
    let attempt = 0;

    const connect = () => {
      if (closedByUs) return;
      const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
      const socket = new WebSocket(`${wsBase}/ws/notifications/`);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (raw) => {
        try {
          const data = JSON.parse(raw.data as string) as { type?: string; id?: string; title?: string; body?: string; url?: string };
          if (data.type === "notification.push") {
            void refresh();
            pushToast({
              id: String(data.id ?? crypto.randomUUID()),
              title: String(data.title ?? "Notification"),
              body: String(data.body ?? ""),
              url: String(data.url ?? ""),
            });
          }
        } catch {
          // ignore malformed frames — refetch fallback keeps state correct
        }
      };
      socket.onclose = () => {
        socketRef.current = null;
        if (closedByUs) return;
        if (attempt < 5) {
          const delay = Math.min(2000 * 2 ** attempt, 30000);
          attempt += 1;
          retryRef.current = setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      closedByUs = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [refresh, pushToast]);

  const markRead = useCallback(
    async (id: string) => {
      await notificationsApi.read(id);
      void refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await notificationsApi.readAll();
    void refresh();
  }, [refresh]);

  const setEmailEnabled = useCallback(async (category: string, enabled: boolean) => {
    const updated = await notificationsApi.preferences.set(category, enabled);
    setPreferences((current) =>
      current.map((pref) => (pref.category === category ? { ...pref, email_enabled: updated.email_enabled } : pref)),
    );
  }, []);

  const value = useMemo(
    () => ({
      unread,
      items,
      preferences,
      loading,
      toasts,
      refresh,
      markRead,
      markAllRead,
      setEmailEnabled,
      dismissToast,
    }),
    [unread, items, preferences, loading, toasts, refresh, markRead, markAllRead, setEmailEnabled, dismissToast],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
