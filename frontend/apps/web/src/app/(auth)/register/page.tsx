"use client";

import { useState, type FormEvent, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  School,
  ShieldCheck,
  Sparkles,
  User,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { authErrorMessage } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";

export default function RegisterPage() {
  const { refresh } = useSession();
  const router = useRouter();

  // Role Selection
  const [role, setRole] = useState<"student" | "expert">("student");

  // Core Auth Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student-specific fields
  const [studyLevel, setStudyLevel] = useState("undergraduate");
  const [studentDiscipline, setStudentDiscipline] = useState("cs");

  // Expert-specific fields
  const [expertDegree, setExpertDegree] = useState("phd");
  const [institution, setInstitution] = useState("");
  const [expertDiscipline, setExpertDiscipline] = useState("cs_ai");

  // Honor code agreement
  const [agreedHonorCode, setAgreedHonorCode] = useState(false);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Interactive password criteria evaluation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 10,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let count = 0;
    if (passwordCriteria.minLength) count++;
    if (passwordCriteria.hasUpper) count++;
    if (passwordCriteria.hasNumber) count++;
    if (passwordCriteria.hasSpecial) count++;
    return count;
  }, [passwordCriteria, password]);

  const strengthDetails = useMemo(() => {
    switch (strengthScore) {
      case 1:
        return { label: "Weak", color: "bg-danger", text: "text-danger" };
      case 2:
        return { label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
      case 3:
        return { label: "Good", color: "bg-blue-500", text: "text-blue-500" };
      case 4:
        return { label: "Strong & Resilient", color: "bg-emerald-500", text: "text-emerald-500" };
      default:
        return { label: "Incomplete", color: "bg-border", text: "text-muted" };
    }
  }, [strengthScore]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (!agreedHonorCode) {
      setError("You must acknowledge and agree to the Academic Honor Code.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({ email: email.trim(), name: name.trim(), password });
      await refresh(); // register auto-logs-in (httpOnly cookies)

      // Route smoothly based on role
      if (role === "expert") {
        router.push("/for-experts?welcome=1");
      } else {
        router.push("/verify-email?registered=1");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-surface/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl transition-all duration-200">
      {/* Title & Badge */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-[11px] font-semibold text-primary">
          <Sparkles className="size-3.5" />
          <span>Academic Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Create Account
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Select your intended journey to customize your workspace experience.
        </p>
      </div>

      {/* 1. Interactive Role Selector Cards */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Student Card */}
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`flex flex-col text-left rounded-2xl border p-4 transition-all duration-200 ${
            role === "student"
              ? "border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20"
              : "border-border/80 bg-surface-2/40 hover:bg-surface-2/80 hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span
              className={`size-4 rounded-full border flex items-center justify-center ${
                role === "student" ? "border-primary bg-primary text-white" : "border-muted"
              }`}
            >
              {role === "student" && <Check className="size-2.5 stroke-[3]" />}
            </span>
          </div>
          <h3 className="mt-3 text-xs font-bold text-foreground">
            I am a Student / Client
          </h3>
          <p className="mt-1 text-[11px] text-muted leading-relaxed">
            Get 1-on-1 expert consultation, managed project delivery, and 24/7 review support.
          </p>
        </button>

        {/* Expert Card */}
        <button
          type="button"
          onClick={() => setRole("expert")}
          className={`flex flex-col text-left rounded-2xl border p-4 transition-all duration-200 ${
            role === "expert"
              ? "border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20"
              : "border-border/80 bg-surface-2/40 hover:bg-surface-2/80 hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex size-9 items-center justify-center rounded-xl bg-surface text-foreground border border-border">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span
              className={`size-4 rounded-full border flex items-center justify-center ${
                role === "expert" ? "border-primary bg-primary text-white" : "border-muted"
              }`}
            >
              {role === "expert" && <Check className="size-2.5 stroke-[3]" />}
            </span>
          </div>
          <h3 className="mt-3 text-xs font-bold text-foreground">
            I am a Tutor / Subject Expert
          </h3>
          <p className="mt-1 text-[11px] text-muted leading-relaxed">
            Access high-value academic opportunities, set your own bids, and get guaranteed escrow payouts.
          </p>
        </button>
      </div>

      {/* 2. Registration Form */}
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {/* Full Name Field */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-foreground">
            Full name
          </label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              placeholder={role === "expert" ? "Dr. Jordan Hayes, Ph.D." : "Alex Rivera"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Email Field */}
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
              placeholder="name@university.edu or you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2/40 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 2. Dynamic Role-Specific Fields */}
        {role === "student" ? (
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
                <option value="cs">Computer Science & AI</option>
                <option value="math">Mathematics & Statistics</option>
                <option value="econ">Economics & Econometrics</option>
                <option value="eng">Engineering & Robotics</option>
                <option value="physics">Natural Sciences & Physics</option>
                <option value="law">Law & Humanities</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border/80 bg-surface-2/40 p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Highest Degree Held
                </label>
                <select
                  value={expertDegree}
                  onChange={(e) => setExpertDegree(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="phd">Ph.D. / Doctorate</option>
                  <option value="postdoc">Postdoctoral Researcher</option>
                  <option value="masters">Master&apos;s Degree (M.S./M.A.)</option>
                  <option value="industry">Senior Industry Specialist</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Primary Expertise Domain
                </label>
                <select
                  value={expertDiscipline}
                  onChange={(e) => setExpertDiscipline(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="cs_ai">Distributed Systems & AI</option>
                  <option value="math_stats">Stochastic Calculus & Pure Math</option>
                  <option value="quant_econ">Econometrics & Causal Inference</option>
                  <option value="robotics">Robotics & Embedded Systems</option>
                  <option value="quantum">Quantum Physics & Chemistry</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                Alma Mater / Research Institution
              </label>
              <div className="relative">
                <School className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="e.g. Stanford University, MIT, Oxford"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Password Field with Show/Hide Toggle */}
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

          {/* 3. Interactive 4-Bar Password Complexity Meter */}
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
                Complexity: <strong className={strengthDetails.text}>{strengthDetails.label}</strong>
              </span>
              {strengthScore === 4 && (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Excellent Password
                </span>
              )}
            </div>

            {/* Criteria Checklist */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                {passwordCriteria.minLength ? (
                  <Check className="size-3 text-emerald-500 stroke-[3]" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
                <span className={passwordCriteria.minLength ? "text-foreground font-medium" : ""}>
                  10+ Characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordCriteria.hasUpper ? (
                  <Check className="size-3 text-emerald-500 stroke-[3]" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
                <span className={passwordCriteria.hasUpper ? "text-foreground font-medium" : ""}>
                  Uppercase Letter
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordCriteria.hasNumber ? (
                  <Check className="size-3 text-emerald-500 stroke-[3]" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
                <span className={passwordCriteria.hasNumber ? "text-foreground font-medium" : ""}>
                  Number Included
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordCriteria.hasSpecial ? (
                  <Check className="size-3 text-emerald-500 stroke-[3]" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
                <span className={passwordCriteria.hasSpecial ? "text-foreground font-medium" : ""}>
                  Special Symbol
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Explicit Honor Code & Academic Integrity Checkbox */}
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
              I agree to abide by the <Link href="/academic-integrity" className="text-primary font-semibold hover:underline">Platform Honor Code</Link> and <Link href="/terms" className="text-primary font-semibold hover:underline">Terms of Service</Link> (strictly ethical coaching, original research guidance, zero ghostwriting).
            </span>
          </label>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-danger/25 bg-danger-soft/60 p-3 text-xs font-medium text-danger"
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/25"
          data-testid="register-submit"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Provisioning Workspace…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              Complete Registration <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Footer Link */}
      <div className="mt-6 text-center text-xs text-muted">
        Already registered on the platform?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
