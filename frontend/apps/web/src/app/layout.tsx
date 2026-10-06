import type { Metadata } from "next";
import { headers } from "next/headers";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
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
  await headers();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}