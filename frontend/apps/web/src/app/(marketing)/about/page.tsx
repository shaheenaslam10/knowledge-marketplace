import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SITE_URL } from "@/lib/config";

/**
 * About (web-experiences.md URL map). Specified since Phase 0, never built.
 *
 * Deliberately factual. There is no founding story, team page, investor list,
 * office location or user-count claim here, because the repository contains
 * no such facts and an About page is exactly where invented ones do the most
 * damage. Everything stated below is verifiable in the codebase:
 *
 * - the two matching models (open bidding / managed assignment)
 * - one shared order pipeline behind both
 * - funds held until approval, 72h auto-approve (BR-24)
 * - human vetting of every expert
 * - the academic-integrity boundary
 * - disputes with a bounded window, and an append-only audit trail
 *
 * Static: no live backend data, so this is genuinely prerenderable.
 */

export const metadata: Metadata = {
  title: "About — what this marketplace is",
  description:
    "A hybrid expert marketplace: students post requests, experts bid or are matched by the platform, and one shared order pipeline handles payment, delivery and disputes.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    title: "About the Hybrid Expert Marketplace",
    description:
      "Two ways to get matched, one pipeline for payment, delivery and disputes — built around a clear academic-integrity boundary.",
  },
};

const PRINCIPLES = [
  {
    title: "Learning, not ghostwriting",
    body: "The platform exists for tutoring, coaching, feedback on your own drafts and exam preparation. Producing graded coursework to be submitted as someone else's work is prohibited — enforced through attestations at request time, expert reporting and moderation.",
    href: "/academic-integrity",
    hrefLabel: "Read the integrity policy",
  },
  {
    title: "The quoted price is the price",
    body: "Students pay what they agreed with the expert. The platform's commission comes out of the expert's earnings, never as a surcharge on top, and the rate is fixed the moment an order is booked.",
    href: "/pricing",
    hrefLabel: "See the rates",
  },
  {
    title: "Money moves only when work lands",
    body: "Funds are held after payment and released when the student approves the delivery — or automatically 72 hours later if they do not respond. While a dispute is open, the money stays put.",
  },
  {
    title: "Every expert is reviewed by a person",
    body: "Joining the directory requires a verified email, at least one credential document and explicit attestations, followed by human review. Suspended or withdrawn experts leave the directory immediately.",
    href: "/experts",
    hrefLabel: "Browse the directory",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          A marketplace connecting students with vetted subject experts — built so that both sides
          know exactly what happens to the work and the money.
        </p>
      </header>

      <section aria-labelledby="what-it-is">
        <h2 id="what-it-is" className="text-lg font-semibold">
          What it is
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Most platforms pick one model: either an open marketplace where you sift through bids, or
          a managed service that picks someone for you. This one runs both, over a single shared
          pipeline. How you get matched is the only thing that differs — payment, messaging, file
          exchange, delivery, revisions, approval, reviews and disputes are identical either way.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold">Open marketplace</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Post a request and eligible experts send offers. You compare price, timeline, rating
              and track record, then choose. Best when you want control and options.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Managed service</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The platform reviews your request, prices it and matches a suitable expert. Best when
              you would rather not evaluate candidates yourself.
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="principles">
        <h2 id="principles" className="text-lg font-semibold">
          What we hold to
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <Card key={principle.title}>
              <h3 className="text-sm font-semibold">{principle.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{principle.body}</p>
              {principle.href && (
                <p className="mt-3 text-sm">
                  <Link href={principle.href} className="underline">
                    {principle.hrefLabel}
                  </Link>
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="disputes">
        <h2 id="disputes" className="text-lg font-semibold">
          When something goes wrong
        </h2>
        <Card className="mt-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Delivery not what was agreed? Ask for a revision inside the order. If that does not
            resolve it, either side can open a dispute within the window after completion. Disputes
            are reviewed by staff with the full order history — messages, files, deadlines and
            payment events — and resolved with a refund, a release, or something between. Every
            administrative action is written to an append-only audit trail.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/how-it-works" className="underline">
              See the full process
            </Link>
          </p>
        </Card>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact" className="text-lg font-semibold">
          Get started
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Post a request
          </Link>
          <Link
            href="/for-experts"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:text-foreground"
          >
            Become an expert
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Using the platform means agreeing to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/academic-integrity" className="underline">
            Academic Integrity Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
