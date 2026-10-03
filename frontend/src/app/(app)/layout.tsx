"use client";

import {
  Menu,
  Sparkles,
  GraduationCap,
  Zap,
  Search,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSession } from "@/features/auth/SessionProvider";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { NotificationToasts } from "@/features/notifications/NotificationToasts";
import { NotificationsProvider } from "@/features/notifications/NotificationsProvider";
import { cn } from "@/lib/utils";

/**
 * High-Energy Next-Gen EdTech Workspace Shell.
 * Features an Elite Glassmorphic Floating Header, Interactive Pill Navigation,
 * Escrow Custody Telemetry, Professional Dual-Role Persona Architecture, and a Full-Bleed Fluid Canvas.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [roleMode, setRoleMode] = useState<"student" | "expert">("student");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Read stored role preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hem_role_mode");
      if (stored === "EXPERT") {
        setRoleMode("expert");
      } else if (stored === "STUDENT") {
        setRoleMode("student");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/account");
    }
  }, [status, router]);

  // Sync mode with route if navigating to role-specific surfaces
  useEffect(() => {
    if (
      pathname.startsWith("/opportunities") ||
      pathname.startsWith("/assignments") ||
      pathname.startsWith("/expert") ||
      pathname.startsWith("/offers")
    ) {
      setRoleMode("expert");
      try {
        localStorage.setItem("hem_role_mode", "EXPERT");
        document.cookie = "hem_role_mode=EXPERT; path=/; max-age=31536000; SameSite=Lax";
      } catch {}
    } else if (pathname.startsWith("/requests")) {
      setRoleMode("student");
      try {
        localStorage.setItem("hem_role_mode", "STUDENT");
        document.cookie = "hem_role_mode=STUDENT; path=/; max-age=31536000; SameSite=Lax";
      } catch {}
    }
  }, [pathname]);

  // Global Cmd+K / Ctrl+K listener
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

  const isExpertUser = Boolean(user?.roles?.expert);

  const handleSwitchToStudent = () => {
    setRoleMode("student");
    try {
      localStorage.setItem("hem_role_mode", "STUDENT");
      document.cookie = "hem_role_mode=STUDENT; path=/; max-age=31536000; SameSite=Lax";
    } catch {}
    router.push("/requests");
  };

  const handleSwitchToExpert = () => {
    setRoleMode("expert");
    try {
      localStorage.setItem("hem_role_mode", "EXPERT");
      document.cookie = "hem_role_mode=EXPERT; path=/; max-age=31536000; SameSite=Lax";
    } catch {}
    if (isExpertUser) {
      router.push("/opportunities");
    } else {
      router.push("/expert/apply");
    }
  };

  // The API is unreachable
  if (status === "unreachable") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center" data-testid="session-unreachable">
          <h1 className="text-lg font-semibold">We can&apos;t reach the server</h1>
          <p className="text-sm text-muted">
            Your session is probably fine — the connection is not. Check your network and try again.
          </p>
          <Button onClick={() => void refresh()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md animate-pulse space-y-3" data-testid="protected-loading">
          <div className="h-6 w-1/2 rounded bg-surface-2" />
          <div className="h-24 rounded-lg bg-surface-2" />
        </div>
      </div>
    );
  }

  const notificationShell = (
    <>
      <NotificationToasts />
      {children}
    </>
  );

  // Student vs Expert dynamic navigation
  // In Student View: ONLY Student links
  const studentNav = [
    { href: "/requests", label: "Learning Dashboard" },
    { href: "/requests/new", label: "New Task Brief" },
    { href: "/orders", label: "My Orders" },
    { href: "/messages", label: "Messages" },
  ];

  // In Specialist View: ONLY Specialist links
  const expertNav = [
    { href: "/opportunities", label: "Opportunity Radar" },
    { href: "/assignments", label: "Managed Tasks" },
    { href: "/orders", label: "Active Orders" },
    { href: "/expert/reviews", label: "Reviews" },
    { href: isExpertUser ? "/expert/profile" : "/expert/apply", label: "Specialist Cockpit" },
    { href: "/messages", label: "Messages" },
  ];

  const nav = roleMode === "expert" ? expertNav : studentNav;

  // Strict route matching:
  // - "/requests" matches strictly on pathname === "/requests"
  // - "/requests/new" matches strictly on pathname === "/requests/new"
  // - "/expert/apply" matches /expert/apply or /expert/application
  // - "/expert/profile" matches /expert/profile
  // - other routes match exact or sub-route prefix
  const active = (href: string) => {
    if (href === "/requests") {
      return pathname === "/requests";
    }
    if (href === "/requests/new") {
      return pathname === "/requests/new";
    }
    if (href === "/expert/apply") {
      return pathname.startsWith("/expert/apply") || pathname.startsWith("/expert/application");
    }
    if (href === "/expert/profile") {
      return pathname.startsWith("/expert/profile");
    }
    return pathname === href || (pathname.startsWith(`${href}/`) && href !== "/requests");
  };

  // Quick navigation items for Cmd+K palette
  const quickCommands = [
    { label: "Learning Dashboard", href: "/requests", category: "Student" },
    { label: "New Task Brief", href: "/requests/new", category: "Student" },
    { label: "My Orders", href: "/orders", category: "Workspace" },
    { label: "Messages & Chat", href: "/messages", category: "Workspace" },
    { label: "Account Settings", href: "/account", category: "Account" },
    { label: "Opportunity Radar", href: "/opportunities", category: "Specialist" },
    { label: "Managed Tasks", href: "/assignments", category: "Specialist" },
    { label: "Specialist Cockpit", href: "/expert/profile", category: "Specialist" },
    { label: "Reviews & Ratings", href: "/expert/reviews", category: "Specialist" },
    { label: "Public Marketplace", href: "/", category: "General" },
  ];

  const filteredCommands = quickCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "S";
  const userRoleTag =
    roleMode === "student"
      ? "Scholar • Level 2"
      : isExpertUser
        ? "Specialist • Verified"
        : "Specialist • Candidate";

  return (
    <NotificationsProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
        {/* Global Cmd+K Command Palette Modal */}
        {cmdOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-md animate-in fade-in"
            onClick={() => setCmdOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search workspace, tasks, orders, specialists... (Esc to close)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-surface-1 border border-border/80 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 block">
                  Quick Actions & Navigation
                </span>
                {filteredCommands.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      setCmdOpen(false);
                      router.push(item.href);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl hover:bg-surface-2 text-foreground font-semibold transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border">
                        {item.category}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-muted font-mono">{item.href}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1. Elite Glassmorphic Floating Header */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md transition-colors">
          <div className="mx-auto flex h-16 sm:h-20 w-full max-w-[1720px] items-center justify-between gap-4 px-6 lg:px-10">
            {/* ZONE A (Left: Clean Brand Identity) */}
            <div className="flex items-center gap-3.5 shrink-0">
              <Link href="/" className="flex items-center gap-3 font-bold tracking-tight group">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 text-white font-black shadow-md shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                      HYBRID
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
                      PRO
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-bold text-muted tracking-wider uppercase">
                    Knowledge Exchange
                  </span>
                </div>
              </Link>
            </div>

            {/* ZONE B (Center: Interactive Pill Navigation & Quick Search) */}
            <div className="hidden lg:flex items-center justify-center gap-3 flex-1 max-w-2xl mx-4">
              {/* Interactive Pill Navigation Bar with Bubble Highlights */}
              <nav
                className="flex items-center p-1 rounded-full bg-surface-2/90 border border-border/80 shadow-xs gap-0.5 backdrop-blur-sm"
                aria-label="Workspace Navigation"
              >
                {nav.map((item) => {
                  const isActive = active(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]"
                          : "text-muted hover:text-foreground hover:bg-surface-3/80",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Global Search Trigger Bar */}
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-full border border-border/80 bg-surface-1 hover:bg-surface-2 text-xs text-muted hover:text-foreground transition-all shadow-xs group shrink-0"
                title="Search Workspace (⌘K)"
              >
                <div className="flex items-center gap-2">
                  <Search className="size-3.5 text-muted group-hover:text-primary transition-colors" />
                  <span className="hidden xl:inline text-xs">Search...</span>
                </div>
                <kbd className="font-mono text-[10px] font-bold bg-surface-2 group-hover:bg-surface-3 px-1.5 py-0.5 rounded border border-border/70 text-muted">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* ZONE C (Right: Persona Switcher, Financial Capsule, Theme, Notifications & Profile) */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Universal Dual-Role Persona Switcher (Airbnb / Upwork Model) */}
              <button
                type="button"
                onClick={roleMode === "student" ? handleSwitchToExpert : handleSwitchToStudent}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-surface-1 hover:bg-surface-2 text-xs font-semibold text-foreground transition-all shadow-xs hover:border-primary/40 group"
                title={roleMode === "student" ? "Switch to Specialist View" : "Switch to Student View"}
                data-testid="button-role-toggle"
              >
                {roleMode === "student" ? (
                  <>
                    <span>Specialist View</span>
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold group-hover:scale-110 transition-transform">
                      ⚡
                    </span>
                  </>
                ) : (
                  <>
                    <span>Student View</span>
                    <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-bold group-hover:scale-110 transition-transform">
                      🎓
                    </span>
                  </>
                )}
              </button>

              {/* Wallet / Escrow Capsule */}
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold shadow-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-sans text-[11px] text-muted uppercase font-bold tracking-wider">
                  Escrow:
                </span>
                <span>$0.00 Active</span>
              </div>

              <ThemeToggle />
              <NotificationBell />

              {/* Premium User Profile Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-full border border-border/80 bg-surface-1 hover:bg-surface-2 transition-all shrink-0 text-left focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs group"
                    aria-label="User account menu"
                  >
                    <div className="relative">
                      <div className="size-8 rounded-full p-0.5 bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 shadow-sm">
                        <div className="size-full rounded-full bg-surface flex items-center justify-center text-xs font-black text-primary">
                          {userInitial}
                        </div>
                      </div>
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-foreground truncate max-w-[110px] block leading-none">
                          {user?.name ?? user?.email?.split("@")[0]}
                        </span>
                        <CheckCircle2 className="size-3 text-primary shrink-0" />
                      </div>
                      <span className="text-[10px] font-medium text-muted block leading-none mt-1">
                        {userRoleTag}
                      </span>
                    </div>
                    <ChevronDown className="size-3.5 text-muted group-hover:text-foreground transition-transform duration-200 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border-border/80">
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="font-bold text-xs text-foreground">{user?.name}</p>
                    <p className="text-[11px] text-muted truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {userRoleTag}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/account")} className="text-xs font-semibold cursor-pointer rounded-xl">
                    Account & Preferences
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => (roleMode === "student" ? handleSwitchToExpert() : handleSwitchToStudent())}
                    className="text-xs font-semibold cursor-pointer rounded-xl flex items-center justify-between"
                  >
                    <span>Switch to {roleMode === "student" ? "Specialist View" : "Student View"}</span>
                    <span>{roleMode === "student" ? "⚡" : "🎓"}</span>
                  </DropdownMenuItem>
                  {!isExpertUser && (
                    <DropdownMenuItem
                      onSelect={() => router.push("/expert/apply")}
                      className="text-xs font-semibold cursor-pointer rounded-xl flex items-center justify-between text-primary font-bold"
                    >
                      <span>Complete Specialist Application</span>
                      <span className="text-amber-500">⚡</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={async () => {
                      await logout();
                      router.push("/");
                    }}
                    className="text-xs font-semibold text-danger focus:bg-danger/10 cursor-pointer rounded-xl"
                  >
                    <LogOut className="size-3.5 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Drawer Trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden size-9 rounded-full" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-xs p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <span className="font-bold text-sm text-foreground">Workspace Menu</span>
                  </div>

                  {/* Mobile Role Switcher (Universal for all authenticated users) */}
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-2 border border-border/80 text-xs">
                    <button
                      type="button"
                      onClick={handleSwitchToStudent}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition-all ${
                        roleMode === "student"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <GraduationCap className="size-4" />
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToExpert}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition-all ${
                        roleMode === "expert"
                          ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <Zap className="size-4" />
                      <span>Specialist</span>
                    </button>
                  </div>

                  {!isExpertUser && (
                    <div className="rounded-2xl border border-border bg-surface-2 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Zap className="size-4 text-warning" />
                        <span>Specialist Candidate</span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Earn on academic bounties with 85% net take-home earnings on every completed brief.
                      </p>
                      <Link
                        href="/expert/apply"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Complete Specialist Application →</span>
                      </Link>
                    </div>
                  )}

                  {/* Mobile Search Button */}
                  <button
                    type="button"
                    onClick={() => setCmdOpen(true)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-surface-1 text-xs text-muted"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="size-4 text-muted" />
                      <span>Search Workspace...</span>
                    </span>
                    <kbd className="font-mono text-[10px] bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                      ⌘K
                    </kbd>
                  </button>

                  {/* Mobile Nav Links */}
                  <nav className="flex flex-col gap-1.5" aria-label="Mobile">
                    {nav.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                            active(item.href)
                              ? "bg-primary text-primary-foreground font-bold shadow-sm"
                              : "text-muted hover:bg-surface-2 hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>

                  <div className="pt-4 border-t border-border space-y-3">
                    <SheetClose asChild>
                      <Link
                        href="/account"
                        className="block rounded-xl px-4 py-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-2"
                      >
                        Account & Preferences
                      </Link>
                    </SheetClose>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="w-full text-xs text-danger hover:bg-danger/10 justify-start px-3 font-semibold rounded-xl"
                    >
                      <LogOut className="size-3.5 mr-2" />
                      Log out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* 2. Fluid High-Energy SaaS Canvas Container */}
        <main className="mx-auto w-full max-w-[1720px] flex-1 px-6 sm:px-8 lg:px-10 py-8 sm:py-10 space-y-8 sm:space-y-10">
          {notificationShell}
        </main>
      </div>
    </NotificationsProvider>
  );
}
