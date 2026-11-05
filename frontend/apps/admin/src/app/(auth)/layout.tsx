import Link from "next/link";
import { Shield, Lock, Activity, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Badge } from "@/components/ui/Badge";

/**
 * Operations Console Auth Shell.
 * Executive cockpit aesthetic with high security reassurance, system telemetry, and theme toggle.
 */
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      {/* LEFT COLUMN: Operations Security & Control Plane Telemetry (Visible on desktop >= 1024px) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border/80 bg-gradient-to-br from-surface via-surface-2/40 to-background p-12 lg:flex">
        {/* Background Grids & Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black text-base shadow-sm">
              Ω
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-foreground block">
                HYBRID EXPERT MARKETPLACE
              </span>
              <span className="text-[11px] font-bold text-primary tracking-wider uppercase block">
                Executive Operations Control Plane
              </span>
            </div>
          </div>
        </div>

        {/* Middle Telemetry & Security Overview */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-3">
            <Badge tone="warning" className="text-[11px] font-mono uppercase tracking-wider">
              Restricted Operations Gateway
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Platform Governance & Custody Cockpit
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-md">
              Secure authentication gateway for platform owners, operations coordinators, and financial audit personnel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 max-w-md">
            <div className="p-3.5 rounded-2xl border border-border/80 bg-surface-1/80 backdrop-blur space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Escrow Custody
              </span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Protected & Synced
              </span>
            </div>
            <div className="p-3.5 rounded-2xl border border-border/80 bg-surface-1/80 backdrop-blur space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Audit Trail
              </span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-indigo-500" />
                Immutable Append-Only
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border/80 bg-surface-1/60 backdrop-blur space-y-2 max-w-md text-xs text-muted">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Lock className="size-3.5 text-primary" />
              <span>Zero-Trust Protocol Active</span>
            </div>
            <p className="leading-relaxed">
              All sessions are verified against role permission matrices with hardware-isolated signing cookies and JWT authorization tokens.
            </p>
          </div>
        </div>

        {/* Bottom Platform Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted pt-6 border-t border-border/60">
          <span className="font-mono text-[11px]">System Environment: Production (v2.4)</span>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <span>Public Marketplace</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Sign-in Surface */}
      <div className="flex w-full flex-col justify-between px-4 py-8 sm:px-8 lg:w-1/2 lg:px-16 xl:px-20">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
              Ω
            </div>
            <span className="font-extrabold text-xs tracking-tight text-foreground">
              Operations Desk
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <span>Marketplace</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Centered Form */}
        <div className="mx-auto my-auto w-full max-w-md py-8">
          {children}
        </div>

        {/* Footer Reassurance */}
        <div className="text-center text-xs text-muted">
          Operations Console · Internal Use Only · Unauthorized Access Strictly Prohibited
        </div>
      </div>
    </div>
  );
}
