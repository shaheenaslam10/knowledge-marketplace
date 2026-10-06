"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
  Loader2,
  ShieldCheck,
  BookOpen,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

function LoginForm() {
  const { refresh } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      await refresh();
      const next = searchParams.get("next");

      const isExpert =
        Boolean(res?.user?.roles?.expert) ||
        email.toLowerCase().startsWith("expert@");

      if (typeof window !== "undefined") {
        try {
          const mode = isExpert ? "EXPERT" : "STUDENT";
          localStorage.setItem("hem_role_mode", mode);
          document.cookie = `hem_role_mode=${mode}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
      }

      if (next && next.startsWith("/")) {
        if (next === "/account" && isExpert) {
          router.push("/opportunities");
        } else {
          router.push(next);
        }
      } else {
        router.push(isExpert ? "/opportunities" : "/requests");
      }
    } catch (err) {
      setError(authErrorMessage(err));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setEmail("student@demo.local");
    setPassword("demo-password-1234");
    setError(null);
  }

  return (
    <div
      className={`rounded-3xl border border-border/80 bg-surface/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
        shake ? "animate-[wiggle_0.4s_ease-in-out]" : ""
      }`}
    >
      {/* Title & Role Badge */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-[11px] font-semibold text-primary">
          <GraduationCap className="size-3.5" />
          <span>Student Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Sign in to access your requests, orders, and expert consultations.
        </p>
      </div>

      {/* Quick Benefits Strip */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: ShieldCheck, label: "Escrow protected" },
          { icon: BookOpen, label: "Expert matched" },
          { icon: Zap, label: "Fast turnaround" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-surface-2/40 p-2.5 text-center"
          >
            <Icon className="size-4 text-primary" />
            <span className="text-[10px] font-medium text-muted leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* OAuth Buttons */}
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fillDemo()}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-2 transition-all hover:scale-[1.01]"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo()}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-2 transition-all hover:scale-[1.01]"
          >
            <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-surface px-3 text-[10px] uppercase font-bold tracking-wider text-muted">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-foreground">
            Email
          </label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-foreground">
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs font-medium text-primary hover:text-primary-strong hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span>Remember me for 30 days</span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            data-testid="login-error"
            className="rounded-xl border border-danger/25 bg-danger-soft/60 p-3 text-xs font-medium text-danger flex items-start gap-2"
          >
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/25"
          data-testid="login-submit"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Signing in…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              Sign In to Student Zone <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/80" />
        </div>
        <span className="relative bg-surface px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
          Or try the demo
        </span>
      </div>

      {/* Demo Button */}
      <button
        type="button"
        onClick={fillDemo}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface-2/40 px-3 h-10 text-xs font-medium text-foreground transition-all hover:bg-surface-2 hover:border-primary/40 shadow-sm"
      >
        <GraduationCap className="size-4 text-primary" />
        <span>Fill Student Demo Credentials</span>
      </button>

      {/* Footer Links */}
      <div className="mt-6 space-y-2 text-center text-xs text-muted">
        <div>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create student account
          </Link>
        </div>
        <div className="pt-1 border-t border-border/60">
          Are you a specialist?{" "}
          <Link href="/login/expert" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <Sparkles className="size-3" /> Expert login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-border bg-surface p-8 shadow-sm">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-28 w-full animate-pulse rounded-xl bg-surface-2" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
