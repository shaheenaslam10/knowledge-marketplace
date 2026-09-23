import Link from "next/link";

import { SiteHeader } from "@/components/nav/SiteHeader";

/** Marketing shell (www) — editorial, generous rhythm; dark hero sections allowed. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted sm:flex-row sm:px-6">
          <p>Hybrid Expert Marketplace — intelligent learning, human experts.</p>
          <nav className="flex gap-4">
            <Link href="/experts" className="hover:text-foreground">Find an expert</Link>
            <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
            <Link href="/register" className="hover:text-foreground">Become an expert</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
