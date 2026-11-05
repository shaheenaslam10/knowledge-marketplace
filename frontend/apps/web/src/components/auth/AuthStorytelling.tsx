"use client";

import { useState, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Lock,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  institution: string;
  avatar: string;
  discipline: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The milestone escrow and automated specialist matching connected me to a postdoctoral researcher who debugged my distributed Raft simulation in two targeted sessions. Phenomenal rigor.",
    author: "Tyler Vance",
    title: "Ph.D. Candidate in Distributed Systems",
    institution: "MIT CSAIL",
    avatar: "TV",
    discipline: "Computer Science",
  },
  {
    quote:
      "Escrow milestones give both student and specialist absolute certainty. The feedback on my econometric synthetic control model rivaled peer review at top tier journals.",
    author: "Elena Rostova",
    title: "M.Sc. Quantitative Economics",
    institution: "Oxford University",
    avatar: "ER",
    discipline: "Econometrics",
  },
  {
    quote:
      "As a specialist on the platform, the blind bidding and guaranteed payouts eliminate freelance anxiety. I only consult for serious learners who value deep conceptual mastery.",
    author: "Dr. Marcus Thorne",
    title: "Former Senior Research Fellow",
    institution: "Stanford AI Lab",
    avatar: "MT",
    discipline: "Machine Learning",
  },
];

export function AuthStorytelling() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = TESTIMONIALS[index];

  return (
    <div className="flex h-full flex-col justify-between p-10 lg:p-14">
      {/* Top Brand & Mission */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="size-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-foreground">
              Expert Marketplace
            </span>
            <span className="block text-[10px] font-bold tracking-widest text-primary uppercase">
              Academic & Technical Excellence
            </span>
          </div>
        </div>

        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-gradient">
            Where World-Class Academics Converge.
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Join over 250,000 students and verified PhD specialists collaborating on advanced research, algorithmic architecture, and quantitative problem solving.
          </p>
        </div>

        {/* Platform Stats Bar */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-border/80 bg-surface/80 p-3.5 backdrop-blur-md shadow-sm">
            <span className="block text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
              250K+
            </span>
            <span className="block text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">
              Tasks Completed
            </span>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface/80 p-3.5 backdrop-blur-md shadow-sm">
            <span className="block text-lg sm:text-xl font-extrabold text-emerald-500 tabular-nums">
              99.2%
            </span>
            <span className="block text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">
              On-Time Delivery
            </span>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface/80 p-3.5 backdrop-blur-md shadow-sm">
            <span className="block text-lg sm:text-xl font-extrabold text-primary tabular-nums">
              Top 3%
            </span>
            <span className="block text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">
              Vetted Experts
            </span>
          </div>
        </div>
      </div>

      {/* Center: Dynamic Carousel Quote Card */}
      <div className="my-8">
        <div className="relative rounded-2xl border border-border/80 bg-surface/70 p-6 backdrop-blur-xl shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Quote className="size-4" />
              <span>Verified Academic Review</span>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`size-2 rounded-full transition-all ${
                    index === i ? "bg-primary w-4" : "bg-border hover:bg-muted"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <p className="mt-3.5 text-xs sm:text-sm text-foreground/90 italic leading-relaxed min-h-[4.5rem]">
            &ldquo;{current.quote}&rdquo;
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary-soft font-bold text-xs text-primary">
                {current.avatar}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{current.author}</p>
                <p className="text-[10px] text-muted">
                  {current.title} · <strong className="text-foreground">{current.institution}</strong>
                </p>
              </div>
            </div>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-medium text-muted">
              {current.discipline}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: Trust & Security Standards Badges */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-3 py-2 text-[11px] text-muted backdrop-blur-sm">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-foreground">Escrow Milestone Protection</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-3 py-2 text-[11px] text-muted backdrop-blur-sm">
            <CheckCircle2 className="size-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Zero-Plagiarism Honor Code</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-3 py-2 text-[11px] text-muted backdrop-blur-sm">
            <Lock className="size-4 text-indigo-400 shrink-0" />
            <span className="font-medium text-foreground">FERPA & Privacy Compliant</span>
          </div>
        </div>

        {/* Live Active Pill */}
        <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium">
              <strong className="text-foreground">1,420 specialists</strong> online & available for requests
            </span>
          </div>
          <span className="text-[11px]">Milestone Security v2.4</span>
        </div>
      </div>
    </div>
  );
}

