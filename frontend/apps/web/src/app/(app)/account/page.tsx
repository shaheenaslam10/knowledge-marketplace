"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Zap,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Lock,
  Mail,
  Clock,
  Award,
  Bell,
  CheckCircle2,
  FileText,
  ExternalLink,
  BookOpen,
  ChevronRight,
  Flame,
  Globe,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import type { ApplicationStatus } from "@/features/experts/types";
import { useSession } from "@/features/auth/SessionProvider";
import { cn } from "@/lib/utils";

/**
 * Next-Gen High-Energy EdTech Scholar Profile & Account Hub.
 * Expansive 12-column architecture:
 * - Left (35%): Scholar Hero Identity Card, Verification Seal, Gamified Badges, Workspace Switcher.
 * - Right (65%): Active Orders Hub, Learning Disciplines, Escrow Security, Notification Preferences.
 */
export default function AccountPage() {
  const { user } = useSession();
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [currentMode, setCurrentMode] = useState<"student" | "expert">("student");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hem_role_mode");
      if (stored === "EXPERT") {
        setCurrentMode("expert");
      } else {
        setCurrentMode("student");
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    expertsApi
      .myApplication()
      .then((data) => {
        if (!cancelled) setApplicationStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) setApplicationStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitchMode = (mode: "student" | "expert") => {
    setCurrentMode(mode);
    try {
      const modeKey = mode === "expert" ? "EXPERT" : "STUDENT";
      localStorage.setItem("hem_role_mode", modeKey);
      document.cookie = `hem_role_mode=${modeKey}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    if (mode === "expert") {
      router.push(isExpert ? "/opportunities" : "/expert/apply");
    } else {
      router.push("/requests");
    }
  };

  if (!user) return null;

  const isExpert = Boolean(user.roles.expert);
  const userInitial = user.name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "S";

  return (
    <div className="w-full space-y-8 sm:space-y-10">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 size-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                <span>Verified Scholar Account</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" />
                <span>Escrow Custody Protected</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Account & Scholar Profile
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Signed in as{" "}
              <span className="font-semibold text-foreground" data-testid="account-email">
                {user.email}
              </span>
              . Manage your learning preferences, security keys, active workspace mode, and payout custody.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild variant="secondary" className="h-10 text-xs font-bold rounded-xl shadow-xs">
              <Link href="/requests">
                <GraduationCap className="size-3.5 mr-1.5" />
                <span>Learning Dashboard</span>
              </Link>
            </Button>
            <Button asChild className="h-10 text-xs font-bold bg-primary hover:bg-primary-strong text-primary-foreground shadow-md shadow-primary/25 rounded-xl">
              <Link href="/requests/new">
                <span>Post New Brief</span>
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Structured 12-Column Expansive Grid (Left: 35%, Right: 65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Scholar Identity & Transition Card (~35% width) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Main Vibrant Profile Card */}
          <Card className="overflow-hidden border-border/80 bg-card rounded-3xl shadow-sm">
            {/* Top Gradient Banner Backdrop */}
            <div className="h-28 bg-gradient-to-r from-violet-600 via-primary to-indigo-600 relative">
              <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            </div>

            <div className="px-6 pb-6 pt-0 relative space-y-4">
              {/* Overlapping Avatar */}
              <div className="-mt-14 flex items-end justify-between">
                <div className="relative">
                  <div className="size-24 rounded-3xl p-1 bg-card shadow-xl">
                    <div className="size-full rounded-2xl bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-inner">
                      {userInitial}
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 size-5 rounded-full bg-emerald-500 border-3 border-card flex items-center justify-center text-[10px] text-white font-bold" title="Online & Active">
                    ✓
                  </span>
                </div>

                <div data-testid="account-verified">
                  {user.roles.verified ? (
                    <Badge tone="success" className="px-3 py-1 font-bold text-xs rounded-full">
                      ✓ Email Verified
                    </Badge>
                  ) : (
                    <Badge tone="danger" className="px-3 py-1 font-bold text-xs rounded-full">
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scholar Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-extrabold text-foreground">{user.name}</h2>
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                </div>
                <p className="text-xs text-muted font-mono">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    <Award className="size-3" />
                    <span>Scholar • Level 2</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Flame className="size-3" />
                    <span>5-Day Streak</span>
                  </span>
                </div>
              </div>

              {/* Scholar Stats Matrix */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/70 text-center">
                <div className="p-3 rounded-2xl bg-surface-1 border border-border/70">
                  <span className="text-[10px] uppercase font-bold text-muted block">Reputation</span>
                  <span className="text-sm font-black font-mono text-foreground flex items-center justify-center gap-1 mt-0.5">
                    <span>4.98</span>
                    <span className="text-amber-500 text-xs">★</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-1 border border-border/70">
                  <span className="text-[10px] uppercase font-bold text-muted block">Honor Code</span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                    BR-10 Certified
                  </span>
                </div>
              </div>

              {/* Metadata Details */}
              <dl className="space-y-2.5 pt-3 border-t border-border/70 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted" />
                    <span>Timezone</span>
                  </dt>
                  <dd className="font-mono font-medium text-foreground">{user.timezone}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-500" />
                    <span>Dispute Protection</span>
                  </dt>
                  <dd className="font-semibold text-emerald-600 dark:text-emerald-400">100% Escrow Hold</dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Active Workspace Context & Mode Controller Card */}
          <Card className="p-6 border-border/80 bg-card rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sliders className="size-3.5" />
                <span>Workspace Controller</span>
              </span>
              {isExpert ? (
                <Badge tone="success" className="text-[10px] font-mono">
                  DUAL-ROLE ACTIVE
                </Badge>
              ) : (
                <Badge tone="neutral" className="text-[10px]">
                  STUDENT ACCESS
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Currently navigating in:{" "}
              <strong className="text-foreground font-bold">
                {currentMode === "student"
                  ? "Student Workspace (/requests)"
                  : isExpert
                    ? "Specialist Workspace (/opportunities)"
                    : "Specialist Workspace (/expert/apply)"}
              </strong>
            </p>

            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-surface-2 border border-border/80 text-xs gap-1">
              <button
                type="button"
                onClick={() => handleSwitchMode("student")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                  currentMode === "student"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                <GraduationCap className="size-4" />
                <span>Student Hub</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("expert")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                  currentMode === "expert"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Zap className="size-4" />
                <span>Specialist Hub</span>
              </button>
            </div>

            {/* Specialist Upgrade Banner for Student-only Accounts */}
            {!isExpert && (
              <div className="pt-4 border-t border-border/70 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="size-8 rounded-xl bg-amber-500/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Upgrade to Verified Specialist
                    </h3>
                    <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                      Earn on academic bounties with 85% net take-home earnings on every completed brief.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm rounded-xl"
                  >
                    <Link href="/expert/apply" data-testid="link-apply" className="flex items-center justify-center gap-1.5">
                      <span>Apply for Vetting</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary" className="text-xs font-semibold rounded-xl">
                    <Link href="/expert/application" data-testid="link-application-status">
                      Status
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Active Orders, Learning Disciplines & Security Grid (~65% width) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Card 1: Active Engagements & Orders Hub */}
          <Card className="p-6 sm:p-7 border-border/80 bg-card rounded-3xl shadow-sm hover:border-primary/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-lg font-bold text-foreground">My Orders & Active Engagements</h3>
                </div>
                <p className="text-xs text-muted max-w-xl leading-relaxed">
                  Every engagement — open marketplace, managed pool, or direct consultation — is managed here with real-time milestone tracking and escrow verification.
                </p>
              </div>

              <Button asChild size="sm" className="h-9 px-4 text-xs font-bold rounded-xl shadow-xs shrink-0">
                <Link href="/orders" data-testid="link-orders" className="flex items-center gap-2">
                  <span>Open Orders Hub</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 mt-5 border-t border-border/70 text-center">
              <div className="p-3.5 rounded-2xl bg-surface-1 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">In-Flight Orders</span>
                <span className="text-xl font-black font-mono text-foreground mt-0.5 block">0</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-1 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">Escrow Custody</span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">$0.00</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-1 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">Completed</span>
                <span className="text-xl font-black font-mono text-foreground mt-0.5 block">0</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Academic Disciplines & Learning Interests */}
          <Card className="p-6 sm:p-7 border-border/80 bg-card rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="size-4.5 text-primary" />
                  <span>Academic Disciplines & Interests</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Your customized learning tags help our coordinator algorithm match you with the top 3% doctoral specialists.
                </p>
              </div>

              <Button asChild variant="secondary" size="sm" className="h-8 text-xs font-bold rounded-xl shrink-0">
                <Link href="/onboarding/student" data-testid="link-onboarding" className="flex items-center gap-1.5">
                  <span>Edit Preferences</span>
                  <ChevronRight className="size-3" />
                </Link>
              </Button>
            </div>

            {/* Colorful Discipline Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-violet-500/10 border border-violet-500/25 text-violet-700 dark:text-violet-300">
                💻 Computer Science & ML
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-300">
                📐 Advanced Mathematics & Calculus
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                📊 Econometrics & Finance
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300">
                ⚙️ Mechanical Engineering
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300">
                🧬 Molecular Biology & Genetics
              </span>
            </div>
          </Card>

          {/* Card 3: Security & Escrow Custody Controls */}
          <Card className="p-6 sm:p-7 border-border/80 bg-card rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="size-4.5 text-primary" />
                <span>Security, Escrow & Authentication</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Bank-grade milestone escrow and zero-trust session management for your account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-surface-1 border border-border/70 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Escrow Custody Protocol</span>
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  All funds are locked in segregated escrow until you personally approve deliverables.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-1 border border-border/70 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Dual-Authentication Seam</span>
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  Protected with hardware-isolated HTTP-only cookies and cryptographically signed JWTs.
                </p>
              </div>
            </div>
          </Card>

          {/* Card 4: If Expert - Approved Specialist Cockpit */}
          {user.roles.expert && (
            <Card className="p-6 sm:p-7 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Award className="size-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Verified Specialist Workspace
                  </h3>
                </div>
                <Badge tone="success">Active Specialist</Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Your credentials and alma mater have been verified. Access your public profile, set your hourly rate, and manage reviews.
              </p>
              <Button asChild size="sm" variant="secondary" className="text-xs font-bold rounded-xl mt-2">
                <Link href="/expert/profile" className="flex items-center gap-2">
                  <span>Edit Specialist Profile & Rates</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

