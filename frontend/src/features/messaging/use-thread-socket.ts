"use client";
/**
 * Thread realtime hook — WS is a REFETCH HINT, never the source of truth
 * (ADR-0003/Phase 8 rules). The DB (via REST) is always re-fetched on
 * reconnect/focus; messages land over WS but persist through services.
 *
 * Fallbacks when the socket is down: sends go through REST, and window
 * focus + visibility events trigger refetch, so the UI stays correct
 * without any realtime transport.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { WS_URL } from "@/lib/config";

export type ThreadSocketEvent =
  | { kind: "message"; payload: Record<string, unknown> }
  | { kind: "typing"; userName: string }
  | { kind: "error"; message: string };

interface ThreadSocketState {
  connected: boolean;
  /** bumped on every successful (re)connect — the refetch hint */
  generation: number;
}

export function useThreadSocket(threadId: string | null, onEvent: (event: ThreadSocketEvent) => void) {
  const [state, setState] = useState<ThreadSocketState>({ connected: false, generation: 0 });
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!threadId) return;
    let closedByUs = false;
    let attempt = 0;

    const connect = () => {
      if (closedByUs) return;
      const socket = new WebSocket(`${WS_URL}/ws/threads/${threadId}/`);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setState((current) => ({ connected: true, generation: current.generation + 1 }));
      };
      socket.onmessage = (raw) => {
        try {
          const data = JSON.parse(raw.data as string) as Record<string, unknown>;
          const type = data.type;
          if (type === "message.new") {
            onEventRef.current({ kind: "message", payload: data });
          } else if (type === "typing") {
            onEventRef.current({ kind: "typing", userName: String(data.user_name ?? "Someone") });
          } else if (type === "message.error") {
            onEventRef.current({ kind: "error", message: String(data.error ?? "Message rejected.") });
          }
          // other frame types (e.g. our own read receipts) carry no UI action
        } catch {
          // malformed frame — ignore, REST refetch remains the source of truth
        }
      };
      socket.onclose = () => {
        setState({ connected: false, generation: 0 });
        socketRef.current = null;
        if (closedByUs) return;
        // bounded backoff reconnect (5 tries), then rely on focus refetch
        if (attempt < 5) {
          const delay = Math.min(1500 * 2 ** attempt, 15000);
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
  }, [threadId]);

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  return { ...state, send };
}

/** Refetch hint on window focus / reconnect — the offline fallback path. */
export function useRefetchOnFocus(handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const trigger = () => {
      if (document.visibilityState === "visible") void handlerRef.current();
    };
    window.addEventListener("focus", trigger);
    document.addEventListener("visibilitychange", trigger);
    window.addEventListener("online", trigger);
    return () => {
      window.removeEventListener("focus", trigger);
      document.removeEventListener("visibilitychange", trigger);
      window.removeEventListener("online", trigger);
    };
  }, []);
}
