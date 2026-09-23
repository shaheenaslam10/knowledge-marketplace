"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api";
import type { SessionUser } from "./types";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionValue {
  user: SessionUser | null;
  status: SessionStatus;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Client-side session state (cookie-auth: the cookie itself is unreadable by
 * design — `/api/v1/me` is the truth). Loading state is explicit so pages can
 * render skeletons instead of flashing signed-out UI.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await authApi.me();
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      router.refresh();
    }
  }, [router]);

  const value = useMemo(() => ({ user, status, refresh, logout }), [user, status, refresh, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}
