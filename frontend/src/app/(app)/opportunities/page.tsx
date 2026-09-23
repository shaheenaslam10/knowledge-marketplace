"use client";

/** Expert opportunity feed — eligible open requests, simple server-side filters. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { feedApi } from "@/features/requests/api";
import { REQUEST_CATEGORIES, type ServiceRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api/client";

export default function OpportunitiesPage() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async (params: Record<string, string>) => {
    setError(null);
    try {
      const page = await feedApi.list(params);
      setRequests(page.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the feed.");
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    load({});
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="mt-1 text-sm text-muted">Open requests from students. One binding offer per request (BR-15).</p>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load({ ...(q ? { q } : {}), ...(category ? { category } : {}) });
        }}
      >
        <Input className="max-w-xs" placeholder="Search title or description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All types</option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!requests && !error && <Skeleton className="h-32 w-full" />}
      {requests?.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">No open requests match right now. New requests appear automatically.</p>
        </Card>
      )}
      <div className="grid gap-4">
        {requests?.map((req) => (
          <Card key={req.id} className="transition-transform hover:-translate-y-0.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold tracking-tight">{req.title}</h2>
                  {req.bidding?.my_offer_status && (
                    <Badge tone={req.bidding.my_offer_status === "pending" ? "info" : "neutral"}>
                      You offered
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{req.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {req.subject?.name ?? "No subject"} · {req.offer_count} offer{req.offer_count === 1 ? "" : "s"}
                  {req.budget_max_display != null && ` · budget up to ${req.budget_max_display} ${req.currency}`}
                  {req.deadline != null && ` · needed by ${req.deadline}`}
                </p>
              </div>
              <Button variant="secondary" asChild>
                <Link href={`/opportunities/${req.id}`}>View & offer</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
