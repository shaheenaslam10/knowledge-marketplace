import type { Metadata } from "next";
import { headers } from "next/headers";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Operations Console · Hybrid Expert Marketplace",
    template: "%s · Operations Console",
  },
  description: "Executive control plane and operations portal for platform owners and staff.",
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  await headers();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
