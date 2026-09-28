import type { Metadata } from "next";
import { headers } from "next/headers";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hybrid Expert Marketplace",
    template: "%s · Hybrid Expert Marketplace",
  },
  description:
    "Get help from vetted experts: post a request and receive offers, or let the platform assign the right expert for you.",
  metadataBase: new URL(SITE_URL),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Opt every route into dynamic rendering. This is REQUIRED by the enforced
  // nonce CSP (ADR-0017): a statically prerendered page is built without a
  // request, so Next cannot stamp the per-request nonce onto its bootstrap /
  // hydration scripts. Under `script-src 'self' 'nonce-<n>' 'strict-dynamic'`
  // 'self' is ignored, so every un-nonced chunk is refused and the page ships
  // with NO JavaScript at all — forms fall back to native GETs and nothing
  // hydrates. Reading a request header here is the single central switch that
  // keeps the HTML and the policy in agreement on every route.
  await headers();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        {/* Cookie-auth session state for client components (the cookie itself
            is httpOnly — /api/v1/me is the source of truth). */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}