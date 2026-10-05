import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  FileCheck2,
  FlaskConical,
  Globe,
  GraduationCap,
  Lock,
  MessageSquare,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spotlight } from "@/components/patterns/marketing/spotlight";
import { PartnerMarquee } from "@/components/patterns/marketing/partner-marquee";
import { ExpertDiscoveryGrid } from "@/components/patterns/marketing/expert-discovery-grid";
import { InteractiveScopeSimulator } from "@/components/patterns/marketing/interactive-scope-simulator";
import { fetchBackendHealth } from "@/lib/api/health";

export const dynamic = "force-dynamic";

const POPULAR_SEARCHES = [
  "Distributed Consensus",
  "LLM Fine-Tuning",
  "Econometrics & R",
  "Multivariable Calculus",
  "CUDA Optimization",
  "ROS2 Robotics",
];

const LEARNER_STEPS = [
  {
    step: "01",
    title: "Discover Your Specialist",
    desc: "Filter 2,400+ vetted doctoral scholars and senior staff engineers by technical domain, academic credential, and hourly rate.",
    icon: Search,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    step: "02",
    title: "Book 1:1 or Milestone Project",
    desc: "Post a private brief with your target turnaround. Receive tailored blind proposals with transparent, locked-in milestone budgets.",
    icon: MessageSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    step: "03",
    title: "Elevate Your Mastery Safely",
    desc: "Collaborate in dedicated order workspaces with shared code, live proofs, and file review. Funds remain securely in escrow until you approve.",
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const DISCIPLINES = [
  { icon: Code2, name: "Python & Distributed Systems", slug: "python", desc: "NumPy, Pandas, PyTorch, algorithm optimization, Raft", experts: 14, color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Calculator, name: "Higher Mathematics & Calculus", slug: "calculus", desc: "Differential equations, linear algebra, proofs, real analysis", experts: 11, color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: TrendingUp, name: "Statistics & Econometrics", slug: "statistics", desc: "Bayesian modeling, causal inference, hypothesis testing, R", experts: 9, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: Globe, name: "Cloud & Fullstack Architecture", slug: "web-development", desc: "Next.js, Django REST, microservices, PostgreSQL, Docker", experts: 12, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Brain, name: "Machine Learning & AI", slug: "machine-learning", desc: "Transformer architectures, CUDA, computer vision, NLP", experts: 15, color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: FlaskConical, name: "Academic English & Thesis Defense", slug: "academic-english", desc: "Scholarly prose, methodology critique, literature review", experts: 8, color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <div className="flex flex-col gap-24 sm:gap-32 pb-20">

      {/* ════════════════════════════════════════════════
          1. ULTRA-WIDE HERO SECTION (MAVEN / LINEAR / INTRO.CO CALIBER)
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-background p-6 sm:p-12 lg:p-16 shadow-2xl">
        <Spotlight />
        {/* Ambient Glowing Blobs */}
        <div className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[600px] rounded-full bg-indigo-500/15 blur-[130px]" />
        <div className="bg-tech-grid absolute inset-0 opacity-25 pointer-events-none" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Text & Search Column */}
          <div className="space-y-6 lg:col-span-7">
            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>{health?.status === "ok" ? "Platform Live · 2,400+ Vetted Industry Leaders Available" : "Concierge Network Online"}</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.1] xl:text-6xl">
              Learn Directly From <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">World-Class Minds</span>
            </h1>

            <p className="text-sm text-slate-300 sm:text-base xl:text-lg leading-relaxed max-w-2xl">
              Book private 1:1 masterclasses, live technical debugging, and rigorous research guidance with verified doctoral scholars, staff engineers, and industry leaders.
            </p>

            {/* Prominent Search Pill Bar with Instant Category Quick-Filters */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center rounded-2xl border border-slate-700/80 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
                <Search className="size-5 text-muted ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by topic, e.g. 'Distributed Raft', 'Quantum Mechanics', 'Causal Inference'…"
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <Button size="sm" variant="glow" asChild className="shrink-0 h-10 px-5 text-xs font-bold rounded-xl shadow-lg shadow-primary/25">
                  <Link href="/experts">
                    Explore <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>

              {/* Instant Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-400">Trending Topics:</span>
                {POPULAR_SEARCHES.map((topic) => (
                  <Link
                    key={topic}
                    href={`/experts?q=${encodeURIComponent(topic)}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-0.5 text-slate-300 hover:border-primary/50 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>

            {/* 4-Metric Trust Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
              <div>
                <span className="font-mono text-base font-extrabold text-white">Top 2%</span>
                <span className="block text-[10px] text-slate-400">Acceptance Rate</span>
              </div>
              <div>
                <span className="font-mono text-base font-extrabold text-emerald-400">45,000+</span>
                <span className="block text-[10px] text-slate-400">Hours Delivered</span>
              </div>
              <div>
                <span className="font-mono text-base font-extrabold text-amber-400">4.98 / 5.0</span>
                <span className="block text-[10px] text-slate-400">Average Student Rating</span>
              </div>
              <div>
                <span className="font-mono text-base font-extrabold text-cyan-400">&lt; 15 Mins</span>
                <span className="block text-[10px] text-slate-400">Median Proposal SLA</span>
              </div>
            </div>
          </div>

          {/* Right Visual Column: High-Tech Studio Graphic with Floating Badges */}
          <div className="relative lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-lg rounded-2xl border border-primary/30 bg-surface/50 p-2.5 shadow-2xl backdrop-blur-xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-700/60 shadow-inner">
                <Image
                  src="/images/marketing/student_hero_study.jpg"
                  alt="Student mastering advanced academic concepts in high-tech research studio"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 550px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Live Badge 1: Top Right */}
              <div className="absolute -top-3 -right-3 sm:-right-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                  ★
                </div>
                <div>
                  <span className="block text-xs font-bold text-white">4.98 / 5.0 Rating</span>
                  <span className="block text-[10px] text-slate-400">Across 312+ Consultations</span>
                </div>
              </div>

              {/* Floating Live Badge 2: Bottom Left */}
              <div className="absolute -bottom-3 -left-3 sm:-left-4 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-slate-900/95 px-4 py-2.5 shadow-xl backdrop-blur-md">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-white">Milestone Escrow Active</span>
                  <span className="block text-[10px] text-slate-400">Funds Safe Until You Approve</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          2. INFINITE MARQUEE TICKER (RESEARCH LABS & TECH PARTNERS)
      ════════════════════════════════════════════════ */}
      <PartnerMarquee />

      {/* ════════════════════════════════════════════════
          3. EXPERT DISCOVERY & SHOWCASE GRID (FILTERABLE BY DOMAIN)
      ════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            <UserCheck className="size-3.5" />
            <span>Featured Industry &amp; Academic Specialists</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Book 1:1 Sessions With Top Practitioners
          </h2>
          <p className="text-sm text-muted max-w-2xl">
            Filter our network of credentialed Ph.D. scholars, postdocs, and senior staff architects. Real identities, verified badges, and transparent rates.
          </p>
        </div>

        <ExpertDiscoveryGrid />
      </section>

      {/* ════════════════════════════════════════════════
          4. VALUE PROPOSITION & HOW IT WORKS (3-STEP SEQUENCE)
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-2/30 to-background p-8 sm:p-12 lg:p-16 shadow-xl">
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Visual Mentorship Graphic */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="relative w-full rounded-2xl border border-border bg-surface-1 p-2.5 shadow-2xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                <Image
                  src="/images/marketing/expert_mentorship_collab.jpg"
                  alt="Doctoral scholar guiding a student through STEM research framework"
                  fill
                  sizes="(max-width: 768px) 100vw, 550px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>

              <div className="mt-3 flex items-center justify-between px-2 text-xs text-muted">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <BadgeCheck className="size-4 text-primary" /> Verified Academic Coaching
                </span>
                <span>Zero Ghostwriting Guarantee</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3-Step Sequence for Learners */}
          <div className="space-y-6 lg:col-span-6">
            <div className="space-y-2">
              <Badge tone="flow">The Learning Pipeline</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                How Knowledge Marketplace Works
              </h2>
              <p className="text-sm text-muted">
                From finding the right specialist to deep conceptual mastery — structured, milestone-gated, and completely ethical.
              </p>
            </div>

            <div className="space-y-4">
              {LEARNER_STEPS.map((item) => (
                <div key={item.step} className="flex gap-4 rounded-2xl border border-border/60 bg-surface/70 p-4 transition-all hover:bg-surface hover:shadow-md">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted">{item.step}</span>
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="glow" asChild className="h-11">
                <Link href="/register">Get Started as a Student <ArrowRight className="size-4 ml-1.5" /></Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="h-11">
                <Link href="/how-it-works">Detailed Protocol</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          5. DEDICATED "MONETIZE YOUR KNOWLEDGE" CALLOUT FOR MENTORS
      ════════════════════════════════════════════════ */}
      <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-surface p-8 sm:p-12 shadow-xl">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-3.5" />
              <span>For Industry Practitioners &amp; Doctoral Mentors</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Monetize Your Specialized Knowledge
            </h3>
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              Join an exclusive network of top academics, staff engineers, and domain researchers. Set your own consultation rates, choose what briefs to accept, and keep up to 85% of what you earn — with zero subscription or listing fees.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> Keep 85% on open bids</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> 72-hour automated payout clearing</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> Dedicated operator dispute protection</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:col-span-4 lg:items-end justify-center">
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-bold border-0 shadow-lg shadow-amber-500/25 h-11 px-6 text-sm">
              <Link href="/register/expert">
                Apply as a Specialist <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button variant="secondary" asChild className="h-11">
              <Link href="/for-experts">Explore Mentor Economics</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          6. INTERACTIVE SCOPE SIMULATOR (LIVE CALCULATION PLAYGROUND)
      ════════════════════════════════════════════════ */}
      <InteractiveScopeSimulator />

      {/* ════════════════════════════════════════════════
          7. MILESTONE ESCROW & PLATFORM SECURITY VAULT
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-12 lg:p-14 text-white shadow-2xl">
        <div className="pointer-events-none absolute -top-40 right-0 size-80 rounded-full bg-emerald-500/10 blur-[120px]" />

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 relative z-10">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>Double-Entry Escrow Protocol</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your Funds Stay In Escrow Until You Are 100% Satisfied
            </h2>

            <p className="text-sm text-slate-300 sm:text-base leading-relaxed">
              Unlike freelance boards where suppliers take upfront payments without accountability, our double-entry ledger holds all funds safely until you inspect the consultation deliverables and confirm satisfaction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <span className="block font-bold text-white">Milestone Gated</span>
                <span className="text-[11px] text-slate-400">Funds released only upon explicit student approval.</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <span className="block font-bold text-white">72h Review Window</span>
                <span className="text-[11px] text-slate-400">Request revisions or inspect work before release.</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <span className="block font-bold text-white">Human Arbitration</span>
                <span className="text-[11px] text-slate-400">Dedicated staff resolve any timeline or scope dispute.</span>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold border-0 shadow-lg shadow-emerald-500/25">
                <Link href="/academic-integrity">Read Security &amp; Honor Code →</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-2 shadow-2xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                <Image
                  src="/images/marketing/escrow_vault_security.jpg"
                  alt="Cryptographic milestone security vault with biometric and multi-factor authorization"
                  fill
                  sizes="(max-width: 768px) 100vw, 450px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          8. SPECIALIZED SUBJECT COVERAGE
      ════════════════════════════════════════════════ */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge tone="neutral">Accredited Subject Domains</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Specialized Subject Coverage
            </h2>
            <p className="text-sm text-muted">Browse staffed subjects or discover experts across specialized technical domains.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/subjects">View All Disciplines →</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCIPLINES.map((subj) => (
            <Link key={subj.slug} href={`/subjects/${subj.slug}`}>
              <div className="group relative rounded-2xl border border-border/70 bg-surface/80 p-5 h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${subj.bg}`}>
                    <subj.icon className={`size-5 ${subj.color}`} />
                  </div>
                  <span className={`text-xs font-mono font-semibold ${subj.color}`}>{subj.experts} doctoral specialists</span>
                </div>
                <h3 className="mt-3 font-bold text-foreground text-sm tracking-tight">{subj.name}</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">{subj.desc}</p>
                <div className={`mt-3 flex items-center gap-1 text-[11px] font-semibold ${subj.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Browse subject experts <ChevronRight className="size-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          9. CLOSING HIGH-CONVERTING STUDENT CTA
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary-soft/40 to-indigo-950/20 p-10 sm:p-16 text-center space-y-6 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <Badge tone="info">Get Started Today</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Never Struggle With Difficult Academic Material Alone
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
            Post your brief in 60 seconds. Receive competitive blind offers from verified doctoral scholars. Funds released only when you confirm complete satisfaction.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" variant="glow" asChild className="h-12 px-8 text-sm font-semibold">
              <Link href="/register">Post Your Free Student Brief <ArrowRight className="size-4 ml-1.5" /></Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="h-12">
              <Link href="/how-it-works">How the Platform Works</Link>
            </Button>
          </div>
          <p className="text-xs text-muted pt-2">No subscription fees · 100% Escrow protected · Ethical academic coaching</p>
        </div>
      </section>

    </div>
  );
}
