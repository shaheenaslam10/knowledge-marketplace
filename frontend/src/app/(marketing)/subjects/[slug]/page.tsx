import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SITE_URL } from "@/lib/config";
import { getExpertsForSubject, getSubject } from "@/lib/api/public";

/**
 * Subject landing page — seo-ux.md: "Find help in {subject}" — directory of
 * experts + how-it-works snippet; hub-and-spoke internal links.
 *
 * Specified since Phase 0, never built. Data comes from the taxonomy the
 * operators actually curate, not a hard-coded subject list, so retiring a
 * subject in admin retires the page (404) instead of leaving an orphan URL
 * in the index.
 *
 * `force-dynamic` for the reason documented in lib/api/public.ts: the web
 * image builds with no API reachable, so prerendering can only ever bake a
 * failure.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getSubject(slug);

  if (!data) {
    // Unknown *or* unreachable. Either way this must not be indexed as a
    // real subject page, and it must not claim a name we do not have.
    return { title: "Subject", robots: { index: false, follow: true } };
  }

  const { subject, expert_count: expertCount } = data;
  const description =
    subject.description ||
    `Find vetted ${subject.name} experts for tutoring, coaching, feedback and exam preparation.`;

  return {
    title: `${subject.name} experts & tutoring`,
    description,
    alternates: { canonical: `${SITE_URL}/subjects/${subject.slug}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/subjects/${subject.slug}`,
      title: `Find help in ${subject.name}`,
      description,
    },
    // An empty subject is a real page with a real empty state, but there is
    // nothing there worth ranking yet.
    robots: expertCount === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function SubjectPage({ params }: PageProps) {
  const { slug } = await params;
  const { data, notFound: missing } = await getSubject(slug);

  // Only a definitive backend 404 renders not-found. An unreachable API must
  // not delete a real subject page from the site.
  if (missing) notFound();

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Subject unavailable</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            We could not load this subject just now. Please try again shortly, or{" "}
            <Link href="/experts" className="underline">
              browse every expert
            </Link>
            .
          </p>
        </header>
      </div>
    );
  }

  const { subject, parent, expert_count: expertCount, related } = data;
  const { data: directory } = await getExpertsForSubject(subject.slug);
  const experts = directory?.results ?? [];

  const canonical = `${SITE_URL}/subjects/${subject.slug}`;
  const description =
    subject.description ||
    `Vetted ${subject.name} experts for tutoring, coaching, feedback and exam preparation.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Subjects", item: `${SITE_URL}/subjects` },
          { "@type": "ListItem", position: 3, name: subject.name, item: canonical },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `Find help in ${subject.name}`,
        description,
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: experts.length,
          itemListElement: experts.map((expert, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/experts/${expert.slug}`,
            name: expert.display_name,
          })),
        },
      },
    ],
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ld+json is a data block: the HTML spec stops preparing it before the
          CSP check, so script-src never applies and no nonce is needed. Adding
          one would require headers(), which is not free. See ADR-0017. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/subjects" className="hover:text-foreground">
              Subjects
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">{subject.name}</li>
        </ol>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Find help in {subject.name}</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{description}</p>
        <p className="mt-3 text-sm text-muted" data-testid="subject-expert-count">
          {expertCount === 0
            ? "No experts are listed in this subject yet."
            : `${expertCount} expert${expertCount === 1 ? "" : "s"} available`}
          {/* The parent is a *category* (e.g. "Programming & Development"),
              not a subject. Categories have no landing page, so this is a
              label, never a link — linking it would 404. Verified against
              seeded taxonomy: every subject parent is kind="category". */}
          {parent ? <> · part of {parent.name}</> : null}
        </p>
      </header>

      {experts.length > 0 ? (
        <section aria-labelledby="subject-experts">
          <h2 id="subject-experts" className="text-lg font-semibold">
            Experts in {subject.name}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {experts.map((expert) => (
              <Card key={expert.slug}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/experts/${expert.slug}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {expert.display_name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{expert.headline}</p>
                  </div>
                  {expert.availability === "available" ? (
                    <Badge tone="success">Available</Badge>
                  ) : (
                    <Badge tone="neutral">Paused</Badge>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {expert.expertise_summary}
                </p>
                {expert.rating_count > 0 && (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    ★ {expert.rating_avg} · {expert.rating_count} review
                    {expert.rating_count === 1 ? "" : "s"}
                  </p>
                )}
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <Link href={`/experts?subject=${subject.slug}`} className="underline">
              See all {subject.name} experts
            </Link>
          </p>
        </section>
      ) : (
        <Card data-testid="subject-empty-state">
          <h2 className="text-lg font-semibold">No {subject.name} experts listed yet</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You can still post a request — the managed service reviews it and matches a vetted
            expert for you, and experts joining this subject will see it in the marketplace.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/register" className="underline">
              Post a request
            </Link>
            <Link href="/experts" className="underline">
              Browse every expert
            </Link>
          </div>
        </Card>
      )}

      {/* how-it-works snippet (seo-ux.md) — orients a visitor who landed here
          from search without making them leave for the full page. */}
      <Card>
        <h2 className="text-lg font-semibold">How getting {subject.name} help works</h2>
        <ol className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-300">
          <li>
            <strong className="text-foreground">1 · Post your request.</strong> Describe what you
            need and choose the open marketplace or the managed service.
          </li>
          <li>
            <strong className="text-foreground">2 · Compare offers.</strong> Experts bid, or the
            platform matches one for you.
          </li>
          <li>
            <strong className="text-foreground">3 · Pay securely.</strong> Funds are held until you
            approve the delivery.
          </li>
          <li>
            <strong className="text-foreground">4 · Review and approve.</strong> Request revisions,
            then release the payment.
          </li>
        </ol>
        <p className="mt-4 text-sm">
          <Link href="/how-it-works" className="underline">
            Read the full walkthrough
          </Link>{" "}
          ·{" "}
          <Link href="/pricing" className="underline">
            See what it costs
          </Link>
        </p>
      </Card>

      {related.length > 0 && (
        <section aria-labelledby="related-subjects">
          <h2 id="related-subjects" className="text-lg font-semibold">
            Related subjects
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/subjects/${item.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
