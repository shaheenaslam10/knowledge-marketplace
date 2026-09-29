"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Zap, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { expertsApi } from "@/features/experts/api";
import { APPLICATION_STATUS_COPY } from "@/features/experts/status";
import type { ApplicationStatus } from "@/features/experts/types";
import { useSession } from "@/features/auth/SessionProvider";

/**
 * Account home (Phase 2 placeholder + Phase 3 role-aware next steps + Phase 5 persistent role routing):
 * Shows user profile, active workspace mode switcher, and onboarding/application states.
 */
export default function AccountPage() {
  const { user } = useSession();
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [currentMode, setCurrentMode] = useState<"student" | "expert">("student");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hem_role_mode");
      if (stored === "EXPERT") {
        setCurrentMode("expert");
      } else {
        setCurrentMode("student");
      }
    } catch {}
  }, []);

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

  const handleSwitchMode = (mode: "student" | "expert") => {
    setCurrentMode(mode);
    try {
      const modeKey = mode === "expert" ? "EXPERT" : "STUDENT";
      localStorage.setItem("hem_role_mode", modeKey);
      document.cookie = `hem_role_mode=${modeKey}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    if (mode === "expert") {
      router.push("/opportunities");
    } else {
      router.push("/requests");
    }
  };

  if (!user) return null;

  const isExpert = Boolean(user.roles.expert);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Your account</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as <span className="font-semibold text-foreground" data-testid="account-email">{user.email}</span>
        </p>
      </div>

      {/* Role Context & Active Workspace Control Card */}
      <Card className="border-primary/20 bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Active Workspace</span>
              {isExpert ? (
                <Badge tone="success" className="text-[10px]">Dual-Role Enabled</Badge>
              ) : (
                <Badge tone="neutral" className="text-[10px]">Student Access</Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">
              Currently navigating in:{" "}
              <strong className="text-primary font-bold">
                {currentMode === "student" ? "Student Workspace (/requests)" : "Specialist Workspace (/opportunities)"}
              </strong>
            </p>
          </div>

          {isExpert ? (
            <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleSwitchMode("student")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === "student"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <GraduationCap className="size-3.5" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("expert")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentMode === "expert"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Zap className="size-3.5" />
                <span>Specialist</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="secondary" className="text-xs">
                <Link href="/requests">Go to Learning Dashboard</Link>
              </Button>
            </div>
          )}
        </div>

        {!isExpert && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2/40 -mx-6 -mb-6 p-4 rounded-b-xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="size-3.5 text-warning" />
                <span>Become an Expert Specialist</span>
              </p>
              <p className="text-[11px] text-muted">
                Unlock the Opportunity Feed, live bidding calculators, and direct client consultations.
              </p>
            </div>
            <Button asChild size="sm" className="h-8 text-xs shrink-0">
              <Link href="/expert/apply">Apply for Specialist Vetting →</Link>
            </Button>
          </div>
        )}
      </Card>

      {/* Account Info Details */}
      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted">Name</dt>
          <dd className="font-semibold text-foreground">{user.name}</dd>
          <dt className="text-muted">Email verified</dt>
          <dd data-testid="account-verified">
            {user.roles.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="danger">Unverified</Badge>}
          </dd>
          <dt className="text-muted">Timezone</dt>
          <dd className="text-foreground font-mono text-xs">{user.timezone}</dd>
        </dl>
      </Card>

      {/* Orders Portal Shortcut */}
      <Card>
        <p className="text-sm font-semibold text-foreground">My orders</p>
        <p className="mt-1 text-sm text-muted">
          Every engagement — open marketplace, managed pool, or managed direct — from payment to completion.
        </p>
        <Link href="/orders" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" data-testid="link-orders">
          Open order workspace <ArrowRight className="size-3.5" />
        </Link>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-foreground">Student profile</p>
          <p className="mt-1 text-sm text-muted">
            Self-service — set your display name and learning interests.
          </p>
          <Link href="/onboarding/student" className="mt-3 inline-block text-sm font-medium text-primary underline" data-testid="link-onboarding">
            Open onboarding
          </Link>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-foreground">Expert application</p>
          <p className="mt-1 text-sm text-muted">
            {applicationStatus
              ? APPLICATION_STATUS_COPY[applicationStatus].title
              : "Apply with credentials; every application is reviewed by our team."}
          </p>
          <div className="mt-3 flex gap-4 text-sm font-medium">
            <Link href="/expert/application" className="text-primary underline" data-testid="link-application-status">
              Status
            </Link>
            <Link href="/expert/apply" className="text-primary underline" data-testid="link-apply">
              Apply as expert
            </Link>
          </div>
        </Card>
      </div>

      {user.roles.expert && (
        <Card>
          <p className="text-sm font-semibold text-foreground">
            Expert workspace <Badge tone="success">Approved</Badge>
          </p>
          <p className="mt-1 text-sm text-muted">
            Access your public profile, consultation rates, and student review portfolio.
          </p>
          <Link href="/expert/profile" className="mt-3 inline-block text-sm font-medium text-primary underline">
            Edit expert profile
          </Link>
        </Card>
      )}
    </div>
  );
}
