import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthStorytelling } from "@/components/auth/AuthStorytelling";

/**
 * High-Converting Split-Screen Auth Layout (Studybay / Linear / Stripe caliber)
 * - Left (50% desktop): Dynamic value proposition, stats, verified quotes carousel, and security badges.
 * - Right (50% desktop): Crisp glassmorphic card container with ThemeToggle and return navigation.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      {/* LEFT COLUMN: Brand, Social Proof & Academic Trust (Visible on desktop >= 1024px) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border/80 bg-gradient-to-br from-surface via-surface-2/40 to-background lg:flex">
        {/* Ambient Glows & Tech Grid */}
        <div className="bg-tech-grid absolute inset-0 opacity-35 pointer-events-none" />
        <div className="bg-radial-glow absolute -top-40 -left-40 size-[550px] pointer-events-none opacity-50" />
        <div className="bg-radial-glow absolute -bottom-40 -right-40 size-[550px] pointer-events-none opacity-40" />

        {/* Dynamic Storytelling with Carousel */}
        <div className="relative z-10 h-full">
          <AuthStorytelling />
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Form Surface */}
      <div className="flex w-full flex-col justify-between px-4 py-8 sm:px-8 lg:w-1/2 lg:px-16 xl:px-20">
        {/* Top Utility Header */}
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <span className="text-sm">Expert Marketplace</span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Main Centered Form Container */}
        <div className="mx-auto my-auto w-full max-w-lg py-8">
          {children}
        </div>

        {/* Bottom Mobile Security Reassurance */}
        <div className="text-center text-xs text-muted lg:hidden">
          Protected by Bank-Grade Milestone Escrow · <Link href="/academic-integrity" className="underline hover:text-foreground">Academic Honor Code</Link>
        </div>
      </div>
    </div>
  );
}

