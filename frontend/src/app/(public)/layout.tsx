import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Hybrid Expert Marketplace
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/how-it-works" className="hover:text-slate-900 dark:hover:text-white">
              How it works
            </Link>
            <Link
              href="https://github.com/shaheenaslam10/knowledge-marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Docs
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Phase 1 — project foundation · Open Marketplace + Managed Service
      </footer>
    </div>
  );
}
