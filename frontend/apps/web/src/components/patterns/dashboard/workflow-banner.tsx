"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  FolderOpen,
  GraduationCap,
  Layers,
  MessageSquare,
  PackageCheck,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  href: string;
  step: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBorder: string;
  badgeTone: string;
  activeMatch: (pathname: string) => boolean;
}

const STUDENT_WORKFLOW: WorkflowStep[] = [
  {
    href: "/requests/new",
    step: "01",
    title: "Post New Brief",
    subtitle: "AI Scope Copilot structures milestones & budget",
    badge: "AI Scoped",
    icon: PlusCircle,
    accentBorder: "border-l-4 border-l-indigo-500",
    badgeTone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    activeMatch: (p) => p === "/requests/new",
  },
  {
    href: "/requests",
    step: "02",
    title: "Proposals & Bids",
    subtitle: "Compare blind specialist offers or auto-dispatch",
    badge: "Blind Bids",
    icon: MessageSquare,
    accentBorder: "border-l-4 border-l-cyan-500",
    badgeTone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    activeMatch: (p) => p === "/requests",
  },
  {
    href: "/orders",
    step: "03",
    title: "Active Workspaces",
    subtitle: "WebRTC live coaching, deliverables & revisions",
    badge: "Milestone Escrow",
    icon: PackageCheck,
    accentBorder: "border-l-4 border-l-emerald-500",
    badgeTone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    activeMatch: (p) => p.startsWith("/orders"),
  },
  {
    href: "/vault",
    step: "04",
    title: "Knowledge Vault",
    subtitle: "Permanent storage for study packs & tax invoices",
    badge: "Lifetime Library",
    icon: FolderOpen,
    accentBorder: "border-l-4 border-l-violet-500",
    badgeTone: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    activeMatch: (p) => p === "/vault",
  },
];

const SPECIALIST_WORKFLOW: WorkflowStep[] = [
  {
    href: "/opportunities",
    step: "01",
    title: "Opportunity Radar",
    subtitle: "Browse open RFPs and submit blind milestone proposals",
    badge: "Open RFPs",
    icon: Zap,
    accentBorder: "border-l-4 border-l-emerald-500",
    badgeTone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    activeMatch: (p) => p === "/opportunities",
  },
  {
    href: "/assignments",
    step: "02",
    title: "Managed Tasks",
    subtitle: "Hands-off concierge assignments matched to your profile",
    badge: "Live Dispatch",
    icon: Layers,
    accentBorder: "border-l-4 border-l-cyan-500",
    badgeTone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    activeMatch: (p) => p === "/assignments",
  },
  {
    href: "/orders",
    step: "03",
    title: "Active Orders",
    subtitle: "Live code scratchpad, WebRTC studio & milestone deliveries",
    badge: "In Progress",
    icon: PackageCheck,
    accentBorder: "border-l-4 border-l-indigo-500",
    badgeTone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    activeMatch: (p) => p.startsWith("/orders"),
  },
  {
    href: "/expert/earnings",
    step: "04",
    title: "Earnings & Payouts",
    subtitle: "85% net take-home, ledger balance & 72h clearing",
    badge: "85% Net Take-Home",
    icon: DollarSign,
    accentBorder: "border-l-4 border-l-amber-500",
    badgeTone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    activeMatch: (p) => p === "/expert/earnings",
  },
];

export function DashboardOrientationBanner({ roleMode }: { roleMode: "student" | "expert" }) {
  const pathname = usePathname();
  const items = roleMode === "student" ? STUDENT_WORKFLOW : SPECIALIST_WORKFLOW;

  return (
    <div className="mb-8 rounded-2xl border border-border/80 bg-surface/90 p-4 sm:p-5 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex size-7 items-center justify-center rounded-lg font-bold text-xs text-white",
            roleMode === "student" ? "bg-indigo-600" : "bg-emerald-600"
          )}>
            {roleMode === "student" ? <GraduationCap className="size-4" /> : <Zap className="size-4" />}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {roleMode === "student" ? "Student Workflow & Progress Center" : "Specialist Operational Pipeline"}
            </span>
            <p className="text-[11px] text-muted">
              {roleMode === "student"
                ? "Milestone-protected consultation cycle: Brief → Blind Bids → WebRTC Studio → Lifetime Vault"
                : "Continuous delivery cycle: Radar → Concierge Dispatch → Execution Studio → 85% Payout Clearing"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold font-mono">
            ● Escrow Guard Active
          </span>
        </div>
      </div>

      {/* 4 Clickable Workflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {items.map((item) => {
          const isCurrent = item.activeMatch(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative rounded-xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                item.accentBorder,
                isCurrent
                  ? "ring-2 ring-primary/40 bg-surface-2/80 shadow-sm"
                  : "border-border/80 hover:border-border"
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-mono text-[10px] font-extrabold text-muted">
                  STEP {item.step}
                </span>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", item.badgeTone)}>
                  {item.badge}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-transform group-hover:scale-105",
                  item.badgeTone
                )}>
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={cn(
                    "text-xs font-bold leading-tight truncate transition-colors",
                    isCurrent ? "text-primary" : "text-foreground group-hover:text-primary"
                  )}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-muted leading-snug line-clamp-2 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

