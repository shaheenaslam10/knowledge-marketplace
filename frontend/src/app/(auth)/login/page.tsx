"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

function LoginForm() {
  const { refresh } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.login({ email: email.trim(), password });
      await refresh();
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/account");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Log in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back.</p>

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
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {error && (
          <p role="alert" data-testid="login-error" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full" data-testid="login-submit">
          {submitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <div className="mt-4 flex justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link href="/reset-password" className="hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="hover:underline">
          Create an account
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card>Loading…</Card>}>
      <LoginForm />
    </Suspense>
  );
}
