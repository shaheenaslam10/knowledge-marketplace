"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import type { ApplicationStatus } from "@/features/experts/types";
import { useSession } from "@/features/auth/SessionProvider";

/**
 * Account home (Phase 2 placeholder + Phase 3 role-aware next steps):
 * shows the student onboarding and expert-application state, per ADR-0012's
 * separation of student onboarding vs the expert pipeline vs admin (admin
 * management stays in Django admin — there is no public admin flow).
 */
export default function AccountPage() {
  const { user } = useSession();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    expertsApi
      .myApplication()
      .then((data) => {
        if (!cancelled) setApplicationStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) setApplicationStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student profile</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Self-service — set your display name and learning interests.
          </p>
          <Link href="/onboarding/student" className="mt-3 inline-block text-sm underline" data-testid="link-onboarding">
            Open onboarding
          </Link>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Expert application</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {applicationStatus
              ? APPLICATION_STATUS_COPY[applicationStatus].title
              : "Apply with credentials; every application is reviewed by our team."}
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <Link href="/expert/application" className="underline" data-testid="link-application-status">
              Status
            </Link>
            <Link href="/expert/apply" className="underline" data-testid="link-apply">
              Apply as expert
            </Link>
          </div>
        </Card>
      </div>

      {user.roles.expert && (
        <Card>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Expert workspace <Badge tone="success">Approved</Badge>
          </p>
          <Link href="/expert/profile" className="mt-3 inline-block text-sm underline">
            Edit expert profile
          </Link>
        </Card>
      )}
    </div>
  );
}
