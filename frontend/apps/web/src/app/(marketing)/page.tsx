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
  Video,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spotlight } from "@/components/patterns/marketing/spotlight";
import { PartnerMarquee } from "@/components/patterns/marketing/partner-marquee";
import { ExpertDiscoveryGrid } from "@/components/patterns/marketing/expert-discovery-grid";
import { InteractiveScopeSimulator } from "@/components/patterns/marketing/interactive-scope-simulator";
import { AnimatedHeroBlobs, HeroGraphicStage } from "@/components/patterns/marketing/hero-stage";
import { LandingBentoGrid } from "@/components/patterns/marketing/landing-bento-grid";
import { InteractiveRoleStepper } from "@/components/patterns/marketing/role-stepper";
import { LivePlatformTicker } from "@/components/patterns/marketing/platform-ticker";
import { FeaturedCohortsShowcase } from "@/components/patterns/marketing/featured-cohorts";
import { fetchBackendHealth } from "@/lib/api/health";

export const dynamic = "force-dynamic";

const POPULAR_SEARCHES = [
  "Distributed Systems",
  "Econometrics & R",
  "Production RAG",
  "Constitutional Law",
  "PostgreSQL Internals",
];

const DISCIPLINES = [
  { icon: Code2, name: "Python & Distributed Systems", slug: "python", desc: "NumPy, Pandas, PyTorch, algorithm optimization, Raft", experts: 14, color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Calculator, name: "Higher Mathematics & Calculus", slug: "calculus", desc: "Differential equations, linear algebra, proofs, real analysis", experts: 11, color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: TrendingUp, name: "Statistics & Econometrics", slug: "statistics", desc: "Bayesian modeling, causal inference, hypothesis testing, R", experts: 9, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: Globe, name: "Cloud & Fullstack Architecture", slug: "web-development", desc: "Next.js, Django REST, microservices, PostgreSQL, Docker", experts: 12, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Brain, name: "Machine Learning & AI", slug: "python", desc: "Transformer architectures, CUDA, computer vision, NLP", experts: 15, color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: FlaskConical, name: "Academic English & Thesis Defense", slug: "academic-english", desc: "Scholarly prose, methodology critique, literature review", experts: 8, color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <div className="flex flex-col gap-20 sm:gap-28 pb-20">

      {/* ════════════════════════════════════════════════
          1. NEXT-GEN ANIMATED HERO SECTION
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-background p-6 sm:p-10 lg:p-16 shadow-2xl">
        <Spotlight />
        <AnimatedHeroBlobs />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Text & Search Column (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* Top Announcement Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-primary/20 backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
              </span>
              <span>✨ Live 1:1 WebRTC Studio · Double-Entry Escrow · Instant Digital Vault</span>
            </div>

            {/* High-Impact Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.08]">
              Hire Vetted Specialists, Book Live 1:1 Coaching &amp;{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                Unlock Elite Knowledge.
              </span>
            </h1>

            {/* Bold, Scannable Subtitle */}
            <p className="text-sm sm:text-base xl:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Skip the generic freelancing queue. Collaborate directly with <strong className="text-white font-semibold">verified doctoral scholars and staff architects</strong> for <strong className="text-cyan-300 font-semibold">live WebRTC coaching</strong>, milestone-gated project advisory, and <strong className="text-indigo-300 font-semibold">peer-reviewed code blueprints</strong>.
            </p>

            {/* Interactive Hero Search & Command Trigger Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center rounded-2xl border border-slate-700/90 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Search className="size-5 text-indigo-400 ml-3 shrink-0" />
                <input
                  suppressHydrationWarning
                  type="text"
                  placeholder="Search by topic, e.g. 'Distributed Raft', 'Quantum Mechanics', 'Causal Inference'…"
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <Button size="sm" variant="glow" asChild className="shrink-0 h-10 px-5 text-xs font-bold rounded-xl shadow-lg shadow-primary/30">
                  <Link href="/experts">
                    Explore Specialists <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>

              {/* Animated Trending Topic Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-slate-400">Trending Topics:</span>
                {POPULAR_SEARCHES.map((topic) => (
                  <Link
                    key={topic}
                    href={`/experts?q=${encodeURIComponent(topic)}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-slate-300 hover:border-primary/60 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>

            {/* Dual High-Contrast CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button size="lg" variant="glow" asChild className="h-12 px-7 text-sm font-bold shadow-xl shadow-primary/30">
                <Link href="/experts">
                  Explore Specialists &amp; Book 1:1 <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="h-12 px-6 text-sm font-semibold border-slate-700 bg-slate-900/80 text-white hover:bg-slate-800">
                <Link href="/requests/new">
                  Post a Custom Brief
                </Link>
              </Button>
            </div>

            {/* 4-Metric Trust Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/90 pt-6 text-xs text-slate-400">
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <span className="font-mono text-base font-black text-white block">Top 2%</span>
                <span className="text-[10px] text-slate-400">Vetting Rate</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <span className="font-mono text-base font-black text-emerald-400 block">45,000+</span>
                <span className="text-[10px] text-slate-400">Hours Delivered</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <span className="font-mono text-base font-black text-amber-400 block">4.99 / 5.0</span>
                <span className="text-[10px] text-slate-400">Satisfaction Score</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <span className="font-mono text-base font-black text-cyan-400 block">&lt; 15 Mins</span>
                <span className="text-[10px] text-slate-400">Median Proposal SLA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating 3-Layer Live UI Graphic Composition (5 cols) */}
          <div className="lg:col-span-5 relative">
            <HeroGraphicStage />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          2. INFINITE MOVING MARQUEE & TELEMETRY STRIP
      ════════════════════════════════════════════════ */}
      <LivePlatformTicker />

      {/* ════════════════════════════════════════════════
          3. CATCHY 4-PILLAR BENTO GRID ("WHAT PLATFORM IS ABOUT")
      ════════════════════════════════════════════════ */}
      <LandingBentoGrid />

      {/* ════════════════════════════════════════════════
          4. TRENDING LIVE WORKSHOPS & MICRO-COHORTS (MAVEN PILLAR)
      ════════════════════════════════════════════════ */}
      <FeaturedCohortsShowcase />

      {/* ════════════════════════════════════════════════
          5. FEATURED SPECIALISTS DIRECTORY SHOWCASE
      ════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
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
          6. INTERACTIVE HOW-IT-WORKS STEPPER & ROLE SWITCHER
      ════════════════════════════════════════════════ */}
      <InteractiveRoleStepper />

      {/* ════════════════════════════════════════════════
          7. MENTOR VALUE PROPOSITION & ECONOMICS
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
              Join an exclusive network of top academics, staff engineers, and domain researchers. Set your own consultation rates, choose what briefs to accept, and keep up to <strong>85% of what you earn</strong> — with zero subscription or listing fees.
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
          8. INTERACTIVE SCOPE SIMULATOR (LIVE CALCULATOR)
      ════════════════════════════════════════════════ */}
      <InteractiveScopeSimulator />

      {/* ════════════════════════════════════════════════
          9. SPECIALIZED SUBJECT COVERAGE
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
            <Link key={subj.name} href={`/subjects/${subj.slug}`}>
              <div className="group relative rounded-2xl border border-border/70 bg-card p-5 h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${subj.bg}`}>
                    <subj.icon className={`size-5 ${subj.color}`} />
                  </div>
                  <span className={`text-xs font-mono font-bold ${subj.color}`}>{subj.experts} doctoral specialists</span>
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
          10. CLOSING HIGH-CONVERTING CTA SECTION
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary-soft/40 to-indigo-950/20 p-10 sm:p-16 text-center space-y-6 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <Badge tone="info">Get Started Today</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Never Struggle With Difficult Technical Material Alone
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
            Post your brief in 60 seconds. Receive competitive blind offers from verified doctoral scholars. Funds released only when you confirm complete satisfaction.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" variant="glow" asChild className="h-12 px-8 text-sm font-bold shadow-xl shadow-primary/25">
              <Link href="/register">Post Your Free Student Brief <ArrowRight className="size-4 ml-1.5" /></Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="h-12 text-sm font-semibold">
              <Link href="/how-it-works">How the Platform Works</Link>
            </Button>
          </div>
          <p className="text-xs text-muted pt-2">No subscription fees · 100% Escrow protected · Ethical academic coaching</p>
        </div>
      </section>

    </div>
  );
}
