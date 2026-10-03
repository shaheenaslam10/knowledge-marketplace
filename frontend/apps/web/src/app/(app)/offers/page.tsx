"use client";

/** Expert: manage submitted offers across requests (BR-15/16). */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { offersApi } from "@/features/offers/api";
import {
  OFFER_STATUS_COPY,
  OFFER_STATUS_TONE,
  isOfferEditable,
  isOfferResubmittable,
  type Offer,
} from "@/features/offers/types";
import { ApiError } from "@/lib/api/client";

export default function MyOffersPage() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    offersApi.mine().then((r) => setOffers(r.results)).catch(() => setError("Could not load your offers."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, id: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My offers</h1>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!offers && !error && <Skeleton className="h-32 w-full" />}
      {offers?.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">
            No offers yet — find work in the{" "}
            <Link className="text-primary underline" href="/opportunities">
              opportunities feed
            </Link>
            .
          </p>
        </Card>
      )}
      <div className="grid gap-4">
        {offers?.map((offer) => (
          <Card key={offer.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={OFFER_STATUS_TONE[offer.status]}>{OFFER_STATUS_COPY[offer.status]}</Badge>
                  <span className="font-mono font-semibold">
                    {offer.amount_display} {offer.currency}
                  </span>
                </div>
                <p className="mt-1 text-sm">{offer.message}</p>
                <p className="mt-1 text-xs text-muted">{offer.timeline_text}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/opportunities/${offer.request}`}>View request</Link>
                </Button>
                {isOfferEditable(offer.status) && (
                  <Button size="sm" variant="ghost" disabled={busyId === offer.id} onClick={() => act(() => offersApi.withdraw(offer.id), offer.id)}>
                    Withdraw
                  </Button>
                )}
                {isOfferResubmittable(offer.status) && (
                  <Button size="sm" variant="secondary" disabled={busyId === offer.id} onClick={() => act(() => offersApi.resubmit(offer.id), offer.id)}>
                    Re-submit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
