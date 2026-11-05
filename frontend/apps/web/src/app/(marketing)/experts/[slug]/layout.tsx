import type { Metadata } from "next";

import { getPublicExpert } from "@/lib/api/public";
import { SITE_URL } from "@/lib/config";

/**
 * Server-side SEO for the expert profile.
 *
 * `page.tsx` is a client component (it owns the reviews feed, availability and
 * loading states), so it cannot export `generateMetadata` — a client module has
 * no server render pass to produce `<head>` from. Without this layout every
 * expert profile inherited the root layout's generic title and description,
 * which meant the single most indexable content type in a directory
 * marketplace — and a route listed in `sitemap.ts` — shipped no per-expert
 * title, canonical or structured data.
 *
 * A sibling layout is the surgical fix: Next renders it on the server, so the
 * metadata and JSON-LD are real HTML, while the interactive page below is left
 * exactly as it was (and as its tests expect).
 */

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

function ratingOf(expert: { rating_avg?: string | number; rating_count?: number }) {
  const count = Number(expert.rating_count ?? 0);
  const value = Number(expert.rating_avg ?? 0);
  return count > 0 && value > 0 ? { value, count } : null;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: expert } = await getPublicExpert(slug);

  // Unreachable API or unknown expert: never invent a name, and never let a
  // placeholder page get indexed. The page body renders its own "not found"
  // state, so this stays metadata-only.
  if (!expert) {
    return { title: "Expert profile", robots: { index: false, follow: true } };
  }

  const canonical = `${SITE_URL}/experts/${expert.slug}`;
  const description =
    expert.headline?.trim() ||
    expert.expertise_summary?.trim() ||
    `${expert.display_name} is a vetted expert on Hybrid Expert Marketplace.`;

  return {
    title: `${expert.display_name} — ${expert.expertise_summary || "vetted expert"}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${expert.display_name} · Hybrid Expert Marketplace`,
      description,
      url: canonical,
      type: "profile",
    },
  };
}

export default async function ExpertProfileLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const { data: expert } = await getPublicExpert(slug);

  if (!expert) return <>{children}</>;

  const canonical = `${SITE_URL}/experts/${expert.slug}`;
  const rating = ratingOf(expert);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonical,
    mainEntity: {
      "@type": "Person",
      name: expert.display_name,
      description: expert.headline || expert.expertise_summary || undefined,
      url: canonical,
      knowsAbout: expert.subjects?.map((subject) => subject.name) ?? [],
      knowsLanguage: expert.languages
        ? expert.languages.split(",").map((language) => language.trim()).filter(Boolean)
        : undefined,
      // Only published when real reviews exist — a fabricated rating is both a
      // lie to users and a structured-data violation.
      ...(rating
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: rating.value,
              reviewCount: rating.count,
            },
          }
        : {}),
    },
  };

  return (
    <>
      {/* ld+json is a data block: the HTML spec stops preparing it before the
          CSP check, so script-src never applies and no nonce is needed. Adding
          one would require headers(), which is not free. See ADR-0017. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
