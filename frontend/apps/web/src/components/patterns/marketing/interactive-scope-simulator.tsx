"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Zap,
  Award,
  TrendingUp,
  Users,
  Code,
  Layers,
  BookOpen,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DomainPreset {
  id: string;
  name: string;
  icon: typeof Code;
  typicalHours: number;
  baseBudget: number;
  expertsOnline: number;
  sampleSpecialist: {
    name: string;
    degree: string;
    institution: string;
    rating: number;
    reviews: number;
    deliveries: number;
  };
}

const DOMAINS: DomainPreset[] = [
  {
    id: "cs",
    name: "Computer Science & AI",
    icon: Code,
    typicalHours: 12,
    baseBudget: 95,
    expertsOnline: 42,
    sampleSpecialist: {
      name: "Dr. Elena Rostova",
      degree: "PhD Distributed Systems",
      institution: "ETH Zürich",
      rating: 4.98,
      reviews: 184,
      deliveries: 312,
    },
  },
  {
    id: "math",
    name: "Higher Mathematics & Stats",
    icon: Layers,
    typicalHours: 14,
    baseBudget: 85,
    expertsOnline: 28,
    sampleSpecialist: {
      name: "Marcus Vance",
      degree: "MPhil Pure Mathematics",
      institution: "Cambridge",
      rating: 4.96,
      reviews: 142,
      deliveries: 260,
    },
  },
  {
    id: "econ",
    name: "Economics & Econometrics",
    icon: TrendingUp,
    typicalHours: 16,
    baseBudget: 110,
    expertsOnline: 19,
    sampleSpecialist: {
      name: "Dr. Aris Thorne",
      degree: "PhD Econometrics",
      institution: "London School of Economics",
      rating: 4.99,
      reviews: 98,
      deliveries: 175,
    },
  },
  {
    id: "thesis",
    name: "Academic Writing & Thesis",
    icon: BookOpen,
    typicalHours: 24,
    baseBudget: 125,
    expertsOnline: 35,
    sampleSpecialist: {
      name: "Sarah Lin",
      degree: "PhD Comparative Literature",
      institution: "Columbia University",
      rating: 4.97,
      reviews: 215,
      deliveries: 410,
    },
  },
];

type UrgencyLevel = "rush" | "standard" | "extended";

