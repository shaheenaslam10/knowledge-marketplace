"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { requestsApi } from "@/features/requests/api";
import { REQUEST_STATUS_COPY, REQUEST_STATUS_TONE, type ServiceRequest } from "@/features/requests/types";

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestsApi.list().then((r) => setRequests(r.results)).catch(() => setError("Could not load your requests."));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
        <Button asChild>
          <Link href="/requests/new">New request</Link>
        </Button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!requests && !error && <Skeleton className="h-32 w-full" />}
      {requests && requests.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">No requests yet. Describe the help you need and let experts come to you.</p>
        </Card>
      )}
      <div className="grid gap-4">
        {requests?.map((req) => (
          <Card key={req.id} className="transition-transform hover:-translate-y-0.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold tracking-tight">{req.title || "Untitled draft"}</h2>
                  <Badge tone={REQUEST_STATUS_TONE[req.status]}>{REQUEST_STATUS_COPY[req.status]}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{req.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {req.subject?.name ?? "No subject"} · {req.offer_count} offer{req.offer_count === 1 ? "" : "s"}
                  {req.budget_max_display != null && ` · up to ${req.budget_max_display} ${req.currency}`}
                </p>
              </div>
              <Button variant="secondary" asChild>
                <Link href={`/requests/${req.id}`}>Open</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
