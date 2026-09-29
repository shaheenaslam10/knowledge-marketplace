"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import { canSubmitApplication, type ApplicationStatus } from "@/features/experts/types";

/** Expert application status — the applicant's own lifecycle view (ADR-0012). */
export default function ExpertApplicationStatusPage() {
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [resubmissions, setResubmissions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    expertsApi
      .myApplication()
      .then((data) => {
        if (cancelled) return;
        setStatus(data.status);
        setRejectionReason(data.application?.rejection_reason ?? null);
        setResubmissions(data.application?.resubmission_count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your application status.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (status === null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" data-testid="application-loading" />
      </div>
    );
  }

  const copy = APPLICATION_STATUS_COPY[status];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Expert application</h1>

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100" data-testid="application-status-title">
              {copy.title}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.detail}</p>
          </div>
          <Badge tone={copy.tone}>{status.replace("_", " ")}</Badge>
        </div>

        {rejectionReason && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            Reviewer note: {rejectionReason}
          </p>
        )}
        {resubmissions > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Resubmissions: {resubmissions}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {status === "not_applied" && (
            <Link href="/expert/apply">
              <Button data-testid="apply-cta">Start an application</Button>
            </Link>
          )}
          {canSubmitApplication(status) && (
            <>
              <Link href="/expert/apply">
                <Button variant="secondary">{status === "rejected" ? "Update & resubmit" : "Continue draft"}</Button>
              </Link>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const result = await expertsApi.submitApplication();
                    setStatus(result.status);
                  } catch {
                    setError("Could not submit — complete the required fields first.");
                  }
                }}
              >
                Submit for review
              </Button>
            </>
          )}
          {status === "approved" && (
            <Link href="/expert/profile">
              <Button>Edit your expert profile</Button>
            </Link>
          )}
        </div>
      </Card>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Lifecycle: draft → submitted → under review → approved / rejected (→ resubmit) · approved ⇄ suspended. Every
        decision is recorded and emailed.
      </p>
    </div>
  );
}
