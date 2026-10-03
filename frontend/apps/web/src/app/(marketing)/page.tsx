import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
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
import { InteractiveScopeSimulator } from "@/components/patterns/marketing/interactive-scope-simulator";
import { fetchBackendHealth } from "@/lib/api/health";

export const dynamic = "force-dynamic";

const FEATURED_EXPERTS = [
  {
    name: "Dr. Jordan Hayes, Ph.D.",
    title: "Senior Research Scientist · Former Stanford AI Lab",
    institution: "Stanford University",
    avatar: "JH",
    rating: 4.99,
    reviews: 420,
    hourly: "$45",
    domain: "Distributed Systems & AI",
    bio: "Ex-Google Brain researcher specializing in distributed consensus (Raft/Paxos), LLM fine-tuning, and CUDA performance optimization.",
    badges: ["Ph.D. Verified", "Top 1% Mentor", "99.4% On-Time"],
    skills: ["PyTorch", "Distributed Systems", "C++", "CUDA"],
  },
  {
    name: "Dr. Elena Rostova, Ph.D.",
    title: "Doctoral Fellow in Econometrics & Causal Inference",
    institution: "Oxford University & ETH Zürich",
    avatar: "ER",
    rating: 4.98,
    reviews: 312,
    hourly: "$50",
    domain: "Quantitative Economics & Stats",
    bio: "Specializes in synthetic control methods, non-parametric time series, and stochastic calculus for master's and doctoral theses.",
    badges: ["Oxford Fellow", "Peer Reviewer", "100% Satisfaction"],
    skills: ["R / Stata", "Econometrics", "Bayesian Stats", "Time Series"],
  },
  {
    name: "Prof. David Chen, Sc.D.",
    title: "Principal Robotics Architect · Adjunct Faculty",
    institution: "MIT CSAIL",
    avatar: "DC",
    rating: 5.0,
    reviews: 280,
    hourly: "$55",
    domain: "Robotics, SLAM & Embedded Control",
    bio: "12 years designing autonomous navigation pipelines, sensor fusion, Kalman filters, and real-time embedded hardware.",
    badges: ["MIT Alum", "IEEE Senior Member", "High Complexity"],
    skills: ["ROS2", "SLAM", "Kalman Filters", "Embedded C"],
  },
  {
    name: "Dr. Sarah Jenkins, Ph.D.",
    title: "Postdoctoral Fellow in Topological Data Analysis",
    institution: "Cambridge University",
    avatar: "SJ",
    rating: 4.97,
    reviews: 195,
    hourly: "$40",
    domain: "Pure Mathematics & Algebraic Topology",
    bio: "Patient mathematical coach for advanced abstract algebra, real analysis, manifold theory, and complex mathematical proofs.",
    badges: ["Cambridge Ph.D.", "Honor Roll Tutor", "Proof Specialist"],
    skills: ["Differential Geometry", "Topology", "Real Analysis", "LaTeX"],
  },
];

