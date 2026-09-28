import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * seo-ux.md indexing policy: marketing + expert profiles are indexable,
 * "dashboards/API — everything else — noindex, follow".
 *
 * The previous version of this file allowed `/` and nothing else, which meant
 * signed-in surfaces (`/orders`, `/messages`, `/portal/*`, auth screens) were
 * advertised as crawlable. They 302 to login for an anonymous crawler rather
 * than leaking data, but they still burn crawl budget and can surface bare
 * login redirects in search results. Deny them at the robots layer; the
 * per-route `noindex` meta remains the authoritative second line of defence.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        // Authenticated application surfaces — the `(app)` group.
        "/account",
        "/assignments",
        "/expert/",
        "/messages",
        "/offers",
        "/onboarding/",
        "/opportunities",
        "/orders",
        "/requests",
        // Staff operations — the `(portal)` group.
        "/portal",
        // Auth screens have no standalone search value.
        "/login",
        "/register",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
