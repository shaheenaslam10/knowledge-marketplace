"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const missingParams = !uid || !token;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.confirmPasswordReset({ uid, token, password });
      router.push("/login?reset=1");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Choose a new password</h1>

      {missingParams ? (
        <div className="mt-4 space-y-4">
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            This reset link is incomplete. Request a new one.
          </p>
          <Link href="/reset-password" className="block text-sm text-slate-500 hover:underline dark:text-slate-400">
            Request a reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">At least 10 characters.</p>
          </div>
          {error && (
            <p role="alert" data-testid="confirm-error" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full" data-testid="confirm-reset-submit">
            {submitting ? "Updating…" : "Set new password"}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<Card>Loading…</Card>}>
      <ConfirmInner />
    </Suspense>
  );
}
