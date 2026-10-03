"use client";

import { useState, type FormEvent, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Loader2,
  Zap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

export default function StudentRegisterPage() {
  const { refresh } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studyLevel, setStudyLevel] = useState("undergraduate");
  const [studentDiscipline, setStudentDiscipline] = useState("cs");
  const [agreedHonorCode, setAgreedHonorCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordCriteria = useMemo(() => ({
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const strengthScore = useMemo(() => {
    if (!password) return 0;
    return [
      passwordCriteria.minLength,
      passwordCriteria.hasUpper,
      passwordCriteria.hasNumber,
      passwordCriteria.hasSpecial,
    ].filter(Boolean).length;
  }, [passwordCriteria, password]);

  const strengthDetails = useMemo(() => {
    switch (strengthScore) {
      case 1: return { label: "Weak", color: "bg-danger", text: "text-danger" };
      case 2: return { label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
      case 3: return { label: "Good", color: "bg-blue-500", text: "text-blue-500" };
      case 4: return { label: "Strong & Resilient", color: "bg-emerald-500", text: "text-emerald-500" };
      default: return { label: "Incomplete", color: "bg-border", text: "text-muted" };
    }
  }, [strengthScore]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (!agreedHonorCode) {
      setError("You must agree to the Academic Honor Code.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({ email: email.trim(), name: name.trim(), password });
      await refresh();

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hem_role_mode", "STUDENT");
          document.cookie = `hem_role_mode=STUDENT; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
      }

      router.push("/verify-email?registered=1");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-surface/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
      {/* Title & Badge */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-[11px] font-semibold text-primary">
          <GraduationCap className="size-3.5" />
          <span>Student Registration</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Create Your Account
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Join thousands of students getting expert academic consultations.
        </p>
      </div>

      {/* Value proposition chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { icon: ShieldCheck, text: "Escrow Protected" },
          { icon: Zap, text: "Fast Matching" },
          { icon: Users, text: "250K+ Tasks Done" },
        ].map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-2/40 px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            <Icon className="size-3 text-primary" />
            {text}
          </span>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-foreground">
            Full Name
          </label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              placeholder="Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-foreground">
            University / Personal Email
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

        {/* Study Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border/80 bg-surface-2/40 p-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              Study Level
            </label>
            <select
              value={studyLevel}
              onChange={(e) => setStudyLevel(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="undergraduate">Undergraduate (B.S. / B.A.)</option>
              <option value="masters">Master&apos;s (M.S. / M.A.)</option>
              <option value="doctoral">Doctoral Candidate (Ph.D.)</option>
              <option value="professional">Professional Degree (MBA / J.D.)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              Primary Discipline
            </label>
            <select
              value={studentDiscipline}
              onChange={(e) => setStudentDiscipline(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
            >
              <option value="cs">Computer Science &amp; AI</option>
              <option value="math">Mathematics &amp; Statistics</option>
              <option value="econ">Economics &amp; Econometrics</option>
              <option value="eng">Engineering &amp; Robotics</option>
              <option value="physics">Natural Sciences &amp; Physics</option>
              <option value="law">Law &amp; Humanities</option>
            </select>
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-foreground">
            Password
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={10}
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

          {/* Strength meter */}
          <div className="mt-2.5 space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    strengthScore >= step ? strengthDetails.color : "bg-surface-2"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">
                Strength: <strong className={strengthDetails.text}>{strengthDetails.label}</strong>
              </span>
              {strengthScore === 4 && (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Excellent
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted">
              {[
                { ok: passwordCriteria.minLength, label: "10+ Characters" },
                { ok: passwordCriteria.hasUpper, label: "Uppercase Letter" },
                { ok: passwordCriteria.hasNumber, label: "Number Included" },
                { ok: passwordCriteria.hasSpecial, label: "Special Symbol" },
              ].map(({ ok, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {ok ? (
                    <Check className="size-3 text-emerald-500 stroke-[3]" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-border" />
                  )}
                  <span className={ok ? "text-foreground font-medium" : ""}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Honor Code */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-muted leading-relaxed">
            <input
              type="checkbox"
              required
              checked={agreedHonorCode}
              onChange={(e) => setAgreedHonorCode(e.target.checked)}
              className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20 shrink-0"
            />
            <span>
              I agree to the{" "}
              <Link href="/academic-integrity" className="text-primary font-semibold hover:underline">
                Platform Honor Code
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-primary font-semibold hover:underline">
                Terms of Service
              </Link>
              .
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-danger/25 bg-danger-soft/60 p-3 text-xs font-medium text-danger"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/25"
          data-testid="register-submit"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Creating Account…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              Create Student Account <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 space-y-2 text-center text-xs text-muted">
        <div>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
        <div className="pt-1 border-t border-border/60">
          Are you a specialist?{" "}
          <Link href="/register/expert" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <Sparkles className="size-3" /> Apply as an expert
          </Link>
        </div>
      </div>
    </div>
  );
}
