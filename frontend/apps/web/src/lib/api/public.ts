import { API_URL_SERVER } from "@/lib/config";

/**
 * Server-side fetching for anonymous marketing pages.
 *
 * Every public page that reads live backend data repeats the same three
 * decisions, and getting any of them wrong has already shipped a bug once
 * (see frontend.md, "Why /pricing is not SSG"):
 *
 * 1. **Never prerender.** The web image is built independently of the API
 *    container, so a build-time fetch always fails and bakes the degraded
 *    state into the HTML. Pages using these helpers must export
 *    `dynamic = "force-dynamic"`.
 * 2. **Cache the data, not the route.** An explicit per-fetch `revalidate`
 *    survives `force-dynamic`, so repeat visitors are served from the data
 *    cache rather than hitting the API.
 * 3. **Never cache a failure.** A thrown/non-OK response returns `null` and
 *    is deliberately not cached, so a transient API blip recovers on the very
 *    next request instead of pinning the degraded state for a whole TTL.
 *
 * Callers must handle `null` by degrading honestly — never by inventing
 * numbers or pretending a subject exists.
 */

/** Marketing copy that is not money: an hour of staleness is harmless. */
export const MARKETING_TTL_SECONDS = 3600;

/**
 * Money and commission: 60s. Commission is fixed at the moment an order is
 * booked, so every second this is stale is a second a student can book at a
 * rate the page never advertised.
 */
export const PRICING_TTL_SECONDS = 60;

export interface PublicFetchResult<T> {
  data: T | null;
  /** Distinguishes "backend said no such thing" from "backend unreachable". */
  notFound: boolean;
}

export async function fetchPublic<T>(
  path: string,
  revalidate: number,
): Promise<PublicFetchResult<T>> {
  try {
    const res = await fetch(`${API_URL_SERVER}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { data: null, notFound: true };
    if (!res.ok) return { data: null, notFound: false };
    return { data: (await res.json()) as T, notFound: false };
  } catch {
    return { data: null, notFound: false };
  }
}

// --- shared response shapes ------------------------------------------------

export interface PricingTier {
  rate: string;
  percent: string;
  label: string;
  description: string;
}

export interface Pricing {
  currency: string;
  commission: { open_bid: PricingTier; managed: PricingTier };
  min_offer: { minor: number; display: string };
  payout_min: { minor: number; display: string };
  dispute_window_days: number;
}

export interface SubjectRef {
  name: string;
  slug: string;
}

export interface SubjectDetail {
  subject: { name: string; slug: string; description: string };
  parent: SubjectRef | null;
  expert_count: number;
  related: SubjectRef[];
}

export interface SubjectListItem extends SubjectRef {
  expert_count: number;
}

export interface DirectoryExpert {
  slug: string;
  display_name: string;
  headline: string;
  expertise_summary: string;
  rating_avg: string | number;
  rating_count: number;
  availability: string;
  subjects: Array<{ id: number; name: string; slug: string }>;
}

/** Public expert profile (`GET /api/v1/experts/{slug}`) — metadata subset. */
export interface PublicExpertDetail {
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  expertise_summary: string;
  experience_years: number;
  languages: string;
  availability: string;
  rating_avg?: string | number;
  rating_count?: number;
  subjects: Array<{ id: number; name: string; slug: string }>;
}

export const getPricing = () => fetchPublic<Pricing>("/api/v1/platform/pricing", PRICING_TTL_SECONDS);

export const getSubject = (slug: string) =>
  fetchPublic<SubjectDetail>(
    `/api/v1/subjects/${encodeURIComponent(slug)}`,
    MARKETING_TTL_SECONDS,
  );

export const getSubjects = () =>
  fetchPublic<{ subjects: SubjectListItem[] }>("/api/v1/subjects", MARKETING_TTL_SECONDS);

/**
 * One public expert, for server-rendered metadata on `/experts/[slug]`.
 * The page body itself stays a client component; this only feeds
 * `generateMetadata` + JSON-LD, which cannot run in the browser.
 */
export const getPublicExpert = (slug: string) =>
  fetchPublic<PublicExpertDetail>(
    `/api/v1/experts/${encodeURIComponent(slug)}`,
    MARKETING_TTL_SECONDS,
  );

export const getExpertsForSubject = (slug: string, pageSize = 12) =>
  fetchPublic<{ results: DirectoryExpert[] }>(
    `/api/v1/experts?subject=${encodeURIComponent(slug)}&page_size=${pageSize}`,
    MARKETING_TTL_SECONDS,
  );
