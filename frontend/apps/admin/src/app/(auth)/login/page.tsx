"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

function AdminLoginForm() {
  const { refresh } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performLogin(targetEmail: string, targetPass: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.login({
        email: targetEmail.trim(),
        password: targetPass,
      });

      // Store JWT token to bypass cross-origin/cross-port cookie limitations
      if (res.access && typeof window !== "undefined") {
        try {
          localStorage.setItem("admin_access_token", res.access);
          localStorage.setItem("hm_access_token", res.access);
          document.cookie = `hm_access=${res.access}; path=/; max-age=1800; SameSite=Lax`;
        } catch {}
      }

      await refresh();

      const roles = res.user?.roles;
      const isAuthorized = Boolean(roles?.admin || roles?.staff || roles?.support);

      if (!isAuthorized) {
        setError(
          "Access denied: Account authenticated, but your profile lacks Operations Console / Staff privileges.",
        );
        return;
      }

      const next = searchParams.get("next");
      if (next && next.startsWith("/") && !next.startsWith("/login")) {
        router.push(next);
      } else {
        router.push("/portal");
      }
    } catch (err: unknown) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-surface/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-[11px] font-semibold text-primary">
          <ShieldCheck className="size-3.5" />
          <span>Operations Gateway</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Operations Sign-In
        </h1>
        <p className="text-xs text-muted leading-relaxed">
          Sign in to the central triage, escrow custody, and governance cockpit.
        </p>
      </div>

      {/* 1-Click Platform Owner Login Card */}
      <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Zap className="size-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Platform Administrator
              </span>
              <span className="text-[10px] font-mono text-muted">
                admin@example.com · Superuser
              </span>
            </div>
          </div>
          <Badge tone="success" className="text-[10px] font-mono">
            Ready
          </Badge>
        </div>

        <Button
          type="button"
          variant="primary"
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl shadow-sm"
          disabled={submitting}
          onClick={() => performLogin("admin@example.com", "password123")}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <KeyRound className="size-3.5" />
              <span>1-Click Platform Owner Sign-In</span>
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/80" />
        </div>
        <span className="relative bg-surface px-3 text-[11px] font-medium text-muted uppercase tracking-wider">
          Or Enter Credentials
        </span>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft/50 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Standard Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Staff Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-xl border border-border/80 bg-surface-1 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Security Key / Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-border/80 bg-surface-1 pl-10 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="secondary"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl mt-2"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <span>Authenticate Session</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
