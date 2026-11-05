import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Star,
  Users,
  Zap,
  BookOpen,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SITE_URL } from "@/lib/config";
import { getPricing } from "@/lib/api/public";

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
    num: "01",
    title: "Apply & Get Reviewed",
    body: "Create an account, verify your email, then submit your profile with at least one credential document and attestations. A human reviews every application — typically within 48 hours.",
    icon: BadgeCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    num: "02",
    title: "Win Work Your Way",
    body: "Bid on open requests that match your subjects, or receive managed assignments the platform routes to you. You choose what to accept — zero obligation.",
    icon: Scale,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    num: "03",
    title: "Deliver & Receive Payout",
    body: "Agree the scope, collaborate in private order workspaces, deliver, handle revisions, and receive payment once approved or via automated 72h protocol.",
    icon: Wallet,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

const REQUIREMENTS = [
  "A verified email address on your account.",
  "At least one credential document (degree, certification or proof of expertise).",
  "Confirmation that you are 18 or over.",
  "Agreement to the academic-integrity policy — you support learning, you do not ghostwrite graded work.",
  "Subjects and skills selected from the platform taxonomy so the right requests reach you.",
];

const EXPERT_BENEFITS = [
  { icon: Wallet, label: "Top Payouts", sub: "Keep the majority of what you charge", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: Zap, label: "Zero Listing Fees", sub: "Pay nothing until you earn", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  { icon: Clock, label: "72h Payout Release", sub: "Direct escrow clearing upon approval", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: ShieldCheck, label: "Milestone Protection", sub: "Platform arbitration for every order", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
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
    <div className="flex flex-col gap-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <section className="relative -mx-4 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-surface-2/40 to-background px-4 py-20 sm:mx-0 sm:px-10 sm:py-28">
        <div className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Sparkles className="size-3.5" />
            <span>Specialist Program · Accredited Academic Network</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            Teach what you know.<br />
            <span className="text-amber-500">Get paid for it.</span>
          </h1>

          <p className="max-w-2xl text-base text-muted sm:text-lg leading-relaxed">
            Join a vetted marketplace of tutors, coaches and subject experts. Bid on the requests you
            want, or let the platform match you with students who need exactly your expertise.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/register/expert"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-600"
            >
              Create your account <ArrowRight className="size-4 ml-1.5" />
            </Link>
            <Link
              href="/experts"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2/60 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              See who is already here
            </Link>
          </div>

          <p className="text-xs text-muted">
            Already registered?{" "}
            <Link href="/expert/apply" className="font-semibold text-primary underline hover:text-primary-strong">
              Start your expert application
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          BENEFIT STATS ROW
      ════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {EXPERT_BENEFITS.map((b) => (
          <div key={b.label} className={`rounded-2xl border p-5 flex flex-col gap-2 h-full ${b.border} ${b.bg}`}>
            <b.icon className={`size-5 ${b.color}`} />
            <span className={`text-base sm:text-lg font-extrabold ${b.color}`}>{b.label}</span>
            <span className="text-[11px] text-muted leading-relaxed">{b.sub}</span>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          WHAT YOU KEEP — LIVE PRICING
      ════════════════════════════════════════════ */}
      <section aria-labelledby="earnings" className="space-y-8">
        <div className="space-y-2">
          <Badge tone="flow">Transparent Economics</Badge>
          <h2 id="earnings" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What you keep
          </h2>
          <p className="text-sm text-muted max-w-xl">
            Commission applies only to work that completes, and the rate is fixed when the order is booked.
          </p>
        </div>

        {pricing ? (
          <div className="grid gap-5 sm:grid-cols-2" data-testid="expert-commission">
            {[
              {
                tier: pricing.commission.open_bid,
                blurb: "Work you win by bidding on an open request. You set your own price and timeline.",
                badge: "Open Bidding",
                badgeTone: "info" as const,
              },
              {
                tier: pricing.commission.managed,
                blurb: "Work the platform routes to you: it triages the request, sets the price and matches you. The higher rate pays for that sourcing.",
                badge: "Managed Pool",
                badgeTone: "neutral" as const,
              },
            ].map(({ tier, blurb, badge, badgeTone }) => {
              const keepPercent = (100 - Number(tier.percent)).toString();
              return (
                <Card key={tier.label} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={badgeTone}>{badge}</Badge>
                      <p className="mt-2 text-sm font-medium text-muted">{tier.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-4xl font-extrabold text-foreground">
                        {keepPercent}
                        <span className="text-xl text-muted font-normal">% to you</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    {tier.percent}% platform commission. {blurb}
                  </p>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4" data-testid="expert-commission-unavailable">
            <p className="text-sm text-muted">
              Commission rates could not be loaded right now. They are published in full on the{" "}
              <Link href="/pricing" className="underline">
                pricing page
              </Link>
              .
            </p>
          </Card>
        )}
        <p className="text-sm text-muted">
          Commission applies only to work that completes, and the rate is fixed when the order is
          booked.{" "}
          <Link href="/pricing" className="underline hover:text-foreground">
            Full pricing
          </Link>
        </p>
      </section>

      {/* ════════════════════════════════════════════
          TWO WAYS TO GET WORK
      ════════════════════════════════════════════ */}
      <section aria-labelledby="two-ways" className="space-y-6">
        <h2 id="two-ways" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Two ways to get work
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="p-6 space-y-3">
            <h3 className="text-base font-bold text-foreground">Open marketplace</h3>
            <p className="text-sm text-muted leading-relaxed">
              Students post requests; you send an offer with your price and timeline. You compete on
              expertise and track record, and you decide which requests are worth your time.
            </p>
          </Card>
          <Card className="p-6 space-y-3">
            <h3 className="text-base font-bold text-foreground">Managed assignments</h3>
            <p className="text-sm text-muted leading-relaxed">
              The platform triages a request, sets the price and routes it to a suitable expert —
              either into a pool you can claim or directly to you. Higher commission, no bidding.
            </p>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS — 4 STEPS
      ════════════════════════════════════════════ */}
      <section aria-labelledby="steps" className="space-y-6">
        <h2 id="steps" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          How it works
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Card key={step.title} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-2xl font-bold ${step.color} opacity-40`}>{step.num}</span>
                <div className={`flex size-9 items-center justify-center rounded-xl ${step.bg}`}>
                  <step.icon className={`size-4 ${step.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.body}</p>
            </Card>
          ))}
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-primary opacity-40">04</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="size-4 text-primary" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-foreground">Deliver and get paid</h3>
            <p className="text-sm text-muted leading-relaxed">
              Agree the scope, chat and exchange files in the order, deliver, handle any revisions, then get paid once the student approves.
            </p>
          </Card>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHAT WE ASK OF YOU
      ════════════════════════════════════════════ */}
      <section aria-labelledby="requirements" className="space-y-6">
        <h2 id="requirements" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          What we ask of you
        </h2>
        <Card className="p-6 space-y-4">
          <ul className="flex list-disc flex-col gap-2.5 pl-5 text-sm text-muted">
            {REQUIREMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="pt-2 text-sm text-muted leading-relaxed border-t border-border/60">
            The integrity policy is not decoration: this platform supports tutoring, coaching,
            feedback on a student&rsquo;s own work and exam preparation. Producing graded coursework
            for submission is prohibited, and experts are expected to report requests that ask for
            it.{" "}
            <Link href="/academic-integrity" className="font-semibold text-primary underline hover:text-primary-strong">
              Read the policy
            </Link>
            .
          </p>
        </Card>
      </section>

      {/* ════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════ */}
      <section aria-labelledby="faq" className="space-y-6">
        <h2 id="faq" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Common questions
        </h2>
        <div className="flex flex-col gap-4">
          {faq.map((item) => (
            <Card key={item.q} className="p-5 space-y-2">
              <h3 className="text-sm font-bold text-foreground">{item.q}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════ */}
      <Card className="p-8 sm:p-12 space-y-4 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-surface">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Ready to apply?</h2>
        <p className="text-sm text-muted max-w-xl">
          Applications are reviewed by a person, typically within 48 hours.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/register/expert"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-amber-600"
          >
            Create your account
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
          >
            How the platform works
          </Link>
        </div>
      </Card>
    </div>
  );
}
