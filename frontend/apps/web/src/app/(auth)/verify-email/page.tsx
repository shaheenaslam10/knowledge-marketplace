"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const { status, refresh } = useSession();
  const token = searchParams.get("token") ?? "";
  const justRegistered = searchParams.get("registered") === "1";

  const [state, setState] = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState("verifying");
    authApi
      .verifyEmail(token)
      .then(async (result) => {
        if (cancelled) return;
        await refresh();
        setState("success");
        setMessage(result.detail);
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        setMessage(authErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verify your email</h1>

      {state === "verifying" && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Verifying…</p>}

      {state === "success" && (
        <div className="mt-4 space-y-4">
          <p data-testid="verify-success" className="text-sm text-emerald-700 dark:text-emerald-400">
            {message ?? "Your email is verified."}
          </p>
          <Link href="/account">
            <Button className="w-full">Go to your account</Button>
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 space-y-4">
          <p role="alert" data-testid="verify-error" className="text-sm text-red-700 dark:text-red-400">
            {message}
          </p>
          <ResendButton />
        </div>
      )}

      {state === "idle" && (
        <div className="mt-4 space-y-4">
          {justRegistered && status === "authenticated" ? (
            <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="verify-instructions">
              Check your inbox — we sent you a verification link. A verified email unlocks posting, offers and
              messaging (you can still browse meanwhile).
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Open the link from your inbox to verify your email address.
            </p>
          )}
          <ResendButton />
        </div>
      )}
    </Card>
  );
}

function ResendButton() {
  const { status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (status !== "authenticated") {
    return (
      <Link href="/login" className="block text-sm text-slate-500 hover:underline dark:text-slate-400">
        Log in to resend the verification email
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        disabled={sending}
        onClick={async () => {
          setSending(true);
          setMessage(null);
          try {
            const { detail } = await authApi.resendVerification();
            setMessage(detail);
          } catch (err) {
            setMessage(authErrorMessage(err));
          } finally {
            setSending(false);
          }
        }}
        data-testid="resend-verification"
      >
        {sending ? "Sending…" : "Resend verification email"}
      </Button>
      {message && <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Card>Verifying…</Card>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
