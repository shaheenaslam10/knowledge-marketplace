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
