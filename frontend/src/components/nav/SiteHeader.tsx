"use client";

import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/SessionProvider";

const NAV_LINKS = [
  { href: "/experts", label: "Find an Expert" },
  { href: "/subjects", label: "Disciplines" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/for-experts", label: "For Specialists" },
];

export function SiteHeader() {
  const { user, status, logout } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.01]">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              Expert Marketplace
            </span>
            <span className="hidden text-[10px] font-medium tracking-wider text-muted sm:inline-block">
              INTELLIGENT LEARNING
            </span>
          </div>
        </Link>

        {/* Center navigation for desktop */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
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
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {user.name}
              </Link>
              <PrimaryRoleBadge roles={user.roles} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void logout()}
                data-testid="nav-logout"
              >
                Log out
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Navigation Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-bold text-sm tracking-tight text-foreground">Navigation</span>
              </div>

              <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
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
                          Sign in
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/register">
                        <Button variant="primary" size="sm" className="w-full text-xs">
                          Get started
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
