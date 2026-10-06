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
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  PackageCheck,
  MessageSquare,
  User,
  Layers,
  Star,
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
 * Features an Elite Collapsible Sidebar Shell, Slim Top Utility Bar,
 * Escrow Telemetry, Professional Dual-Role Persona Architecture, and Balanced Canvas.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [roleMode, setRoleMode] = useState<"student" | "expert">("student");
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Read stored role preference and sidebar collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hem_role_mode");
      if (stored === "EXPERT") {
        setRoleMode("expert");
      } else if (stored === "STUDENT") {
        setRoleMode("student");
      }

      const storedCollapsed = localStorage.getItem("hem_sidebar_collapsed");
      if (storedCollapsed === "true") {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hem_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/account");
    }
  }, [status, router]);

  // Sync mode with route if navigating to role-specific surfaces
  // Whitelist /expert/apply and /expert/application so student mode remains active without loop
  useEffect(() => {
    if (
      pathname.startsWith("/opportunities") ||
      pathname.startsWith("/assignments") ||
      (pathname.startsWith("/expert") &&
        !pathname.startsWith("/expert/apply") &&
        !pathname.startsWith("/expert/application")) ||
      pathname.startsWith("/offers")
    ) {
      setRoleMode("expert");
      try {
        localStorage.setItem("hem_role_mode", "EXPERT");
        document.cookie = "hem_role_mode=EXPERT; path=/; max-age=31536000; SameSite=Lax";
      } catch {}
    } else if (
      pathname.startsWith("/requests") ||
      pathname.startsWith("/expert/apply") ||
      pathname.startsWith("/expert/application")
    ) {
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
  const studentNav = [
    { href: "/requests", label: "Learning Dashboard", icon: GraduationCap },
    { href: "/requests/new", label: "New Task Brief", icon: PlusCircle },
    { href: "/orders", label: "Active Orders", icon: PackageCheck },
    { href: "/messages", label: "Direct Messages", icon: MessageSquare },
    { href: "/account", label: "Account Settings", icon: User },
  ];

  const expertNav = [
    { href: "/opportunities", label: "Opportunity Radar", icon: Zap },
    { href: "/assignments", label: "Managed Tasks", icon: Layers },
    { href: "/orders", label: "Active Orders", icon: PackageCheck },
    { href: "/expert/reviews", label: "Reviews & Ratings", icon: Star },
    { href: isExpertUser ? "/expert/profile" : "/expert/apply", label: "Specialist Cockpit", icon: ShieldCheck },
    { href: "/messages", label: "Direct Messages", icon: MessageSquare },
    { href: "/account", label: "Account Settings", icon: User },
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
      <div className="flex min-h-screen bg-background text-foreground transition-colors">
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

        {/* 1. Desktop Elite Collapsible Sidebar Shell */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col border-r border-border/70 bg-card/95 backdrop-blur-md transition-all duration-300",
            collapsed ? "w-20" : "w-64",
          )}
        >
          {/* Top: Brand Logo & Workspace Badge */}
          <div className="flex h-16 sm:h-20 items-center justify-between px-4 border-b border-border/60">
            <Link href="/" className="flex items-center gap-3 font-bold tracking-tight group overflow-hidden">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 text-white font-black shadow-md shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
                <Sparkles className="size-5" aria-hidden />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                      HYBRID
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-muted tracking-wider uppercase truncate">
                    Knowledge Exchange
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>

          {/* Active Workspace Status Badge */}
          <div className="px-3 pt-3">
            {roleMode === "student" ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold transition-all",
                  collapsed ? "justify-center p-2 text-xs" : "px-3 py-2 text-xs",
                )}
                title="Student Workspace"
              >
                <GraduationCap className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                {!collapsed && <span>Student Workspace</span>}
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold transition-all",
                  collapsed ? "justify-center p-2 text-xs" : "px-3 py-2 text-xs",
                )}
                title="Specialist Hub"
              >
                <Zap className="size-4 shrink-0 text-amber-500" />
                {!collapsed && <span>Specialist Hub</span>}
              </div>
            )}
          </div>

          {/* Middle Nav: Vertical List */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5" aria-label="Main Navigation">
            {nav.map((item) => {
              const isActive = active(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-xs font-bold transition-all duration-150",
                    collapsed ? "justify-center p-2.5" : "px-3.5 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.01]"
                      : "text-muted hover:text-foreground hover:bg-surface-2",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Footer Section */}
          <div className="p-3 border-t border-border/60 space-y-2.5 bg-surface-1/40">
            {/* Persona Switcher / Specialist Onboarding Link */}
            {isExpertUser ? (
              <button
                type="button"
                onClick={roleMode === "student" ? handleSwitchToExpert : handleSwitchToStudent}
                className={cn(
                  "w-full flex items-center gap-2 rounded-xl border border-border/80 bg-surface-1 hover:bg-surface-2 text-xs font-semibold text-foreground transition-all shadow-xs hover:border-primary/40 group",
                  collapsed ? "justify-center p-2" : "px-3 py-2 justify-between",
                )}
                title={roleMode === "student" ? "Switch to Specialist View" : "Switch to Student View"}
                data-testid="button-role-toggle"
              >
                {roleMode === "student" ? (
                  <>
                    {!collapsed && <span>Specialist View</span>}
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold group-hover:scale-110 transition-transform">
                      ⚡
                    </span>
                  </>
                ) : (
                  <>
                    {!collapsed && <span>Student View</span>}
                    <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-bold group-hover:scale-110 transition-transform">
                      🎓
                    </span>
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/expert/apply"
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border/80 bg-surface-1 hover:bg-surface-2 text-xs font-semibold text-muted hover:text-foreground transition-all shadow-xs group",
                  collapsed ? "justify-center p-2" : "px-3 py-2 justify-between",
                )}
                title="Apply as Specialist"
              >
                {!collapsed && <span>Apply as Specialist</span>}
                <span className="text-amber-500 font-bold group-hover:scale-110 transition-transform">
                  ⚡
                </span>
              </Link>
            )}

            {/* Wallet / Escrow Capsule */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold shadow-xs",
                collapsed ? "justify-center p-2" : "px-3 py-2",
              )}
              title="Escrow: $0.00 Active"
            >
              <span className="size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full text-[11px]">
                  <span className="font-sans text-muted uppercase font-bold tracking-wider">Escrow:</span>
                  <span>$0.00 Active</span>
                </div>
              )}
            </div>

            {/* User Profile Card Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-xl border border-border/80 bg-surface-1 hover:bg-surface-2 transition-all shrink-0 text-left focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs group",
                    collapsed ? "justify-center p-1.5" : "p-2",
                  )}
                  aria-label="User account menu"
                >
                  <div className="relative shrink-0">
                    <div className="size-8 rounded-full p-0.5 bg-gradient-to-tr from-violet-600 via-primary to-indigo-600 shadow-sm">
                      <div className="size-full rounded-full bg-surface flex items-center justify-center text-xs font-black text-primary">
                        {userInitial}
                      </div>
                    </div>
                    <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-foreground truncate block leading-none">
                          {user?.name ?? user?.email?.split("@")[0]}
                        </span>
                        <CheckCircle2 className="size-3 text-primary shrink-0" />
                      </div>
                      <span className="text-[10px] font-medium text-muted block leading-none mt-1 truncate">
                        {userRoleTag}
                      </span>
                    </div>
                  )}
                  {!collapsed && (
                    <ChevronDown className="size-3.5 text-muted group-hover:text-foreground transition-transform duration-200" />
                  )}
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
                {isExpertUser ? (
                  <DropdownMenuItem
                    onSelect={() => (roleMode === "student" ? handleSwitchToExpert() : handleSwitchToStudent())}
                    className="text-xs font-semibold cursor-pointer rounded-xl flex items-center justify-between"
                  >
                    <span>Switch to {roleMode === "student" ? "Specialist View" : "Student View"}</span>
                    <span>{roleMode === "student" ? "⚡" : "🎓"}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => router.push("/expert/apply")}
                    className="text-xs font-semibold cursor-pointer rounded-xl flex items-center justify-between text-primary font-bold"
                  >
                    <span>Apply as Specialist</span>
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
          </div>
        </aside>

        {/* 2. Main Area: Slim Top Utility Bar + Balanced Content Canvas */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 min-w-0",
            collapsed ? "lg:pl-20" : "lg:pl-64",
          )}
        >
          {/* Slim Top Utility Bar */}
          <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b border-border/60 bg-background/85 px-4 sm:px-6 backdrop-blur-md transition-colors">
            {/* Left: Mobile Drawer Trigger + Workspace Breadcrumb */}
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Trigger (Sheet) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden size-9 rounded-xl" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black shadow-xs">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <span className="font-black text-sm text-foreground">HYBRID PRO</span>
                      <span className="text-[10px] block text-muted uppercase font-bold tracking-wider">
                        {roleMode === "student" ? "Student Learning" : "Specialist Hub"}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Role Switcher */}
                  {isExpertUser ? (
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
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface-2 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Zap className="size-4 text-warning" />
                        <span>Specialist Candidate</span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Earn 85% net take-home on verified academic briefs.
                      </p>
                      <Link
                        href="/expert/apply"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Apply as Specialist →</span>
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
                    {nav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                              active(item.href)
                                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                : "text-muted hover:bg-surface-2 hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>

                  <div className="pt-4 border-t border-border space-y-2">
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

              {/* Mobile Brand Title */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black shadow-xs">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="text-sm font-black bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  HYBRID PRO
                </span>
              </div>

              {/* Desktop Workspace Breadcrumb */}
              <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-muted">
                <span className="font-semibold text-foreground">Workspace</span>
                <span>/</span>
                <span className="text-foreground font-bold">
                  {roleMode === "student" ? "Student Learning Hub" : "Specialist Cockpit"}
                </span>
                <span className="text-muted">•</span>
                <span className="text-[11px] text-muted">
                  {roleMode === "student" ? "Milestone Protected" : "85% Payout Active"}
                </span>
              </div>
            </div>

            {/* Right: Search Cmd+K Trigger, Escrow Pill, ThemeToggle, NotificationBell */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Cmd+K Search Trigger Pill */}
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-surface-1 hover:bg-surface-2 text-xs text-muted hover:text-foreground transition-all shadow-xs group"
                title="Search Workspace (⌘K)"
              >
                <Search className="size-3.5 text-muted group-hover:text-primary transition-colors" />
                <span className="hidden sm:inline text-xs">Search...</span>
                <kbd className="hidden sm:inline-block font-mono text-[10px] font-bold bg-surface-2 group-hover:bg-surface-3 px-1.5 py-0.5 rounded border border-border/70 text-muted">
                  ⌘K
                </kbd>
              </button>

              {/* Top Escrow Telemetry Badge (Desktop only) */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Escrow Safe</span>
              </div>

              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          {/* 3. Balanced Asymmetric Content Canvas Container */}
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {notificationShell}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
