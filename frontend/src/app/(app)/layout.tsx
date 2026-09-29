"use client";

import { Menu, Sparkles, GraduationCap, Zap, Search, LogOut, User, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
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
 * Marketplace app shell (app.<domain>) — polished/productive. ONE application
 * for students and experts: navigation is role-aware, the shell is shared
 * (docs/architecture/web-experiences.md). UX guard only — the API is the
 * security boundary.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [roleMode, setRoleMode] = useState<"student" | "expert">("student");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/account");
    }
  }, [status, router]);

  // Sync mode with route if navigating to expert surfaces
  useEffect(() => {
    if (
      pathname.startsWith("/opportunities") ||
      pathname.startsWith("/assignments") ||
      pathname.startsWith("/expert") ||
      pathname.startsWith("/offers")
    ) {
      setRoleMode("expert");
    } else if (pathname.startsWith("/requests") || pathname.startsWith("/orders")) {
      setRoleMode("student");
    }
  }, [pathname]);

  // The API is unreachable (rate-limited, restarting, offline)
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
    { href: "/requests", label: "Learning Dashboard" },
    { href: "/requests/new", label: "New Task Brief" },
    { href: "/orders", label: "My Orders" },
    { href: "/messages", label: "Messages" },
    { href: "/account", label: "Account" },
  ];

  const expertNav = [
    { href: "/opportunities", label: "Opportunity Feed" },
    { href: "/assignments", label: "Managed Assignments" },
    { href: "/orders", label: "Active Orders" },
    { href: "/expert/reviews", label: "Reviews & Ratings" },
    { href: "/expert/profile", label: "Specialist Cockpit" },
    { href: "/messages", label: "Messages" },
    { href: "/account", label: "Account" },
  ];

  const nav = roleMode === "expert" ? expertNav : studentNav;
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <NotificationsProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="size-4" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">Marketplace</span>
                  <span className="hidden text-[10px] font-semibold text-primary tracking-wider uppercase sm:inline-block">
                    {roleMode === "student" ? "Student Workspace" : "Specialist Workspace"}
                  </span>
                </div>
              </Link>

              {/* Mode Switcher Pill */}
              <div className="hidden sm:flex items-center p-0.5 rounded-full border border-border/70 bg-surface-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode("student");
                    router.push("/requests");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition-all ${
                    roleMode === "student"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="size-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode("expert");
                    router.push("/opportunities");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition-all ${
                    roleMode === "expert"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Zap className="size-3.5" />
                  <span>Specialist</span>
                </button>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                    active(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Utilities */}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <NotificationBell />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Account menu" className="h-8 gap-2 px-2 text-xs font-semibold">
                    <div className="size-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                      {user?.name?.charAt(0) ?? "U"}
                    </div>
                    <span className="hidden sm:inline-block max-w-[120px] truncate">{user?.name ?? user?.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-bold text-xs text-foreground">{user?.name}</p>
                    <p className="text-[11px] text-muted truncate">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/account")}>Account Settings</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push(roleMode === "student" ? "/requests" : "/opportunities")}>
                    Switch to {roleMode === "student" ? "Specialist Mode" : "Student Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={async () => {
                      await logout();
                      router.push("/");
                    }}
                    className="text-danger focus:bg-danger/10"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-xs p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <span className="font-bold text-sm text-foreground">Workspace Menu</span>
                  </div>

                  {/* Mobile Role Switcher */}
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-1 border border-border/80 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleMode("student");
                        router.push("/requests");
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
                        roleMode === "student"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <GraduationCap className="size-4" />
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleMode("expert");
                        router.push("/opportunities");
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
                        roleMode === "expert"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <Zap className="size-4" />
                      <span>Specialist</span>
                    </button>
                  </div>

                  {/* Nav Links */}
                  <nav className="flex flex-col gap-1.5" aria-label="Mobile">
                    {nav.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                            active(item.href)
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-muted hover:bg-surface-2 hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>

                  <div className="pt-4 border-t border-border space-y-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="w-full text-xs text-danger hover:bg-danger/10 justify-start px-3 font-semibold"
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{notificationShell}</main>
      </div>
    </NotificationsProvider>
  );
}
