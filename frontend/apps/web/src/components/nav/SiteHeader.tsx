"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, ArrowRight, Search, FolderOpen, Layers, DollarSign, UserCheck, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/SessionProvider";

export function SiteHeader() {
  const { user, status, logout } = useSession();
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Illuminated Icon */}
        <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.01] shrink-0">
          <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary-strong text-white shadow-md shadow-primary/30 ring-1 ring-white/20">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              Knowledge<span className="text-primary">Marketplace</span>
            </span>
            <span className="hidden text-[9px] font-bold tracking-widest text-muted sm:inline-block uppercase">
              Linear &middot; Stripe &middot; Maven Caliber
            </span>
          </div>
        </Link>

        {/* Global Omnibox Search Trigger (Cmd+K) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="hidden md:flex items-center gap-2 rounded-xl border border-border/80 bg-surface-1/70 px-3 py-1.5 text-xs text-muted hover:border-primary/50 hover:bg-surface-2 transition-all shadow-sm max-w-xs w-full lg:max-w-sm"
          aria-label="Search specialists, catalog and commands"
          data-testid="navbar-command-trigger"
        >
          <Search className="size-3.5 text-primary shrink-0" />
          <span className="font-medium truncate">Search specialists, catalog, topics...</span>
          <kbd className="ml-auto rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Center navigation for desktop with glowing active pills */}
        <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Main navigation">
          <Link
            href="/experts"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              isLinkActive("/experts")
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <UserCheck className="size-3.5" />
            <span>Specialists</span>
          </Link>
          <Link
            href="/catalog"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              isLinkActive("/catalog")
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>Catalog &amp; Cohorts</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-300">
              Live
            </span>
          </Link>
          <Link
            href="/vault"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              isLinkActive("/vault")
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <FolderOpen className="size-3.5" />
            <span>Vault</span>
          </Link>
          <Link
            href="/orders"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              isLinkActive("/orders")
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Layers className="size-3.5" />
            <span>Orders</span>
          </Link>
          {user?.roles.expert && (
            <Link
              href="/expert/earnings"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                isLinkActive("/expert/earnings")
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <DollarSign className="size-3.5 text-emerald-400" />
              <span>Earnings</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-500">
                85%
              </span>
            </Link>
          )}
          <Link
            href="/pricing"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isLinkActive("/pricing")
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Pricing
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />

          {status === "loading" ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-2" data-testid="nav-loading" />
          ) : user ? (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href={user.roles.staff ? "/portal" : "/account"}
                className="text-xs font-bold text-foreground transition-colors hover:text-primary"
              >
                {user.name}
              </Link>
              <PrimaryRoleBadge roles={user.roles} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void logout()}
                data-testid="nav-logout"
                className="text-xs h-8"
              >
                Log out
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs font-semibold h-9 px-3">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="glow" size="sm" className="text-xs font-bold h-9 px-4 shadow-lg shadow-primary/25">
                  Get Started <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Navigation Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-bold text-sm tracking-tight text-foreground">Navigation</span>
              </div>

              <div className="pb-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                  className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-surface-2 px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-4 text-primary" />
                    <span>Search Omnibox</span>
                  </span>
                  <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </button>
              </div>

              <nav className="flex flex-col gap-1.5" aria-label="Mobile navigation">
                <SheetClose asChild>
                  <Link
                    href="/experts"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Specialists Directory
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/catalog"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
                  >
                    <span>Knowledge Catalog</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">S4</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/vault"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
                  >
                    <span>Knowledge Vault</span>
                    <span className="text-[10px] font-bold text-primary">Library</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/orders"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Active Orders
                  </Link>
                </SheetClose>
                {user?.roles.expert && (
                  <SheetClose asChild>
                    <Link
                      href="/expert/earnings"
                      className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
                    >
                      <span>Specialist Earnings</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">85%</span>
                    </Link>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Link
                    href="/pricing"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Pricing
                  </Link>
                </SheetClose>
              </nav>

              <div className="pt-4 border-t border-border space-y-3">
                {user ? (
                  <div className="space-y-3">
                    <div className="px-3 py-2 bg-surface-1 rounded-xl">
                      <p className="font-bold text-xs text-foreground">{user.name}</p>
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    </div>
                    <SheetClose asChild>
                      <Link href="/account" className="block w-full">
                        <Button variant="secondary" size="sm" className="w-full text-xs">
                          My Account
                        </Button>
                      </Link>
                    </SheetClose>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void logout()}
                      className="w-full text-xs text-danger hover:bg-danger/10"
                    >
                      Log out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Link href="/login">
                        <Button variant="secondary" size="sm" className="w-full text-xs">
                          Sign In
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/register">
                        <Button variant="glow" size="sm" className="w-full text-xs font-bold">
                          Get Started
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function PrimaryRoleBadge({ roles }: { roles: { staff: boolean; support: boolean; admin: boolean } }) {
  if (roles.admin) return <Badge tone="danger">Admin</Badge>;
  if (roles.support) return <Badge tone="info">Support</Badge>;
  if (roles.staff) return <Badge tone="neutral">Staff</Badge>;
  return null;
}
