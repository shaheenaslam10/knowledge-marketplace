"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FolderOpen,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Step {
  step: string;
  title: string;
  desc: string;
  highlight: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const STUDENT_STEPS: Step[] = [
  {
    step: "01",
    title: "Scope or Discover",
    desc: "Post a private RFP brief with our AI Scope Copilot, or search 2,400+ vetted doctoral scholars and senior staff engineers by technical domain.",
    highlight: "Transparent rates & verified credentials",
    icon: Compass,
    accentColor: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    badgeBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  {
    step: "02",
    title: "Instant Speed-Book or Blind Bid",
    desc: "Book a 30m / 60m live WebRTC consultation directly, or receive tailored milestone proposals with locked-in budgets.",
    highlight: "100% Escrow protected upon booking",
    icon: Zap,
    accentColor: "text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    badgeBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  },
  {
    step: "03",
    title: "Collaborate in Live Studio",
    desc: "Work in dedicated order workspaces with shared code, live proofs, low-latency audio, and synchronized scratchpads.",
    highlight: "BR-34 Academic Integrity Protected",
    icon: Video,
    accentColor: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    step: "04",
    title: "Approve & Permanent Vault",
    desc: "Inspect deliverables with a 72-hour review window. Once satisfied, release escrow and access your permanent Vault library and tax invoices.",
    highlight: "Lifetime file & receipt storage",
    icon: FolderOpen,
    accentColor: "text-violet-600 dark:text-violet-400 border-violet-500/30",
    badgeBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
];

const SPECIALIST_STEPS: Step[] = [
  {
    step: "01",
    title: "Pass Rigorous Vetting",
    desc: "Verify your academic pedigree (Ph.D., Postdoc) or staff engineering credentials. Only the top 2% of applicants receive verified scholar badges.",
    highlight: "Verified badge boosts profile conversion",
    icon: BadgeCheck,
    accentColor: "text-amber-600 dark:text-amber-400 border-amber-500/30",
    badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    step: "02",
    title: "Set Rates & Products",
    desc: "Enable 30m / 60m speed-booking on your profile, publish digital study packs in the catalog, or schedule multi-seat live micro-cohorts.",
    highlight: "Diversified active & passive earnings",
    icon: Sparkles,
    accentColor: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    step: "03",
    title: "Deliver With Confidence",
    desc: "Review blind briefs or accept direct concierge tasks. Deliver via code scratchpad and order workspaces with strict dispute safeguards.",
    highlight: "Dedicated human operator arbitration",
    icon: ShieldCheck,
    accentColor: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    badgeBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  {
    step: "04",
    title: "Keep 85% & Fast Payouts",
    desc: "Enjoy the highest specialist take-home in the industry (85%). Completed orders clear automatically in 72h directly to your bank account.",
    highlight: "$0 SaaS subscription or listing fees",
    icon: CheckCircle2,
    accentColor: "text-teal-600 dark:text-teal-400 border-teal-500/30",
    badgeBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  },
];

export function InteractiveRoleStepper() {
  const [role, setRole] = useState<"student" | "specialist">("student");
  const steps = role === "student" ? STUDENT_STEPS : SPECIALIST_STEPS;

  return (
    <section className="space-y-8 rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-2/40 to-background p-6 sm:p-10 lg:p-14 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border/70 pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            <Clock className="size-3.5" />
            <span>Interactive Workflow Stepper</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            How The Platform Works
          </h2>
          <p className="text-sm text-muted max-w-xl">
            Ethical, transparent, and built from the ground up to protect intellectual property, time, and capital.
          </p>
        </div>

        {/* Role Toggle Switcher */}
        <div className="flex items-center p-1.5 rounded-2xl bg-surface-2 border border-border/80 shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              role === "student"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-muted hover:text-foreground"
            }`}
          >
            <GraduationCap className="size-4" />
            For Students &amp; Teams
          </button>
          <button
            type="button"
            onClick={() => setRole("specialist")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              role === "specialist"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Zap className="size-4" />
            For Domain Specialists
          </button>
        </div>
      </div>

      {/* 4 Connected Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((item, idx) => (
          <div
            key={item.step}
            className={`relative rounded-2xl border bg-card p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.accentColor}`}
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center justify-center size-9 rounded-xl font-black text-xs ${item.badgeBg}`}>
                {item.step}
              </span>
              <div className={`p-2 rounded-xl ${item.badgeBg}`}>
                <item.icon className="size-4" />
              </div>
            </div>

            <h3 className="font-extrabold text-base text-foreground tracking-tight">
              {item.title}
            </h3>

            <p className="text-xs text-muted leading-relaxed">
              {item.desc}
            </p>

            <div className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                {item.highlight}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
        <p className="text-xs text-muted">
          {role === "student"
            ? "Ready to solve your technical hurdle with vetted doctoral guidance?"
            : "Ready to join the top 2% of academic and engineering specialists?"}
        </p>

        <div className="flex items-center gap-3">
          <Button variant="glow" asChild className="h-10 text-xs font-bold px-5">
            <Link href={role === "student" ? "/register" : "/register/expert"}>
              {role === "student" ? "Create Free Student Account" : "Apply to Become a Specialist"}
              <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
          <Button variant="secondary" asChild className="h-10 text-xs font-semibold">
            <Link href={role === "student" ? "/how-it-works" : "/for-experts"}>
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

