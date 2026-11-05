"use client";

import { Sparkles, ShieldCheck } from "lucide-react";
import { RequestForm } from "@/features/requests/RequestForm";

export default function NewRequestPage() {
  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-card via-card to-primary-soft/20 p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 size-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" />
                <span>AI-Assisted Task Creator</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" />
                <span>100% Escrow Protection</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Create Academic Task Brief
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Define your academic objectives, choose between Open Bidding or Managed Placement, and let vetted doctoral specialists solve your blockers.
            </p>
          </div>
        </div>
      </div>

      <RequestForm />
    </div>
  );
}

