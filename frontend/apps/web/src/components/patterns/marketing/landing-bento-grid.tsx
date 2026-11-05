"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileCode,
  GraduationCap,
  Layers,
  Lock,
  MessageSquare,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function LandingBentoGrid() {
  return (
    <section className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
          <Sparkles className="size-3.5" />
          <span>The Four Pillars of Market Domination</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          Architected For Rigorous Problem Solving
        </h2>
        <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          Unlike generic freelance boards or one-way video platforms, our platform unifies structured task scoping, zero-latency 1:1 collaboration, peer-reviewed knowledge assets, and mathematical accounting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* ════════════════════════════════════════════════
            PILLAR 1: Open & Concierge Task Briefs (Indigo Accent - 7 cols)
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 group relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-card to-card p-6 sm:p-8 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Bot className="size-3.5" /> AI Scope Copilot &amp; Blind Bidding
              </span>
              <span className="text-xs font-mono font-bold text-muted">PILLAR 01</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Open RFPs or Hands-Off Concierge Dispatch
            </h3>

            <p className="text-sm text-muted leading-relaxed">
              Post an academic or technical challenge. Our AI Scope Copilot refines objectives, structures milestones, and recommends optimal budgets. Choose between <strong>competitive blind bidding</strong> from vetted scholars or instant <strong>automated concierge dispatch</strong>.
            </p>

            <ul className="grid sm:grid-cols-2 gap-2.5 text-xs text-foreground/90 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                <span>Zero-bias blind bidding algorithm</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                <span>SLA-guaranteed concierge matching</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                <span>Structured milestone scope breakdown</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                <span>Private &amp; NDA-compliant task briefs</span>
              </li>
            </ul>
          </div>

          {/* Interactive UI Mockup Preview */}
          <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-surface-2/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-foreground">Task: Distributed Raft Replication Fix</span>
              <Badge tone="info" className="text-[10px]">Managed Concierge</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>Budget: <strong className="text-foreground">$240.00</strong></span>
              <span>Turnaround: <strong className="text-foreground">48 Hours</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Matched: Dr. Elena R.</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Link href="/requests/new" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                Post A Task Brief With Scope Copilot <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            PILLAR 2: Instant 1:1 Speed-Booking & WebRTC Studio (Emerald Accent - 5 cols)
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 group relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-6 sm:p-8 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Video className="size-3.5" /> Speed-Booking &amp; Live Studio
              </span>
              <span className="text-xs font-mono font-bold text-muted">PILLAR 02</span>
            </div>

            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
              Skip The Queue: Instant 1:1 Live Coaching
            </h3>

            <p className="text-sm text-muted leading-relaxed">
              Need immediate unblocking? Speed-book 30m or 60m directly on any specialist&apos;s calendar. Join an in-browser WebRTC studio with dual HD video, low-latency audio, and a <strong>synchronized live code scratchpad</strong>.
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/70 border border-emerald-500/20">
                <span className="font-bold text-foreground">30-Min Rapid Debug</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">$35 – $60</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/70 border border-emerald-500/20">
                <span className="font-bold text-foreground">60-Min Deep Architecture</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">$70 – $120</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <Link href="/experts" className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 transition shadow-sm">
              <Zap className="size-3.5" /> Browse Specialists Available Now
            </Link>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            PILLAR 3: Self-Serve Catalog & Micro-Cohorts (Amber Accent - 5 cols)
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 group relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card p-6 sm:p-8 transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Package className="size-3.5" /> Self-Serve Assets &amp; Cohorts
              </span>
              <span className="text-xs font-mono font-bold text-muted">PILLAR 03</span>
            </div>

            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
              Knowledge Blueprints &amp; Live Workshops
            </h3>

            <p className="text-sm text-muted leading-relaxed">
              Unlock peer-reviewed study packages, algorithmic code blueprints, and research frameworks created by approved scholars. Join <strong>scheduled live micro-cohorts</strong> with capacity limit enforcement and real-time seat availability progress.
            </p>

            <div className="rounded-xl border border-amber-500/20 bg-surface-2/60 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-foreground">Production RAG Evaluation</span>
                <span className="text-amber-600 dark:text-amber-400">14 / 20 Booked</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[70%]" />
              </div>
              <p className="text-[10px] text-muted">Live 2-hour interactive workshop with Dr. Ayra K.</p>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <Link href="/catalog" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
              Explore Catalog &amp; Live Workshops <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            PILLAR 4: Double-Entry Escrow & Lifetime Vault (Violet/Rose Accent - 7 cols)
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 group relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-card to-card p-6 sm:p-8 transition-all duration-300 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                <Scale className="size-3.5" /> Mathematical Escrow &amp; Digital Vault
              </span>
              <span className="text-xs font-mono font-bold text-muted">PILLAR 04</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Zero-Sum Double-Entry Ledger &amp; Lifetime Vault
            </h3>

            <p className="text-sm text-muted leading-relaxed">
              Every financial event is audited by a cryptographic double-entry ledger: <code>Inflows == Outflows</code> with guaranteed zero float. Funds stay protected until you sign off. Deliverables, notes, and <strong>printable official tax invoices</strong> are stored permanently in your personal Vault.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="rounded-xl border border-border bg-surface-2/60 p-3">
                <span className="font-mono text-base font-bold text-foreground block">85%</span>
                <span className="text-[11px] text-muted">Specialist net payout (industry highest)</span>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/60 p-3">
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 block">72 Hours</span>
                <span className="text-[11px] text-muted">Inspection &amp; revision window</span>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/60 p-3">
                <span className="font-mono text-base font-bold text-violet-600 dark:text-violet-400 block">100% Tax</span>
                <span className="text-[11px] text-muted">Printable institutional receipts</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2 flex items-center justify-between">
            <Link href="/vault" className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
              Open Student Knowledge Vault <ArrowRight className="size-3" />
            </Link>
            <Link href="/dispute-policy" className="text-xs text-muted hover:text-foreground">
              Dispute Policy →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

