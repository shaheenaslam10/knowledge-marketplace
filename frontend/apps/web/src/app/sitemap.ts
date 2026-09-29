import type { MetadataRoute } from "next";
import { API_URL_SERVER, SITE_URL } from "@/lib/config";

/**
 * XML sitemap (seo-ux.md: "static routes + experts + subjects, Last-Modified
 * from updated_at"). Specified since Phase 0, never built.
 *
 * Deviations from that line, both deliberate:
 *
 * - **`approved_at`, not `updated_at`.** The public expert serializer does not
 *   expose `updated_at` (it is not public data), and widening a public payload
 *   to decorate a sitemap is the wrong trade. `approved_at` is the honest
 *   available signal for when a profile became publicly visible.
 *
 * Rendered on demand rather than at build time: the web image builds with no
 * API reachable, so a build-time fetch would bake an experts-less sitemap.
 */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Hard ceiling so a large directory cannot turn one crawl into an unbounded walk. */
const MAX_PAGES = 25;
const PAGE_SIZE = 100;

interface DirectoryExpert {
  slug: string;
  approved_at?: string | null;
}

interface DirectoryPage {
  results?: DirectoryExpert[];
  next?: string | null;
}

interface SubjectListItem {
  slug: string;
  expert_count: number;
}

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/experts", changeFrequency: "daily", priority: 0.7 },
  { path: "/subjects", changeFrequency: "weekly", priority: 0.7 },
  { path: "/for-experts", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/academic-integrity", changeFrequency: "yearly", priority: 0.3 },
];

async function fetchExperts(): Promise<DirectoryExpert[]> {
  const experts: DirectoryExpert[] = [];
  let url: string | null =
    `${API_URL_SERVER}/api/v1/experts?page_size=${PAGE_SIZE}`;

  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const res: Response = await fetch(url, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) break;

    const body = (await res.json()) as DirectoryPage;
    for (const expert of body.results ?? []) {
      if (expert.slug) experts.push(expert);
    }

    // The API returns an absolute `next`; trust only the cursor from it so a
    // misconfigured API base cannot redirect our crawl off-host.
    const next = body.next ? new URL(body.next).searchParams.get("cursor") : null;
    url = next
      ? `${API_URL_SERVER}/api/v1/experts?page_size=${PAGE_SIZE}&cursor=${encodeURIComponent(next)}`
      : null;
  }

  return experts;
}

async function fetchSubjects(): Promise<SubjectListItem[]> {
  const res = await fetch(`${API_URL_SERVER}/api/v1/subjects`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { subjects?: SubjectListItem[] };
  return body.subjects ?? [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let expertEntries: MetadataRoute.Sitemap = [];
  try {
    expertEntries = (await fetchExperts()).map((expert) => ({
      url: `${SITE_URL}/experts/${expert.slug}`,
      lastModified: expert.approved_at ? new Date(expert.approved_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // A sitemap missing its expert pages still beats a 500: search engines
    // retry, and the static routes stay discoverable meanwhile.
    expertEntries = [];
  }

  // Subjects with no expert are excluded: the page renders (it has a real
  // empty state) but carries `noindex`, and sitemapping a noindex URL is a
  // contradictory signal.
  let subjectEntries: MetadataRoute.Sitemap = [];
  try {
    subjectEntries = (await fetchSubjects())
      .filter((subject) => subject.expert_count > 0)
      .map((subject) => ({
        url: `${SITE_URL}/subjects/${subject.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    subjectEntries = [];
  }

  return [...staticEntries, ...subjectEntries, ...expertEntries];
}