import { SiteHeader } from "@/components/nav/SiteHeader";
import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Hybrid Expert Marketplace ·{" "}
        <Link href="/how-it-works" className="hover:underline">
          How it works
        </Link>
      </footer>
    </div>
  );
}
