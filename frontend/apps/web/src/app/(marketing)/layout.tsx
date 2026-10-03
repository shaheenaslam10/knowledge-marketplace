import Link from "next/link";

import { SiteHeader } from "@/components/nav/SiteHeader";

/** Marketing shell (www) — editorial, generous rhythm; dark hero sections allowed. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-xs text-muted sm:px-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p>Hybrid Expert Marketplace — intelligent learning, human experts.</p>
            <nav className="flex gap-4">
              <Link href="/experts" className="hover:text-foreground">Find an expert</Link>
              <Link href="/subjects" className="hover:text-foreground">Subjects</Link>
              <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              {/* Was /register — the expert pitch now has a page of its own,
                  so send prospective experts there rather than to a bare form. */}
              <Link href="/for-experts" className="hover:text-foreground">Become an expert</Link>
              <Link href="/about" className="hover:text-foreground">About</Link>
            </nav>
          </div>
          {/* Legal pages are a launch gate (Phase 12) — reachable from every marketing page. */}
          <nav aria-label="Legal" className="flex justify-center gap-4 border-t border-border pt-4 sm:justify-end">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/academic-integrity" className="hover:text-foreground">Academic Integrity</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}