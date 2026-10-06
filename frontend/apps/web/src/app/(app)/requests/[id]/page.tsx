"use client";

/** Request detail (owner view): lifecycle, attachments, offers, selection. */
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { selectionApi } from "@/features/offers/api";
import { OFFER_STATUS_COPY, OFFER_STATUS_TONE, type Offer } from "@/features/offers/types";
import { MessageThreadButton } from "@/features/messaging/MessageThreadButton";
import { requestsApi } from "@/features/requests/api";
import {
  REQUEST_STATUS_COPY,
  REQUEST_STATUS_TONE,
  canAcceptOffers,
  isDraftEditable,
  type ServiceRequest,
} from "@/features/requests/types";
import { ApiError } from "@/lib/api/client";

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyOffer, setBusyOffer] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await requestsApi.detail(params.id);
      setRequest(detail);
      if (detail.student_view) {
        const page = await selectionApi.listForRequest(params.id);
        setOffers(page.results);
      }
    } catch {
      setError("Request not found or not accessible.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, offerId: string) {
    setBusyOffer(offerId);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyOffer(null);
    }
  }

  if (error && !request) {
    return <Card><p className="text-sm text-danger">{error}</p></Card>;
  }
  if (!request) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
            <Badge tone={REQUEST_STATUS_TONE[request.status]}>{REQUEST_STATUS_COPY[request.status]}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {request.subject?.name ?? "No subject"} · {request.pricing_type}
            {request.budget_max_display != null && ` · budget up to ${request.budget_max_display} ${request.currency}`}
            {request.deadline != null && ` · deadline ${request.deadline}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraftEditable(request.status) && (
            <Button variant="secondary" onClick={() => router.push(`/requests/${request.id}/edit`)}>
              Edit draft
            </Button>
          )}
          {canAcceptOffers(request.status) && (
            <Button variant="ghost" onClick={() => act(() => requestsApi.cancel(request.id), request.id)}>
              Cancel request
            </Button>
          )}
        </div>
      </div>

      {request.mode === "managed" && request.student_view && (
        <Card className="border-primary/30 bg-primary-soft/40">
          <p className="text-sm">
            <span className="font-semibold">Managed service.</span>{" "}
            {request.status === "in_review" && "Our team is reviewing your request — typically within 24 hours. You will see the agreed price here before anything is charged."}
            {request.status === "pooled" && "Approved — we are matching you with a suitable expert from our vetted pool."}
            {request.status === "matched" && "An expert accepted your managed request — the order and payment step is next."}
          </p>
        </Card>
      )}

      <Card>
        <p className="whitespace-pre-wrap text-sm">{request.description}</p>
        {request.attachments.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted">
            {request.attachments.map((a) => (
              <li key={a.id}>📎 {a.original_name} ({Math.round(a.size / 1024)} kB)</li>
            ))}
          </ul>
        )}
        {request.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {request.skills.map((s) => (
              <Badge key={s.id}>{s.name}</Badge>
            ))}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {request.student_view && (
        <section className="space-y-3" aria-label="Offers">
          <h2 className="text-lg font-semibold tracking-tight">
            Offers {offers != null && <span className="text-muted">({offers.length})</span>}
          </h2>
          {offers != null && offers.length === 0 && (
            <Card><p className="text-sm text-muted">No offers yet — matched experts will find this request automatically.</p></Card>
          )}
          {offers?.map((offer) => (
            <Card key={offer.id} className="p-5 border-border/80 hover:border-primary/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{offer.expert?.display_name ?? "Specialist"}</span>
                    <Badge tone={OFFER_STATUS_TONE[offer.status]} className="text-xs">{OFFER_STATUS_COPY[offer.status]}</Badge>
                  </div>
                  {offer.expert?.headline && <p className="text-xs text-muted leading-tight">{offer.expert.headline}</p>}
                  <p className="mt-2 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{offer.message}</p>
                  <p className="mt-2 text-[11px] text-muted font-medium">Proposed Timeline: <strong className="text-foreground">{offer.timeline_text}</strong></p>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Specialist Quote</span>
                    <p className="font-mono text-lg font-black text-foreground">{offer.amount_display} {offer.currency}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageThreadButton context={{ context_type: "request", request_id: request.id }} />
                    {offer.status === "pending" && canAcceptOffers(request.status) && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyOffer === offer.id}
                          onClick={() => act(() => selectionApi.accept(request.id, offer.id), offer.id)}
                          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          {busyOffer === offer.id ? "Selecting…" : "Select expert"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyOffer === offer.id}
                          onClick={() => act(() => selectionApi.decline(request.id, offer.id), offer.id)}
                          className="h-8 text-xs text-muted hover:text-danger"
                        >
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
