import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Cookie-auth session state for client components (the cookie itself
            is httpOnly — /api/v1/me is the source of truth). */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
