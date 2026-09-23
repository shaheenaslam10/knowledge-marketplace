"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/features/auth/SessionProvider";

/**
 * Account placeholder (Phase 2 scope stops at the auth foundation — full
 * student/expert dashboards arrive with their phases). Proves the protected
 * layout + role-aware surface.
 */
export default function AccountPage() {
  const { user } = useSession();
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Signed in as <span data-testid="account-email">{user.email}</span>
        </p>
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Name</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{user.name}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Email verified</dt>
          <dd data-testid="account-verified">
            {user.roles.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="danger">Unverified</Badge>}
          </dd>
          <dt className="text-slate-500 dark:text-slate-400">Timezone</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.timezone}</dd>
        </dl>
      </Card>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Student &amp; expert workspaces land in Phases 3–6 (roadmap: docs/process/roadmap-phases.md).
      </p>
    </div>
  );
}
