import type { Metadata } from "next";

import { SITE_URL } from "@/lib/config";

/**
 * Server-side SEO for the expert directory.
 *
 * `page.tsx` is a client component (it owns the filter/search state), so it
 * cannot export metadata itself. Without this the directory — a route listed
 * in `sitemap.ts` — served the generic root-layout title and no canonical.
 *
 * Static metadata only: the listing is filtered client-side from query state,
 * so there is nothing request-specific to fetch here, and the canonical
 * deliberately points at the unfiltered directory so filter permutations do
 * not compete with each other in the index.
 */
const description =
  "Browse vetted experts by subject, skill and rating. Compare profiles, then post a request or invite an expert directly.";

export const metadata: Metadata = {
  title: "Find an expert — browse the vetted directory",
  description,
  alternates: { canonical: `${SITE_URL}/experts` },
  openGraph: {
    title: "Find an expert · Hybrid Expert Marketplace",
    description,
    url: `${SITE_URL}/experts`,
    type: "website",
  },
};

export default function ExpertsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