const STUDENT_OUTCOMES = [
  {
    icon: Zap,
    title: "Break Blockers in Under 30 Minutes",
    desc: "Don't spend days stuck on a cryptic compiler fault or multivariable calculus proof. Match with a verified specialist who spots the issue immediately.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Brain,
    title: "Master Hard Concepts, Don't Just Memorize",
    desc: "1-on-1 personalized breakdowns designed for deep conceptual intuition. Receive recorded walkthroughs, commented code, and step-by-step mathematical proofs.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ShieldCheck,
    title: "100% Ethical & Anti-Plagiarism Protected",
    desc: "Strict adherence to academic integrity (BR-10 & BR-14). Experts guide, mentor, and debug alongside you — guaranteeing your degree and reputation remain untarnished.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Lock,
    title: "Bank-Grade Milestone Escrow Security",
    desc: "Your funds are sequestered in double-entry platform escrow and released only when you inspect and approve the consultation delivery.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
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
          1. ULTRA-PREMIUM DUAL-COLUMN HERO (STUDENT ATTRACTION)
      ════════════════════════════════════════════════ */}
      <section className="relative -mx-4 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-background p-6 sm:mx-0 sm:p-12 lg:p-16 shadow-2xl">
        <Spotlight />
        {/* Ambient Glowing Blobs */}
        <div className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[600px] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="bg-tech-grid absolute inset-0 opacity-25 pointer-events-none" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Text Column: Strong Student Conversion Copy */}
          <div className="space-y-6 lg:col-span-7">
            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>{health?.status === "ok" ? "Platform Active · 1,420 Accredited Specialists Online" : "Concierge Network Online"}</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.12] xl:text-6xl">
              Accelerate Your Studies With <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Verified Doctoral Scholars</span>
            </h1>

            <p className="text-sm text-slate-300 sm:text-base xl:text-lg leading-relaxed max-w-2xl">
              Overcome challenging coursework, complex algorithms, and thesis roadblocks with 1-on-1 guidance from top 3% academics from Stanford, MIT, and Oxford. Zero ghostwriting — 100% milestone protected.
            </p>

            {/* Quick Benefits Bullet List */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-slate-300 sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span>Instant Debugging &amp; Proofs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span>1-on-1 Personalized Coaching</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span>Strict Anti-Plagiarism Pledge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span>Milestone Escrow Guarantee</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button size="lg" variant="glow" asChild className="h-12 px-7 text-sm font-semibold shadow-xl shadow-primary/30">
                <Link href="/register">
                  Find Your Specialist Now <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="h-12 border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700">
                <Link href="/experts">Browse Doctoral Directory</Link>
              </Button>
            </div>

            {/* Live Trust Metrics Strip */}
            <div className="flex flex-wrap items-center gap-6 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
              <div>
                <span className="font-mono text-base font-bold text-white">250,000+</span>
                <span className="block text-[10px] text-slate-400">Sessions Completed</span>
              </div>
              <span className="text-slate-700">•</span>
              <div>
                <span className="font-mono text-base font-bold text-emerald-400">99.2%</span>
                <span className="block text-[10px] text-slate-400">On-Time Completion</span>
              </div>
              <span className="text-slate-700">•</span>
              <div>
                <span className="font-mono text-base font-bold text-primary">Top 3%</span>
                <span className="block text-[10px] text-slate-400">Vetted Acceptance</span>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span className="font-medium text-white">Escrow Safeguarded</span>
              </div>
            </div>
          </div>

          {/* Right Visual Column: High-Tech Student Hero Graphic with Floating Badges */}
          <div className="relative lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-lg rounded-2xl border border-primary/30 bg-surface/50 p-2.5 shadow-2xl backdrop-blur-xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-700/60 shadow-inner">
                <Image
                  src="/images/marketing/student_hero_study.jpg"
                  alt="Student mastering advanced academic concepts in high-tech research studio"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
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
                  <span className="block text-[10px] text-slate-400">Across 312+ Doctoral Consults</span>
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
                  <span className="block text-[10px] text-slate-400">Funds Protected Until Approval</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          2. PROMINENT "WHO IS HERE" — FEATURED DOCTORAL SPECIALISTS
      ════════════════════════════════════════════════ */}
      <section className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
              <UserCheck className="size-3.5" />
              <span>Elite Verified Talent</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Who Is Here to Coach You?
            </h2>
            <p className="text-sm text-muted max-w-2xl">
              No anonymous freelancers. Learn directly from credentialed Ph.D. scholars, postdocs, and senior industry architects from top global research labs.
            </p>
          </div>
          <Button variant="secondary" asChild className="shrink-0">
            <Link href="/experts">View All 1,420 Specialists →</Link>
          </Button>
        </div>

        {/* 4 Rich Specialist Profile Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {FEATURED_EXPERTS.map((exp) => (
            <Card key={exp.name} variant="glass" hover className="h-full flex flex-col justify-between p-6 relative overflow-hidden border-border/80">
              <div className="space-y-4">
                {/* Header: Avatar, Name, Rating */}
                <div className="flex items-start gap-3.5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 font-bold text-white shadow-md text-sm">
                    {exp.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-foreground truncate">{exp.name}</h3>
                      <BadgeCheck className="size-4 shrink-0 text-primary" />
                    </div>
                    <p className="text-[11px] font-medium text-primary line-clamp-1">{exp.domain}</p>
                    <p className="text-[10px] text-muted">{exp.institution}</p>
                  </div>
                </div>

                {/* Rating & Reviews */}
                <div className="flex items-center justify-between border-y border-border/60 py-2.5 text-xs">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span>{exp.rating}</span>
                    <span className="text-[11px] text-muted font-normal">({exp.reviews} consults)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">{exp.hourly}<span className="text-[10px] text-muted font-normal">/brief</span></span>
                </div>

                {/* Bio */}
                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                  {exp.bio}
                </p>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exp.skills.map((skill) => (
                    <span key={skill} className="rounded-md border border-border bg-surface-2/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-4 border-t border-border/60">
                <Button variant="secondary" className="w-full text-xs font-semibold h-9" asChild>
                  <Link href="/register">
                    Request 1-on-1 Brief <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          3. "WHAT STUDENTS ACHIEVE" — VISUAL OUTCOME DECK WITH 3D ART
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

          {/* Right Column: 4 Student Value Pillars */}
          <div className="space-y-6 lg:col-span-6">
            <div className="space-y-2">
              <Badge tone="flow">Direct Academic Impact</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                What You Get as a Student
              </h2>
              <p className="text-sm text-muted">
                Transform stress and academic confusion into mastery. Every inquiry is calibrated for tangible comprehension and rapid turnaround.
              </p>
            </div>

            <div className="space-y-4">
              {STUDENT_OUTCOMES.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-border/60 bg-surface/70 p-4 transition-all hover:bg-surface hover:shadow-md">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button size="lg" variant="glow" asChild className="h-11">
                <Link href="/register">Start Your Student Brief <ArrowRight className="size-4 ml-1.5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          4. INTERACTIVE SCOPE SIMULATOR (PLAYGROUND)
      ════════════════════════════════════════════════ */}
      <InteractiveScopeSimulator />

      {/* ════════════════════════════════════════════════
          5. MILESTONE ESCROW & SECURITY VAULT (DARK CYBERNETIC BANNER)
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
          6. DISCIPLINE DIRECTORY GRID
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
          7. SPECIALIST RECRUITMENT CALLOUT BANNER
      ════════════════════════════════════════════════ */}
      <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-surface p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-3.5" />
              <span>For Subject Specialists</span>
            </div>
            <h3 className="text-2xl font-extrabold text-foreground">Are You a University Tutor or Ph.D. Expert?</h3>
            <p className="text-sm text-muted max-w-xl">
              Teach what you love, choose your own hours, and keep up to 85% of what you charge. Join an accredited academic network trusted by hundreds of thousands of students.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button variant="secondary" asChild className="h-11">
              <Link href="/for-experts">Learn More</Link>
            </Button>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-0 shadow-lg shadow-amber-500/25 h-11 px-5">
              <Link href="/register/expert">
                Apply as Specialist <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          8. CLOSING HIGH-CONVERTING STUDENT CTA
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
