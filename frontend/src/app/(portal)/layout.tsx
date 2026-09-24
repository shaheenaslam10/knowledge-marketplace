import Link from "next/link";

/** Operations portal shell (admin.<domain>) — dense, minimal, no marketing
 * chrome. Client-side staff gate is UX only; every /ops API is staff-checked
 * server-side (the frontend is never the authorization layer). */
const NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/moderation", label: "Moderation" },
  { href: "/portal/disputes", label: "Disputes" },
  { href: "/portal/finance", label: "Reconciliation" },
  { href: "/portal/audit", label: "Audit" },
  { href: "/portal/users", label: "Users" },
  { href: "/portal/config", label: "Config" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-4 px-4">
          <Link href="/portal" className="text-sm font-semibold tracking-tight">
            Operations Portal
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Portal">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:bg-surface-2 hover:text-foreground rounded-md px-2 py-1 text-xs transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">staff only</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
