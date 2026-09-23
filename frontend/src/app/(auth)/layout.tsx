import Link from "next/link";

/**
 * Auth route-group layout: centered card shell for login / register /
 * verify-email / reset-password surfaces.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center text-sm font-bold text-slate-900 dark:text-slate-100">
          Hybrid Expert Marketplace
        </Link>
        {children}
      </div>
    </div>
  );
}
