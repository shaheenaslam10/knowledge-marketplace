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
  Award,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

type RegisterRole = "student" | "expert";

export default function RegisterPage() {
  const { refresh } = useSession();
  const router = useRouter();

  // Role selector state
  const [role, setRole] = useState<RegisterRole>("student");

  // Shared form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedHonorCode, setAgreedHonorCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Student-specific fields
  const [studyLevel, setStudyLevel] = useState("undergraduate");
  const [studentDiscipline, setStudentDiscipline] = useState("cs");

  // Expert-specific fields
  const [degree, setDegree] = useState("phd");
  const [institution, setInstitution] = useState("");
  const [expertDiscipline, setExpertDiscipline] = useState("distributed_systems");

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
    if (!agreedHonorCode) {
      setError("Please accept the Platform Honor Code and Terms of Service.");
      return;
    }
    if (strengthScore < 3) {
      setError("Please choose a stronger password matching the criteria below.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (typeof window !== "undefined") {
        try {
          const mode = role === "expert" ? "EXPERT" : "STUDENT";
          localStorage.setItem("hem_role_mode", mode);
          document.cookie = `hem_role_mode=${mode}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
      }

      await refresh();
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-surface/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl transition-colors">
      {/* Title Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Create Your Account
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Join thousands of learners and verified doctoral specialists.
        </p>
      </div>

      {/* Interactive Role Selector: Student vs Expert */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl border border-border/80 bg-surface-2/40 p-1.5">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            role === "student"
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-muted hover:text-foreground"
          }`}
        >
          <GraduationCap className="size-4" />
          <span>I want to Learn</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("expert")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            role === "expert"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" />
          <span>I want to Mentor</span>
        </button>
      </div>

      {/* OAuth Buttons */}
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
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

      {/* Main Registration Form */}
      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-foreground">
            {role === "expert" ? "Full Name (as on credentials)" : "Full Name"}
          </label>
          <div className="relative mt-1">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "expert" ? "Dr. Jordan Hayes, Ph.D." : "Alex Rivera"}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-foreground">
            {role === "expert" ? "Academic / Professional Email" : "University / Personal Email"}
          </label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "expert" ? "scholar@stanford.edu" : "name@university.edu"}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Dynamic Fields based on Role */}
        {role === "student" ? (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-surface-2/30 p-3">
            <div>
              <label htmlFor="studyLevel" className="block text-[11px] font-semibold text-foreground">
                Study Level
              </label>
              <select
                id="studyLevel"
                value={studyLevel}
                onChange={(e) => setStudyLevel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface py-1.5 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="masters">Master&apos;s / M.Sc.</option>
                <option value="phd">Ph.D. / Doctoral</option>
                <option value="bootcamp">Bootcamp / Self-Taught</option>
              </select>
            </div>
            <div>
              <label htmlFor="studentDiscipline" className="block text-[11px] font-semibold text-foreground">
                Primary Discipline
              </label>
              <select
                id="studentDiscipline"
                value={studentDiscipline}
                onChange={(e) => setStudentDiscipline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface py-1.5 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="cs">Computer Science &amp; AI</option>
                <option value="math">Mathematics &amp; Calculus</option>
                <option value="stats">Statistics &amp; Data</option>
                <option value="engineering">Engineering</option>
                <option value="economics">Economics &amp; Finance</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="degree" className="block text-[11px] font-semibold text-foreground">
                  Highest Degree
                </label>
                <select
                  id="degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface py-1.5 px-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                >
                  <option value="phd">Ph.D. / Doctorate</option>
                  <option value="postdoc">Postdoctoral Fellow</option>
                  <option value="masters">Master&apos;s Degree</option>
                  <option value="industry">Industry Veteran (10+ yrs)</option>
                </select>
              </div>
              <div>
                <label htmlFor="expertDiscipline" className="block text-[11px] font-semibold text-foreground">
                  Expertise Domain
                </label>
                <select
                  id="expertDiscipline"
                  value={expertDiscipline}
                  onChange={(e) => setExpertDiscipline(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface py-1.5 px-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                >
                  <option value="distributed_systems">Distributed Systems &amp; AI</option>
                  <option value="calculus">Higher Mathematics</option>
                  <option value="econometrics">Econometrics &amp; Stats</option>
                  <option value="robotics">Robotics &amp; Control</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="institution" className="block text-[11px] font-semibold text-foreground">
                Alma Mater / Research Institution
              </label>
              <div className="relative mt-1">
                <Building className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  id="institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University, MIT, Oxford"
                  className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-foreground">
            Password
          </label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-10 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* 4-bar Password Complexity Indicator */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Strength:</span>
                <span className={`font-semibold ${strengthDetails.text}`}>{strengthDetails.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-1.5 rounded-full transition-colors ${
                      bar <= strengthScore ? strengthDetails.color : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Academic Integrity & Terms Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="honorCode"
            type="checkbox"
            checked={agreedHonorCode}
            onChange={(e) => setAgreedHonorCode(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="honorCode" className="text-xs text-muted leading-tight">
            I agree to the{" "}
            <Link href="/academic-integrity" className="font-semibold text-primary underline">
              Platform Honor Code
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-primary underline">
              Terms of Service
            </Link>
            . I confirm I will never submit or ghostwrite graded coursework.
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger"
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting}
          data-testid="register-submit"
          className={`w-full h-11 text-xs font-bold shadow-lg transition-all ${
            role === "expert"
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
              : "bg-primary hover:bg-primary-strong text-white shadow-primary/25"
          }`}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Creating your account…</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span>{role === "expert" ? "Join as a Specialist" : "Create Student Account"}</span>
              <ArrowRight className="size-3.5" />
            </span>
          )}
        </Button>
      </form>

      {/* Footer Switch */}
      <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
