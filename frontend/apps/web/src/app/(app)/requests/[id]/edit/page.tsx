"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { requestsApi } from "@/features/requests/api";
import { RequestForm } from "@/features/requests/RequestForm";
import type { ServiceRequest } from "@/features/requests/types";

export default function EditRequestPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    requestsApi.detail(params.id).then(setRequest).catch(() => setError(true));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit draft</h1>
      {error && <Card><p className="text-sm text-danger">Request not found (drafts are editable only by their owner).</p></Card>}
      {!request && !error && <Card className="animate-pulse h-64" />}
      {request && <RequestForm existing={request} />}
    </div>
  );
}
