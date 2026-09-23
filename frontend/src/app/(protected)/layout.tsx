"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/SessionProvider";

/**
 * Protected layout foundation (Phase 2 — UX guard only; the API is the real
 * boundary). Renders a loading skeleton until the session resolves, then
 * either the guarded content or a redirect to /login.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/account");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md animate-pulse space-y-3" data-testid="protected-loading">
          <div className="h-6 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
