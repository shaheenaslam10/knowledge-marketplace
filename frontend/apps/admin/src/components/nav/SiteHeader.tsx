"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSession } from "@/features/auth/SessionProvider";

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

        {/* Center navigation */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <Link href="/experts" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
            Find an Expert
          </Link>
          <Link href="/subjects" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
            Disciplines
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
            How it Works
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/for-experts" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
            For Specialists
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {status === "loading" ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-2" data-testid="nav-loading" />
          ) : user ? (
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
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

