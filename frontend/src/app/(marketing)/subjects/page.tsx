import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SITE_URL } from "@/lib/config";
import { getSubjects } from "@/lib/api/public";

/**
 * Subject hub.
 *
 * seo-ux.md specifies `/subjects/[slug]` with "hub-and-spoke internal links"
 * but never names the hub. Without one the spokes are reachable only from the
 * sitemap and from each other, which is a crawl island and useless to humans.
 * This page is that hub, and the breadcrumb target for every subject page.
 * Recorded as a deliberate addition in seo-ux.md rather than assumed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subjects — find an expert by subject",
  description:
    "Browse every subject covered by the marketplace and find vetted experts for tutoring, coaching, feedback and exam preparation.",
  alternates: { canonical: `${SITE_URL}/subjects` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/subjects`,
    title: "Find an expert by subject",
    description:
      "Every subject the marketplace covers, with the experts available in each.",
  },
};

export default async function SubjectsPage() {
  const { data } = await getSubjects();
  const subjects = data?.subjects ?? [];
  const staffed = subjects.filter((s) => s.expert_count > 0);
  const unstaffed = subjects.filter((s) => s.expert_count === 0);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Every subject the marketplace covers. Pick one to see the experts available, or{" "}
          <Link href="/experts" className="underline">
            browse the full directory
          </Link>
          .
        </p>
      </header>

      {subjects.length === 0 ? (
        <Card data-testid="subjects-unavailable">
          <h2 className="text-lg font-semibold">Subjects are unavailable right now</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            We could not load the subject list. You can still{" "}
            <Link href="/experts" className="underline">
              browse every expert
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          <section aria-labelledby="staffed-subjects">
            <h2 id="staffed-subjects" className="sr-only">
              Subjects with available experts
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staffed.map((subject) => (
                <Card key={subject.slug}>
                  <Link
                    href={`/subjects/${subject.slug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {subject.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {subject.expert_count} expert{subject.expert_count === 1 ? "" : "s"}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {unstaffed.length > 0 && (
            <section aria-labelledby="open-subjects">
              <h2 id="open-subjects" className="text-lg font-semibold">
                Subjects without a listed expert yet
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                You can still post a request in these — the managed service will match an expert.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unstaffed.map((subject) => (
                  <Link
                    key={subject.slug}
                    href={`/subjects/${subject.slug}`}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:text-foreground"
                  >
                    {subject.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
