import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SITE_URL } from "@/lib/config";
import { getPricing } from "@/lib/api/public";

/**
 * Expert-facing marketing (web-experiences.md URL map; component-selection.md
 * M2/M6). Specified since Phase 0, never built.
 *
 * Every claim here is checked against the implementation, not aspiration:
 *
 * - Commission and the payout floor are read live from
 *   `GET /api/v1/platform/pricing` (PlatformConfig-backed). Writing "keep 85%"
 *   into the copy would start lying the first time an operator edits a rate.
 * - "Two ways to get work" mirrors the real order sources: `open_bid` and the
 *   managed pool/direct assignment.
 * - Payment timing mirrors `approve_delivery()` and the 72h auto-approve
 *   (BR-24); the dispute window comes from PlatformConfig too.
 * - Application requirements mirror `ExpertApplyInfoView`: verified email,
 *   at least one credential upload, and both attestations.
 *
 * No earnings promises, no volume claims, no "average expert earns X" — the
 * platform has no such data and inventing it would be a lie to a prospective
 * supplier.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Become an expert — teach, coach and get paid",
  description:
    "Apply to join the marketplace: bid on requests or receive managed assignments, keep the majority of what you charge, and get paid when your work is approved.",
  alternates: { canonical: `${SITE_URL}/for-experts` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/for-experts`,
    title: "Become an expert on the Hybrid Expert Marketplace",
    description:
      "Bid on student requests or receive managed assignments. Commission only on completed work — no subscriptions or listing fees.",
  },
};

const STEPS = [
  {
    title: "1 · Apply",
    body: "Create an account, verify your email, then submit your profile with at least one credential document and the two attestations (18+, academic-integrity).",
  },
  {
    title: "2 · Get reviewed",
    body: "A human reviews every application — typically within 48 hours. Approval creates your public profile in the directory.",
  },
  {
    title: "3 · Win work",
    body: "Bid on open requests that match your subjects, or receive managed assignments the platform routes to you. You choose what to take.",
  },
  {
    title: "4 · Deliver and get paid",
    body: "Agree the scope, chat and exchange files in the order, deliver, handle any revisions, then get paid once the student approves.",
  },
];

const REQUIREMENTS = [
  "A verified email address on your account.",
  "At least one credential document (degree, certification or proof of expertise).",
  "Confirmation that you are 18 or over.",
  "Agreement to the academic-integrity policy — you support learning, you do not ghostwrite graded work.",
  "Subjects and skills selected from the platform taxonomy so the right requests reach you.",
];

export default async function ForExpertsPage() {
  const { data: pricing } = await getPricing();

  const faq = [
    {
      q: "What does it cost to join?",
      a: "Nothing. There is no subscription, no listing fee and no charge for bidding. The platform only takes a commission on work that actually completes.",
    },
    {
      q: "How much commission does the platform take?",
      a: pricing
        ? `${pricing.commission.open_bid.percent}% on open-marketplace orders you win by bidding, and ${pricing.commission.managed.percent}% on managed assignments the platform routes to you. The rate is fixed at the moment an order is booked and never changes afterwards.`
        : "Commission differs between open-marketplace bids and managed assignments. See the pricing page for the current rates.",
    },
    {
      q: "When do I get paid?",
      a: `You are paid after the order completes — when the student approves your delivery, or automatically 72 hours after delivery if they do not respond.${
        pricing
          ? ` Balances below ${pricing.payout_min.display} roll forward to the next payout rather than being lost, and a student has ${pricing.dispute_window_days} days after completion to raise a dispute, during which funds are held.`
          : ""
      }`,
    },
    {
      q: "Do I have to accept every request?",
      a: "No. Open-marketplace bidding is entirely your choice, and you can decline managed assignments. You can also pause your profile so it shows as unavailable.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="flex flex-col gap-10">
      {/* ld+json is a data block — no nonce needed (see ADR-0017). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Teach what you know. Get paid for it.</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Join a vetted marketplace of tutors, coaches and subject experts. Bid on the requests you
          want, or let the platform match you with students who need exactly your expertise.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Create your account
          </Link>
          <Link
            href="/experts"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:text-foreground"
          >
            See who is already here
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">
          Already registered?{" "}
          <Link href="/expert/apply" className="underline">
            Start your expert application
          </Link>
          .
        </p>
      </header>

      <section aria-labelledby="earnings">
        <h2 id="earnings" className="text-lg font-semibold">
          What you keep
        </h2>
        {pricing ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="expert-commission">
            {[
              {
                tier: pricing.commission.open_bid,
                // The API's `description` is written for students ("you post a
                // request and experts bid"), which is the wrong audience here.
                // Only the rate and label are shared; the framing is ours.
                blurb:
                  "Work you win by bidding on an open request. You set your own price and timeline.",
              },
              {
                tier: pricing.commission.managed,
                blurb:
                  "Work the platform routes to you: it triages the request, sets the price and matches you. The higher rate pays for that sourcing.",
              },
            ].map(({ tier, blurb }) => {
              const keepPercent = (100 - Number(tier.percent)).toString();
              return (
                <Card key={tier.label}>
                  <p className="text-sm font-medium text-muted">{tier.label}</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    {keepPercent}
                    <span className="text-xl text-muted">% to you</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {tier.percent}% platform commission. {blurb}
                  </p>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4" data-testid="expert-commission-unavailable">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Commission rates could not be loaded right now. They are published in full on the{" "}
              <Link href="/pricing" className="underline">
                pricing page
              </Link>
              .
            </p>
          </Card>
        )}
        <p className="mt-3 text-sm text-muted">
          Commission applies only to work that completes, and the rate is fixed when the order is
          booked.{" "}
          <Link href="/pricing" className="underline">
            Full pricing
          </Link>
        </p>
      </section>

      <section aria-labelledby="two-ways">
        <h2 id="two-ways" className="text-lg font-semibold">
          Two ways to get work
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold">Open marketplace</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Students post requests; you send an offer with your price and timeline. You compete on
              expertise and track record, and you decide which requests are worth your time.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Managed assignments</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The platform triages a request, sets the price and routes it to a suitable expert —
              either into a pool you can claim or directly to you. Higher commission, no bidding.
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-lg font-semibold">
          How it works
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="requirements">
        <h2 id="requirements" className="text-lg font-semibold">
          What we ask of you
        </h2>
        <Card className="mt-4">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {REQUIREMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            The integrity policy is not decoration: this platform supports tutoring, coaching,
            feedback on a student&rsquo;s own work and exam preparation. Producing graded coursework
            for submission is prohibited, and experts are expected to report requests that ask for
            it.{" "}
            <Link href="/academic-integrity" className="underline">
              Read the policy
            </Link>
            .
          </p>
        </Card>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="text-lg font-semibold">
          Common questions
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {faq.map((item) => (
            <Card key={item.q}>
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Ready to apply?</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Applications are reviewed by a person, typically within 48 hours.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Create your account
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:text-foreground"
          >
            How the platform works
          </Link>
        </div>
      </Card>
    </div>
  );
}
