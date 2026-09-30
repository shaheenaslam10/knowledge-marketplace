"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  SendHorizontal,
  UserCheck,
  Scale,
  ShieldAlert,
  Landmark,
  Users,
  FileText,
  Sliders,
  Search,
  ExternalLink,
  Shield,
  Activity,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Command,
  LogOut,
  Loader2,
} from "lucide-react";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/SessionProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: "info" | "warning" | "danger" | "success" | "neutral";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OPERATIONAL TRIAGE",
    items: [
      { href: "/portal", label: "Operations Overview", icon: LayoutDashboard },
      { href: "/portal/dispatch", label: "Managed Dispatch", icon: SendHorizontal, badge: "Live Match", badgeTone: "info" },
      { href: "/portal/experts", label: "Verification Desk", icon: UserCheck, badge: "Pending", badgeTone: "warning" },
    ],
  },
  {
    title: "DISPUTES & GOVERNANCE",
    items: [
      { href: "/portal/disputes", label: "Dispute Tribunal", icon: Scale },
      { href: "/portal/moderation", label: "Content Moderation", icon: ShieldAlert },
    ],
  },
  {
    title: "TREASURY & AUDIT",
    items: [
      { href: "/portal/finance", label: "Escrow & Financials", icon: Landmark },
      { href: "/portal/users", label: "User Directory", icon: Users },
      { href: "/portal/audit", label: "Audit Event Log", icon: FileText },
      { href: "/portal/config", label: "System Parameters", icon: Sliders },
    ],
  },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [status, pathname, router]);

  // Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. Loading Skeleton View
  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden lg:flex w-64 flex-col border-r border-border/80 bg-surface p-4 space-y-4">
          <div className="flex items-center gap-2.5 h-10">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-xl" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
          </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/80 bg-surface flex items-center justify-between px-6">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          </header>
          <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Redirecting View
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted">Redirecting to Operations Sign-In...</p>
        </div>
      </div>
    );
  }

  // 3. Permission Gate: User must have admin, staff, or support roles
  const isAuthorized = Boolean(user?.roles?.admin || user?.roles?.staff || user?.roles?.support);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
        <div className="max-w-md w-full rounded-3xl border border-danger/30 bg-surface p-8 text-center space-y-4 shadow-2xl">
          <div className="size-12 rounded-2xl bg-danger-soft text-danger flex items-center justify-center mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Operations Access Restricted</h2>
          <p className="text-xs text-muted leading-relaxed">
            Authenticated as <span className="font-mono text-foreground font-semibold">{user?.email}</span>,
            but this account does not possess operations or staff privileges.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Sign Out & Switch Account
            </Button>
            <a
              href="http://localhost:3000"
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              Go to Marketplace
            </a>
          </div>
        </div>
      </div>
    );
  }

  const allNavItems = NAV_SECTIONS.flatMap((s) => s.items);
  const filteredCommands = allNavItems.filter((i) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const userInitial = (user?.name?.[0] || user?.email?.[0] || "A").toUpperCase();
  const roleLabel = user?.roles?.admin ? "SUPERUSER" : user?.roles?.staff ? "STAFF" : "SUPPORT";

  async function handleLogout() {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("hm_access_token");
      } catch {}
    }
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* 1. Global Command Palette Modal */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <input
                autoFocus
                type="text"
                placeholder="Search portal screens, users, orders, disputes... (Esc to close)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-surface-1 border border-border/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 block">
                Quick Navigation
              </span>
              {filteredCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setCmdOpen(false);
                      router.push(item.href);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-surface-2 text-foreground font-medium transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 text-primary" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-muted font-mono">{item.href}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* 2. Left High-Density Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border/80 bg-surface flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/70">
          <Link href="/portal" className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-sm">
              Ω
            </div>
            <div>
              <span className="font-extrabold text-xs tracking-tight text-foreground block">
                HYBRID PLATFORM
              </span>
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">
                Operations Desk
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-muted hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick Search Shortcut */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-border/70 bg-surface-1 text-muted hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="size-3.5" />
              <span>Search Portal...</span>
            </div>
            <kbd className="font-mono text-[10px] bg-surface-2 px-1.5 py-0.5 rounded border border-border/60">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Portal Navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase px-2 mb-1.5">
                {section.title}
              </h3>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`size-4 transition-colors ${
                          isActive ? "text-primary-foreground" : "text-muted group-hover:text-primary"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-surface-3 text-muted group-hover:text-foreground"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: System Status, Public Link & Sign Out */}
        <div className="p-3 border-t border-border/70 space-y-2 bg-surface-1/50">
          <div className="flex items-center justify-between px-2 text-[11px] text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Django API Live
            </span>
            <span className="font-mono text-[10px]">8ms</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-2 text-xs text-muted hover:text-foreground transition-colors"
            >
              <span className="truncate">Marketplace</span>
              <ExternalLink className="size-3 text-muted shrink-0" />
            </a>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg border border-border/60 bg-surface hover:bg-danger-soft hover:text-danger text-muted transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Operational Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Executive Header */}
        <header className="h-14 border-b border-border/80 bg-surface flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-muted hover:text-foreground p-1"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <Badge tone="info" className="text-[10px] uppercase font-mono tracking-widest font-bold">
                OPERATIONS CONSOLE
              </Badge>
              <span className="hidden sm:inline-block text-xs text-muted">·</span>
              <span className="hidden sm:inline-block text-xs text-muted font-medium">
                Production Cluster (US-East)
              </span>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            {/* System Health Indicators */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full border border-border/60 bg-surface-1 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Escrow Custody OK
              </span>
              <span className="text-border">|</span>
              <span className="text-muted font-mono text-[11px]">PG Latency: 12ms</span>
            </div>

            <ThemeToggle />

            {/* Admin User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/60">
              <div className="size-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-foreground block leading-none truncate max-w-[120px]">
                  {user?.name || "Platform Admin"}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                  {roleLabel}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 text-muted hover:text-danger p-1 rounded transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
