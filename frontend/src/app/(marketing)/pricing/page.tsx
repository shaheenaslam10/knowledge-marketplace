import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { API_URL_SERVER, SITE_URL } from "@/lib/config";

/**
 * Public pricing (seo-ux.md, frontend.md — listed since Phase 0, never built).
 *
 * The platform takes commission on every order, and until now that was
 * disclosed nowhere a prospective user could see it. The numbers are read
 * live from the backend rather than written into this file: they are
 * PlatformConfig-backed, so hard-coded copy would start lying the first time
 * an operator changes a rate.
 */

/**
 * Rendered on demand, NOT prerendered — deliberately, and against the "SSG"
 * shorthand in frontend.md.
 *
 * The web image is built independently of the API container, so at `next
 * build` time `API_URL_SERVER` resolves to nothing that is listening. A
 * prerendered page would therefore bake the degraded "rates unavailable"
 * state into the HTML and, with ISR, keep serving it. Verified: the first
 * build of this page shipped exactly that.
 *
 * The data is still cached for an hour (below), so being dynamic costs one
 * config read per hour, not one per visitor.
 */
export const dynamic = "force-dynamic";

/**
 * 60s, not the 1h used for static marketing copy. Commission is fixed at the
 * moment an order is booked, so every second this page shows a stale rate is
 * a second where a student can book at a rate the page never advertised.
 * A minute still absorbs crawlers and traffic bursts; an hour is too long to
 * be wrong about money.
 */
const PRICING_TTL_SECONDS = 60;

export const metadata: Metadata = {
  title: "Pricing — what the platform charges",
  description:
    "Transparent marketplace pricing: students pay the agreed price, experts pay a commission on completed work. No subscriptions, no listing fees.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

interface PricingTier {
  rate: string;
  percent: string;
  label: string;
  description: string;
}

interface Pricing {
  currency: string;
  commission: { open_bid: PricingTier; managed: PricingTier };
  min_offer: { minor: number; display: string };
  payout_min: { minor: number; display: string };
  dispute_window_days: number;
}

/**
 * Cached at the data layer, not the route layer: an explicit per-fetch
 * `revalidate` survives `force-dynamic`, so repeat visitors are served from
 * the data cache. A failed request is deliberately *not* cached — a transient
 * API blip recovers on the very next request instead of pinning the degraded
 * state for an hour.
 */
async function getPricing(): Promise<Pricing | null> {
  try {
    const res = await fetch(`${API_URL_SERVER}/api/v1/platform/pricing`, {
      next: { revalidate: PRICING_TTL_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Pricing;
  } catch {
    return null;
  }
}

const FAQ = [
  {
    q: "Do students pay a platform fee?",
    a: "No. Students pay the price agreed with the expert. The platform commission is deducted from the expert's earnings, so the quoted price is the price.",
  },
  {
    q: "When is the expert paid?",
    a: "After the order completes — either when the student approves the delivery, or automatically 72 hours after delivery if they do not respond. Funds are held until then, and are frozen while a dispute is open.",
  },
  {
    q: "Are there subscriptions, listing fees or monthly costs?",
    a: "No. There is no charge to join, to publish a request, or to submit an offer. The platform only earns when an order completes.",
  },
  {
    q: "What happens if the work is not delivered?",
    a: "You can open a dispute. Resolutions can include a full or partial refund, and the expert's payout stays frozen until the dispute is resolved.",
  },
];

export default async function PricingPage() {
  const pricing = await getPricing();

  return (
    <div className="space-y-12">
      {/* FAQPage JSON-LD — required by seo-ux.md for this route. */}
      {/*
        No nonce here, deliberately. A <script> with a non-JS type is a *data
        block*: the HTML spec stops preparing it before the CSP check, so
        script-src never applies and 'strict-dynamic' cannot drop it. Reading
        the nonce would mean calling headers(), which opts this route out of
        static rendering — a real cost on the SEO page frontend.md specifies
        as SSG, paid to solve a problem that does not exist.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />

      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
        <p className="text-muted">
          Students pay the price they agreed to — nothing on top. Experts pay a commission only on
          work that actually completes. No subscriptions, no listing fees, no charge for posting a
          request.
        </p>
      </header>

      {pricing ? (
        <>
          <section aria-labelledby="commission" className="space-y-4">
            <h2 id="commission" className="text-xl font-semibold">
              Commission, by how you were matched
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[pricing.commission.open_bid, pricing.commission.managed].map((tier) => (
                <Card key={tier.label} className="space-y-3 p-6">
                  <p className="text-sm font-medium text-muted">{tier.label}</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    {tier.percent}
                    <span className="text-xl text-muted">%</span>
                  </p>
                  <p className="text-sm text-muted">{tier.description}</p>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted">
              Commission is fixed at the moment an order is booked and never changes afterwards,
              even if rates change later.
            </p>
          </section>

          <section aria-labelledby="limits" className="space-y-4">
            <h2 id="limits" className="text-xl font-semibold">
              Thresholds
            </h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Card className="space-y-1 p-5">
                <dt className="text-sm text-muted">Minimum offer</dt>
                <dd className="text-2xl font-semibold">{pricing.min_offer.display}</dd>
                <p className="text-xs text-muted">The lowest an expert may bid.</p>
              </Card>
              <Card className="space-y-1 p-5">
                <dt className="text-sm text-muted">Minimum payout</dt>
                <dd className="text-2xl font-semibold">{pricing.payout_min.display}</dd>
                <p className="text-xs text-muted">
                  Smaller balances roll forward to the next payout rather than being lost.
                </p>
              </Card>
              <Card className="space-y-1 p-5">
                <dt className="text-sm text-muted">Dispute window</dt>
                <dd className="text-2xl font-semibold">{pricing.dispute_window_days} days</dd>
                <p className="text-xs text-muted">After completion, to raise a problem.</p>
              </Card>
            </dl>
          </section>
        </>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-muted">
            Live pricing is temporarily unavailable. Commission is charged to the expert on
            completed orders only — students always pay the agreed price.{" "}
            <Link href="/how-it-works" className="underline hover:text-foreground">
              How it works
            </Link>
          </p>
        </Card>
      )}

      <section aria-labelledby="faq" className="space-y-4">
        <h2 id="faq" className="text-xl font-semibold">
          Common questions
        </h2>
        <dl className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <Card key={q} className="space-y-2 p-5">
              <dt className="font-medium">{q}</dt>
              <dd className="text-sm text-muted">{a}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-border p-6">
        <p className="text-sm text-muted">
          Academic integrity comes first: the platform supports learning, coaching and feedback —
          not work submitted as a student&apos;s own.{" "}
          <Link href="/academic-integrity" className="underline hover:text-foreground">
            Read the policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