export function InteractiveScopeSimulator() {
  const [selectedDomain, setSelectedDomain] = useState<string>("cs");
  const [urgency, setUrgency] = useState<UrgencyLevel>("standard");
  const [scopeDepth, setScopeDepth] = useState<"targeted" | "comprehensive">("targeted");
  const [audienceTab, setAudienceTab] = useState<"student" | "specialist">("student");

  const currentDomain = DOMAINS.find((d) => d.id === selectedDomain) || DOMAINS[0];

  // Dynamic calculations based on selections
  const urgencyMultiplier = urgency === "rush" ? 1.4 : urgency === "standard" ? 1.0 : 0.85;
  const depthMultiplier = scopeDepth === "comprehensive" ? 1.8 : 1.0;
  const calculatedBudgetMin = Math.round(currentDomain.baseBudget * urgencyMultiplier * depthMultiplier * 0.85);
  const calculatedBudgetMax = Math.round(currentDomain.baseBudget * urgencyMultiplier * depthMultiplier * 1.25);
  const calculatedResponseMinutes = urgency === "rush" ? 11 : urgency === "standard" ? 22 : 45;

  return (
    <div className="space-y-12">
      {/* 1. Header with Audience Tabs */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
          <Sparkles className="size-3.5" />
          <span>Interactive Platform Intelligence</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Experience How the Marketplace Works in Real Time
        </h2>
        <p className="text-sm sm:text-base text-muted leading-relaxed">
          Test our algorithmic scope estimator. Calculate budget ranges, average match SLAs, and inspect verified doctoral specialist profiles before publishing.
        </p>

        {/* Audience Segment Switcher */}
        <div className="inline-flex p-1 rounded-full bg-surface-2 border border-border shadow-xs">
          <button
            type="button"
            onClick={() => setAudienceTab("student")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
              audienceTab === "student"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <GraduationCap className="size-4" />
            <span>I am a Student / Researcher</span>
          </button>
          <button
            type="button"
            onClick={() => setAudienceTab("specialist")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
              audienceTab === "specialist"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Zap className="size-4" />
            <span>I am an Academic Specialist</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Calculator Card */}
      {audienceTab === "student" ? (
        <Card className="relative overflow-hidden border-border/80 bg-gradient-to-b from-card via-card to-surface-1 p-6 sm:p-10 shadow-lg">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="grid gap-8 lg:grid-cols-12 relative z-10">
            {/* Left Controls (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-3">
                  1. Select Academic Discipline
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {DOMAINS.map((domain) => {
                    const Icon = domain.icon;
                    const isSelected = domain.id === selectedDomain;
                    return (
                      <button
                        key={domain.id}
                        type="button"
                        onClick={() => setSelectedDomain(domain.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary-soft/40 shadow-xs ring-1 ring-primary/40 font-bold"
                            : "border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2"
                        }`}
                      >
                        <div
                          className={`flex size-9 items-center justify-center rounded-xl ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{domain.name}</p>
                          <p className="text-[10px] text-muted">{domain.expertsOnline} specialists online</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency Controller */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2.5">
                  2. Select Target Turnaround
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "rush", label: "Rush (<24h)", sub: "Priority Dispatch" },
                    { id: "standard", label: "Standard (2-4d)", sub: "Normal Cadence" },
                    { id: "extended", label: "Deep-Dive (7d+)", sub: "Rigorous Scope" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setUrgency(lvl.id as UrgencyLevel)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        urgency === lvl.id
                          ? "border-primary bg-primary-soft/40 shadow-xs ring-1 ring-primary/40 font-bold"
                          : "border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2"
                      }`}
                    >
                      <p className="text-xs font-semibold text-foreground">{lvl.label}</p>
                      <p className="text-[10px] text-muted">{lvl.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Depth Controller */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2.5">
                  3. Project Depth
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScopeDepth("targeted")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scopeDepth === "targeted"
                        ? "border-primary bg-primary-soft/40 shadow-xs ring-1 ring-primary/40 font-bold"
                        : "border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">Targeted Consultation</p>
                    <p className="text-[10px] text-muted">Focused debugging, proof review, or specific blocker</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeDepth("comprehensive")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scopeDepth === "comprehensive"
                        ? "border-primary bg-primary-soft/40 shadow-xs ring-1 ring-primary/40 font-bold"
                        : "border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">Comprehensive Milestone</p>
                    <p className="text-[10px] text-muted">Full module walkthrough, complete chapter or lab study</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Live Simulation Output (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 rounded-2xl border border-border/80 bg-surface-2/60 p-6 backdrop-blur-sm">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                    Algorithmic Projection
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Calibrated
                  </span>
                </div>

                {/* Price & SLA Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Estimated Budget
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-foreground">
                      ${calculatedBudgetMin} - ${calculatedBudgetMax}
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">USD (Escrow held)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      First Proposal SLA
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-foreground">
                      &lt; {calculatedResponseMinutes} mins
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">Median turnaround</p>
                  </div>
                </div>

                {/* Sample Verified Specialist */}
                <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Example Qualified Specialist
                  </span>
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
                      {currentDomain.sampleSpecialist.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">
                          {currentDomain.sampleSpecialist.name}
                        </span>
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        {currentDomain.sampleSpecialist.degree} • {currentDomain.sampleSpecialist.institution}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
                        <span className="font-semibold text-amber-500">
                          ★ {currentDomain.sampleSpecialist.rating}
                        </span>
                        <span>•</span>
                        <span>{currentDomain.sampleSpecialist.deliveries} tasks completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Escrow Custody Assurance Bullet */}
                <div className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>100% Escrow Protection:</strong> Funds only release after your review and sign-off.
                  </span>
                </div>
              </div>

              {/* Conversion CTA */}
              <div className="pt-2">
                <Button asChild size="lg" className="w-full font-bold shadow-md shadow-primary/25">
                  <Link href="/register">
                    <span>Post Your Academic Brief</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Specialist Perspective View */
        <Card className="relative overflow-hidden border-border/80 bg-gradient-to-b from-card via-card to-surface-1 p-6 sm:p-10 shadow-lg">
          <div className="max-w-3xl mx-auto space-y-8 text-center sm:text-left">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="p-5 rounded-2xl border border-border bg-surface-1 space-y-2">
                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">85% Specialist Split</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Earn competitive compensation on every milestone with prompt payouts directly to Stripe or bank wire.
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-surface-1 space-y-2">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Guaranteed Escrow Deposit</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Never work without custody confirmation. Client funds are sequestered in escrow before work begins.
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-surface-1 space-y-2">
                <div className="size-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Award className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Intellectual Autonomy</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Strict academic honor code (BR-10). Provide coaching, code reviews, and proof insights with zero ghostwriting.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-primary/20 bg-primary-soft/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Are you a PhD, Postdoc, or Senior Engineer?</h4>
                <p className="text-xs text-muted">Join our accredited specialist pool. Applications are reviewed within 48 hours.</p>
              </div>
              <Button asChild size="lg" className="shrink-0 font-bold">
                <Link href="/for-experts">
                  <span>Apply as Specialist</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

