"use client";

/** Expert view of an open request: brief, own offer (blind bidding), submit/edit/withdraw. */
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MessageThreadButton } from "@/features/messaging/MessageThreadButton";
import { offersApi } from "@/features/offers/api";
import {
  OFFER_STATUS_COPY,
  OFFER_STATUS_TONE,
  isOfferEditable,
  isOfferResubmittable,
  type Offer,
} from "@/features/offers/types";
import { feedApi } from "@/features/requests/api";
import { REQUEST_STATUS_COPY, REQUEST_STATUS_TONE, type ServiceRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api/client";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [myOffer, setMyOffer] = useState<Offer | null>(null);
  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const detail = await feedApi.detail(params.id);
      setRequest(detail);
      const mine = await offersApi.mine();
      const own = mine.results.find((o) => o.request === params.id) ?? null;
      setMyOffer(own);
      if (own) {
        setAmount(String(own.amount_display));
        setTimeline(own.timeline_text);
        setMessage(own.message);
      }
    } catch {
      setError("Request not found or you are not eligible to view it.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        amount: Math.round(Number(amount) * 100),
        currency: request?.currency ?? "USD",
        timeline_text: timeline,
        message,
      };
      if (myOffer && isOfferEditable(myOffer.status)) {
        await offersApi.update(myOffer.id, payload);
      } else {
        await offersApi.submit(params.id, payload);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the offer.");
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
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
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <MessageThreadButton context={{ context_type: "request", request_id: request.id }} label="Message client" />
          <p className="mt-1 text-xs text-muted">
            {request.subject?.name ?? "No subject"} · {REQUEST_STATUS_COPY[request.status]}
            {request.deadline != null && ` · needed by ${request.deadline}`}
          </p>
        </div>
        <Badge tone={REQUEST_STATUS_TONE[request.status]}>{REQUEST_STATUS_COPY[request.status]}</Badge>
      </div>

      <Card>
        <p className="whitespace-pre-wrap text-sm">{request.description}</p>
        {request.attachments.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted">
            {request.attachments.map((a) => (
              <li key={a.id}>📎 {a.original_name} ({Math.round(a.size / 1024)} kB)</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        {myOffer ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold tracking-tight">Your offer</h2>
              <Badge tone={OFFER_STATUS_TONE[myOffer.status]}>{OFFER_STATUS_COPY[myOffer.status]}</Badge>
            </div>
            {myOffer.status === "declined" && myOffer.response_reason && (
              <p className="text-sm text-muted">Reason: {myOffer.response_reason}</p>
            )}
            <p className="text-xs text-muted">
              {myOffer.amount_display} {myOffer.currency} · {myOffer.timeline_text}
              {myOffer.net_preview && ` · your net after platform commission: ${myOffer.net_preview.net / 100} ${myOffer.currency}`}
            </p>
            {isOfferEditable(myOffer.status) && (
              <p className="text-xs text-muted">Editable while the request is open (BR-15).</p>
            )}
          </div>
        ) : (
          <h2 className="font-semibold tracking-tight">Submit your offer</h2>
        )}

        {(!myOffer || isOfferEditable(myOffer.status) || isOfferResubmittable(myOffer.status)) && (
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount">Your price ({request.currency})</Label>
                <Input id="amount" type="number" min="5" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="timeline">Proposed schedule</Label>
                <Input id="timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="2 sessions/week, starting Monday" required />
              </div>
            </div>
            <div>
              <Label htmlFor="message">Your plan</Label>
              <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How you will coach the student to the goal…" required />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : myOffer ? "Update offer" : "Send offer"}
              </Button>
              {myOffer && isOfferEditable(myOffer.status) && (
                <Button type="button" variant="ghost" disabled={busy} onClick={() => act(() => offersApi.withdraw(myOffer.id))}>
                  Withdraw
                </Button>
              )}
              {myOffer && isOfferResubmittable(myOffer.status) && (
                <Button type="button" variant="secondary" disabled={busy} onClick={() => act(() => offersApi.resubmit(myOffer.id))}>
                  Re-submit
                </Button>
              )}
            </div>
            {amount && Number(amount) >= 5 && (
              <p className="text-xs text-muted">
                Binding offer: acceptance creates the order at this price (BR-16).
              </p>
            )}
          </form>
        )}
        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      </Card>

      <Button variant="ghost" onClick={() => router.push("/opportunities")}>← Back to opportunities</Button>
    </div>
  );
}
