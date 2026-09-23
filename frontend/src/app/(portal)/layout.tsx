import Link from "next/link";

/** Operations portal shell (admin.<domain>) — dense, minimal, no marketing chrome. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-4 px-4">
          <Link href="/portal" className="text-sm font-semibold tracking-tight">
            Operations Portal
          </Link>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">staff only</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
