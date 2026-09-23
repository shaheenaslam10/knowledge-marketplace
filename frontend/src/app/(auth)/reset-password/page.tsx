"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSent(true); // always — enumeration-safe: identical response either way
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset your password</h1>

      {sent ? (
        <div className="mt-4 space-y-4">
          <p data-testid="reset-sent" className="text-sm text-slate-600 dark:text-slate-300">
            If that address has an account, a reset link is on its way. Check your inbox.
          </p>
          <Link href="/login" className="block text-sm text-slate-500 hover:underline dark:text-slate-400">
            Back to log in
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="w-full" data-testid="reset-submit">
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/login" className="hover:underline">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
