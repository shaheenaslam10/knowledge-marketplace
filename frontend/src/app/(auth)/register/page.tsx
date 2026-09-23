"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

export default function RegisterPage() {
  const { refresh } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({ email: email.trim(), name: name.trim(), password });
      await refresh(); // register auto-logs-in (httpOnly cookies)
      router.push("/verify-email?registered=1");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        One account — post requests now, become an expert later.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
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
          <p role="alert" data-testid="register-error" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full" data-testid="register-submit">
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
