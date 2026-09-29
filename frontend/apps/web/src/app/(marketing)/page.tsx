import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spotlight } from "@/components/patterns/marketing/spotlight";
import { TextReveal } from "@/components/patterns/marketing/text-reveal";
import { Reveal, Stagger, StaggerItem } from "@/components/patterns/reveal";
import { fetchBackendHealth } from "@/lib/api/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <div className="flex flex-col gap-28 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative -mx-4 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-surface via-surface-2/40 to-background px-4 py-24 text-center sm:mx-0 sm:px-10 sm:py-32 shadow-sm">
        <Spotlight />
        <div className="bg-tech-grid absolute inset-0 opacity-40 pointer-events-none" />
        <div className="bg-radial-glow absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] pointer-events-none opacity-60" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Vetted Academic & Technology Specialists
          </div>

          <TextReveal
            as="h1"
            text="Where Complex Inquiries Meet Verified Intelligence"
            className="text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-[1.08] text-foreground"
          />

          <p className="mx-auto max-w-2xl text-base text-muted sm:text-xl font-normal leading-relaxed">
            Connect directly with verified scholars and practitioners. Post your challenge for competing offers,
            or let our concierge service guarantee the match, escrow protection, and peer-reviewed delivery.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" variant="glow" asChild>
              <Link href="/register">
                Find an Expert <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/experts">Browse Directory</Link>
            </Button>
          </div>

          {/* Live Trust Metrics Bar */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${health?.status === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>Platform Network: <strong className="text-foreground font-medium">{health?.status === "ok" ? "Operational" : "Degraded"}</strong></span>
            </div>
            <span className="hidden sm:inline-block text-border">•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Escrow Security: <strong className="text-foreground font-medium">Guaranteed</strong></span>
            </div>
            <span className="hidden sm:inline-block text-border">•</span>
            <div className="flex items-center gap-1.5">
              <Award className="size-3.5 text-primary" />
              <span>Expert Acceptance: <strong className="text-foreground font-medium">Top 15% Vetted</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW KNOWLEDGE MOVES (THE THREE-STEP PIPELINE) */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <Badge tone="info">Orchestrated Workflow</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How Knowledge Moves Through the Platform
          </h2>
          <p className="mx-auto max-w-2xl text-muted text-sm sm:text-base">
            Every engagement operates under a transparent, milestone-gated framework designed for academic rigor and mutual accountability.
          </p>
        </div>

        <Stagger className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Articulate Your Scope",
              body: "Define your learning goals, subject requirements, target timeline, and budget. Your brief remains private to accredited specialists.",
              icon: BookOpen,
              highlight: "Self-service brief builder",
            },
            {
              step: "02",
              title: "Competitive Blind Matching",
              body: "Approved experts formulate customized coaching plans and binding pricing without seeing competing bids, ensuring fair pricing.",
              icon: Scale,
              highlight: "Blind bidding protocol (BR-15)",
            },
            {
              step: "03",
              title: "Escrow-Protected Delivery",
              body: "Funds remain securely sequestered in platform escrow until you inspect the work, review revisions, and confirm satisfaction.",
              icon: Lock,
              highlight: "Double-entry ledger escrow",
            },
          ].map((item) => (
            <StaggerItem key={item.step}>
              <Card variant="glass" hover className="h-full relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-bold text-primary/70">{item.step}</span>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <item.icon className="size-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.body}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60">
                  <span className="text-[11px] font-medium text-primary tracking-wide">{item.highlight}</span>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* 3. HYBRID MODEL: OPEN MARKETPLACE VS. MANAGED CONCIERGE */}
      <Reveal as="section" className="space-y-12">
        <div className="text-center space-y-3">
          <Badge tone="flow">The Hybrid Advantage</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Choose Your Delivery Dynamic
          </h2>
          <p className="mx-auto max-w-2xl text-muted text-sm sm:text-base">
            Select the exact degree of platform involvement that fits your timeline and project complexity.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Open Marketplace Card */}
          <Card variant="glow" className="relative space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge tone="neutral">Autonomous Model</Badge>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Open Marketplace</h3>
                <p className="mt-1 text-sm text-muted">For students who prefer to review and compare competing specialist offers.</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-foreground">15%</span>
                <p className="text-[11px] text-muted">Platform fee</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-foreground">
              {[
                "Publish inquiries directly to the public directory of qualified tutors",
                "Receive multiple blind proposals with transparent schedule breakdowns",
                "Direct real-time consultation before award",
                "Full control over expert selection and award timing",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-border">
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/requests/new">Post an Open Request</Link>
              </Button>
            </div>
          </Card>

          {/* Managed Service Card */}
          <Card variant="glow" className="relative space-y-6 bg-gradient-to-br from-surface to-primary-soft/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge tone="info">White-Glove Concierge</Badge>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Managed Service</h3>
                <p className="mt-1 text-sm text-muted">For high-stakes coursework and projects requiring guaranteed talent matching.</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-primary">20%</span>
                <p className="text-[11px] text-muted">Platform fee</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-foreground">
              {[
                "Concierge scope review and calibrated quote calibration within 24h",
                "Direct assignment from our premier verified pool with guaranteed SLAs",
                "Platform oversight on all deliverables and milestone revisions",
                "Priority operator arbitration in the event of any timeline dispute",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-accent-flow mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-border">
              <Button variant="primary" className="w-full" asChild>
                <Link href="/requests/new">Request Managed Service</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Reveal>

      {/* 4. CURATED ACADEMIC & PROFESSIONAL DISCIPLINES */}
      <section className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge tone="neutral">Disciplines</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Specialized Subject Coverage
            </h2>
            <p className="text-sm text-muted">Browse staffed subjects or discover experts across specialized domains.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/subjects">View All Disciplines →</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Python & Data Science", slug: "python", desc: "NumPy, Pandas, scripting, algorithm optimization", experts: 8 },
            { name: "Mathematics & Calculus", slug: "calculus", desc: "Differential equations, linear algebra, proofs", experts: 6 },
            { name: "Statistics & Probability", slug: "statistics", desc: "Bayesian modeling, hypothesis testing, R, regression", experts: 5 },
            { name: "Web Architecture", slug: "web-development", desc: "Next.js, Django, distributed APIs, microservices", experts: 7 },
            { name: "Academic English", slug: "academic-english", desc: "Scholarly prose, thesis editing, literature review", experts: 4 },
            { name: "Machine Learning", slug: "machine-learning", desc: "Neural networks, PyTorch, model evaluation", experts: 6 },
          ].map((subj) => (
            <Link key={subj.slug} href={`/subjects/${subj.slug}`}>
              <Card variant="glass" hover className="h-full space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground tracking-tight">{subj.name}</h3>
                  <span className="text-xs text-muted font-mono">{subj.experts} verified</span>
                </div>
                <p className="text-xs text-muted line-clamp-2">{subj.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. ACADEMIC INTEGRITY & TRUST CODE */}
      <Reveal as="section" className="rounded-2xl border border-border bg-surface-2/40 p-8 sm:p-12 relative overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="space-y-4 lg:col-span-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              <ShieldCheck className="size-4" /> Academic Integrity Pledge (BR-10 & BR-14)
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              We Coach. We Teach. We Never Ghostwrite.
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              The Hybrid Expert Marketplace exists to empower student comprehension and accelerate mastery.
              Our strict honor code ensures experts guide, review, explain, and debug alongside students — they are
              prohibited from completing graded coursework on your behalf.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Verified credentials</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Double-entry ledger escrow</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> 14-day dispute arbitration</span>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <Button variant="secondary" asChild>
              <Link href="/academic-integrity">Read the Academic Code</Link>
            </Button>
          </div>
        </div>
      </Reveal>

      {/* 6. CONVERSION CTA */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary-soft/30 to-accent-flow/10 p-10 sm:p-16 text-center space-y-6 shadow-lg">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Ready to Master Your Subject?
        </h2>
        <p className="mx-auto max-w-xl text-muted text-base sm:text-lg">
          Join thousands of learners and verified domain specialists collaborating under complete milestone security.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Button size="lg" variant="glow" asChild>
            <Link href="/register">Get Started in Minutes <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/for-experts">Apply as a Specialist</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
