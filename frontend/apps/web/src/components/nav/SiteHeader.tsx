"use client";

import Link from "next/link";
import { Menu, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/SessionProvider";

export function SiteHeader() {
  const { user, status, logout } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Illuminated Icon */}
        <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]">
          <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-primary-strong text-white shadow-md shadow-primary/30 ring-1 ring-white/20">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              Knowledge<span className="text-primary">Marketplace</span>
            </span>
            <span className="hidden text-[9px] font-bold tracking-widest text-muted sm:inline-block uppercase">
              Maven &middot; Linear &middot; Intro Caliber
            </span>
          </div>
        </Link>

        {/* Center navigation for desktop */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          <Link
            href="/experts"
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            Explore Experts
          </Link>
          <Link
            href="/how-it-works"
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/subjects"
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground inline-flex items-center gap-1.5"
          >
            <span>Masterclasses</span>
            <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">New</span>
          </Link>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/for-experts"
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground inline-flex items-center gap-1.5"
          >
            <span>Become a Mentor</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Keep 85%
            </span>
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
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
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-bold text-sm tracking-tight text-foreground">Navigation</span>
              </div>

              <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                <SheetClose asChild>
                  <Link
                    href="/experts"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Explore Experts
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/how-it-works"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    How It Works
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/subjects"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
                  >
                    <span>Masterclasses</span>
                    <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">New</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/pricing"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    Pricing
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/for-experts"
                    className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
                  >
                    <span>Become a Mentor</span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">85% Split</span>
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
