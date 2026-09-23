import type { Metadata } from "next";
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
