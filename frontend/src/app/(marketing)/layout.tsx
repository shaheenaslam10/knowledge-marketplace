import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { SiteHeader } from "@/components/nav/SiteHeader";

/** 
 * Wide-Viewport Marketplace Shell (max-w-7xl, dark-mode-first, glassmorphic rhythm)
 * Benchmarked against Maven, Linear, and Intro.co
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors selection:bg-primary/20 selection:text-primary">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      {/* 4-Column Directory Marketplace Footer with Newsletter */}
      <footer className="border-t border-border/80 bg-surface/50 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Top Newsletter & Brand Banner */}
          <div className="mb-14 rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-2/40 to-background p-8 sm:p-10 shadow-lg">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-2 lg:col-span-7">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  <span>The Knowledge Dispatch</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Stay ahead with curated technical masterclasses
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-lg leading-relaxed">
                  Join 45,000+ researchers, students, and engineers receiving weekly deep-dives on system design, distributed AI, and quantitative modeling.
                </p>
              </div>
              <div className="lg:col-span-5">
                <form action="#" className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-border bg-surface-2/80 py-2.5 pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/25 hover:bg-primary-strong transition-colors shrink-0"
                  >
                    Subscribe <ArrowRight className="size-3.5 ml-1" />
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-muted">No spam. Unsubscribe anytime with 1-click.</p>
              </div>
            </div>
          </div>

          {/* 4-Column Directory Grid */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {/* Col 1: Brand & Identity */}
            <div className="space-y-4 col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight text-foreground">Knowledge Marketplace</span>
                  <span className="text-[10px] font-medium tracking-wider text-muted">ELITE MENTORSHIP</span>
                </div>
              </Link>
              <p className="text-xs text-muted leading-relaxed">
                The high-fidelity knowledge exchange connecting ambitious learners with verified doctoral scholars and senior industry architects.
              </p>
              <div className="flex items-center gap-3 text-muted">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors p-1" aria-label="GitHub">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors p-1" aria-label="Twitter">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors p-1" aria-label="LinkedIn">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Marketplace Discovery */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Marketplace</h4>
              <ul className="space-y-2 text-xs text-muted">
                <li><Link href="/experts" className="hover:text-foreground transition-colors">Explore All Experts</Link></li>
                <li><Link href="/subjects" className="hover:text-foreground transition-colors">Specialized Disciplines</Link></li>
                <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Transparent Pricing</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">About Our Platform</Link></li>
              </ul>
            </div>

            {/* Col 3: For Mentors / Specialists */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">For Mentors</h4>
              <ul className="space-y-2 text-xs text-muted">
                <li>
                  <Link href="/for-experts" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                    <span>Become a Mentor</span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">85% Split</span>
                  </Link>
                </li>
                <li><Link href="/register/expert" className="hover:text-foreground transition-colors">Specialist Application</Link></li>
                <li><Link href="/for-experts#earnings" className="hover:text-foreground transition-colors">Earnings Calculator</Link></li>
                <li><Link href="/for-experts#faq" className="hover:text-foreground transition-colors">Mentor Standards &amp; FAQ</Link></li>
              </ul>
            </div>

            {/* Col 4: Trust, Security & Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Integrity &amp; Trust</h4>
              <ul className="space-y-2 text-xs text-muted">
                <li>
                  <Link href="/academic-integrity" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                    <span>Academic Integrity</span>
                  </Link>
                </li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><span className="text-[11px] text-muted">Double-Entry Ledger Escrow</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-[11px] text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} Hybrid Expert Marketplace, Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <span>·</span>
              <Link href="/academic-integrity" className="hover:text-foreground">Honor Code</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}