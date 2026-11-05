"use client";

import { Cpu, Terminal, Sparkles, Binary, Database, Layers, Network, Globe } from "lucide-react";

const PARTNERS = [
  { name: "Stanford AI Lab", tag: "Research Partner", icon: Sparkles },
  { name: "MIT CSAIL", tag: "Robotics & Systems", icon: Cpu },
  { name: "DeepMind", tag: "Reinforcement Learning", icon: Binary },
  { name: "OpenAI", tag: "LLM & Reasoning", icon: Network },
  { name: "Google Brain", tag: "Distributed Systems", icon: Layers },
  { name: "Meta FAIR", tag: "Computer Vision", icon: Globe },
  { name: "Stripe", tag: "Financial Infrastructure", icon: Database },
  { name: "Oxford University", tag: "Econometric Science", icon: Terminal },
];

export function PartnerMarquee() {
  return (
    <div className="relative w-full overflow-hidden border-y border-border/60 bg-surface/40 py-6 backdrop-blur-md">
      {/* Edge Gradient Fades */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />

      <div className="flex items-center gap-4">
        <span className="shrink-0 pl-6 text-[10px] font-bold uppercase tracking-widest text-muted hidden md:inline-block">
          Trusted By Scholars &amp; Engineers From
        </span>

        <div className="flex overflow-hidden">
          <div className="animate-marquee flex items-center gap-8 pr-8">
            {[...PARTNERS, ...PARTNERS].map((partner, idx) => (
              <div
                key={`${partner.name}-${idx}`}
                className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/60 bg-surface-2/40 px-3.5 py-1.5 transition-colors hover:border-primary/40 hover:bg-surface-2"
              >
                <partner.icon className="size-3.5 text-primary" />
                <span className="text-xs font-bold tracking-tight text-foreground">{partner.name}</span>
                <span className="hidden sm:inline-block text-[10px] text-muted font-normal">• {partner.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
