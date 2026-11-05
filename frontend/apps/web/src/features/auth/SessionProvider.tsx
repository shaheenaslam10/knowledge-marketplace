"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { authApi } from "./api";
import type { SessionUser } from "./types";

/**
 * `unreachable` is deliberately distinct from `unauthenticated`. Collapsing the
 * two logs people out whenever the API rate-limits, restarts or the network
 * blips — the session is still perfectly valid, we just could not read it.
 */
type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "unreachable";

interface SessionValue {
  user: SessionUser | null;
  status: SessionStatus;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

/** Only these mean "you are not signed in". Everything else is transient. */
function isDefinitivelySignedOut(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

const RETRY_DELAYS_MS = [400, 1200, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    // A 401/403 is an answer: sign the user out immediately, no retries.
    // A 429/5xx/network failure is not an answer — retry with backoff before
    // concluding anything, and never discard a known-good user because of one.
    for (let attempt = 0; ; attempt += 1) {
      try {
        const { user: me } = await authApi.me();
        setUser(me);
        setStatus("authenticated");
        return;
      } catch (error) {
        if (isDefinitivelySignedOut(error)) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }
        if (attempt >= RETRY_DELAYS_MS.length) {
          // Still no answer. Keep an already-authenticated user signed in;
          // otherwise surface the outage instead of a misleading login screen.
          setStatus((current) => (current === "authenticated" ? current : "unreachable"));
          return;
        }
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
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
