"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/features/auth/SessionProvider";

/**
 * Role-aware navigation shell (Phase 2 foundation — not a dashboard).
 * Shows auth actions for guests; user identity + primary role + logout for
 * authenticated users. Role-specific links land with their phases.
 */
export function SiteHeader() {
  const { user, status, logout } = useSession();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Hybrid Expert Marketplace
        </Link>

        {status === "loading" ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" data-testid="nav-loading" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <Link href="/account" className="text-sm font-medium text-slate-700 hover:underline dark:text-slate-300">
              {user.name}
            </Link>
            <PrimaryRoleBadge roles={user.roles} />
            <Button variant="secondary" onClick={() => void logout()} data-testid="nav-logout">
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Sign up</Button>
            </Link>
          </div>
        )}
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
