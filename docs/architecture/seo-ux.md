# SEO, Responsive, Accessibility & Performance

> Status: 📐 Phase 0 · visual/performance direction updated Phase 3.5 (design system) · Last updated: Phase 3.5

## SEO architecture

**Crawlable surface (the strategy):** public pages are Next.js server-rendered with complete metadata; dashboards are noindex.

| Page | Route | Indexing | Notes |
|---|---|---|---|
| Home | `/` | yes | value prop, both modes, subject links, stats |
| Expert directory | `/experts` (+filters via `?`, canonical to base) | yes | internal linking hub |
| Expert profile | `/experts/[slug]` | yes (if `list_in_directory`) | JSON-LD `Person` + `AggregateRating` (when ≥3 reviews); otherwise `noindex` |
| Subject pages | `/subjects/[slug]` ✅ | conditional | "Find help in {subject}" — directory of experts + how-it-works snippet; hub-and-spoke internal links. **Shipped Phase 12.** A subject with **no experts** is served `noindex, follow` and omitted from the sitemap: the page exists and has a real empty state, but there is nothing there worth ranking, and sitemapping a noindex URL is a contradictory signal. |
| Subject hub | `/subjects` ✅ | yes | **Added, not in the original spec.** seo-ux asked for "hub-and-spoke internal links" but never named a hub; without one the spokes were reachable only from the sitemap and from each other — a crawl island, and useless to humans. This is that hub and the breadcrumb target for every subject page. |
| Expert acquisition | `/for-experts` ✅ | yes | FAQPage JSON-LD; commission read live so the supply-side pitch cannot contradict the pricing page |
| About | `/about` ✅ | yes | No live backend data, but rendered on demand like every document route (nonce CSP — ADR-0018) |
| How it works / Pricing | `/how-it-works`, `/pricing` ✅ | yes | FAQPage JSON-LD; trust content targeting long-tail queries. **Pricing shipped Phase 12** — commission rates render from `GET /api/v1/platform/pricing` (PlatformConfig-backed), never hard-coded, so the published rate cannot drift from the rate actually charged. Rendered on demand with a 60s data cache, not prerendered (see frontend.md). |
| Dashboards/API | everything else | `noindex, follow` | robots + meta |

Mechanics: `generateMetadata` per route (title templates, descriptions, canonical, OG/Twitter cards with generated OG images for profiles), `sitemap.ts` (static routes + experts + subjects, `Last-Modified` from updated_at), `robots.ts`, 404/410 handling, `hreflang` deferred (single-locale MVP). Performance is an SEO feature: budgets below.

**Status (Phase 12).** `sitemap.ts` and `robots.ts` are implemented and covered by
`frontend/src/app/sitemap.test.ts` (8 tests).

- `sitemap.ts` lists the ten public marketing routes, every **staffed** subject, and
  every approved expert profile, walking the directory's cursor pages (capped at
  25 × 100). Two deliberate deviations from the line above: subjects with no experts
  are **excluded** (their pages are `noindex` — see the table); and `Last-Modified`
  uses **`approved_at`**, because the public expert serializer intentionally does not
  expose `updated_at` and widening a public payload to decorate a sitemap is the wrong
  trade. If either API is unreachable the sitemap degrades to the static routes
  rather than 500-ing. Verified live: with the API down it serves 10 static entries
  and zero dynamic ones.
- `robots.ts` previously allowed `/` and nothing else, which advertised every
  authenticated surface as crawlable. It now disallows the `(app)` and `(portal)`
  route groups, `/api/`, and the auth screens, and points at `/sitemap.xml`. Those
  surfaces redirect anonymous crawlers to login rather than leaking data, so this is
  crawl-budget and SERP hygiene, not a confidentiality fix; per-route `noindex` meta
  remains the authoritative control.
- OG image generation for profiles remains unbuilt (Phase 4+ marketing scope).
- Open Graph metadata is present on `/`, `/pricing`, `/subjects`, `/subjects/[slug]`,
  `/for-experts` and `/about`.

**Content roadmap note (post-MVP):** blog/study-guides CMS is the planned authority play (see mvp-scope) — routes and design reserved.

**`/blog/*` remains unbuilt, and that is a decision, not an omission.**
`docs/product/mvp-scope.md` lists "Blog/CMS for SEO content" in the *out-of-MVP*
table with the rationale "Directory + subject pages first", and the repository
contains no blog model, content API, CMS integration, markdown/MDX pipeline or
admin content management to build on. Shipping a blog would mean introducing a
content system the product has explicitly deferred — so the subject pages that
the same rationale prioritises were built instead. Revisit when the content
roadmap is actually started.

## Visual & product direction (Phase 3.5)

Positioning: a **premium SaaS/AI-era expert marketplace**, not a tutoring portal. Brand = "precise intelligence": warm-paper neutrals + iris accent + teal flow highlights, Inter typography, dark cinematic marketing sections, motion with purpose. Normative: [../design/design-system.md](../design/design-system.md) (tokens, components, budgets), [motion-system.md](../design/motion-system.md), [component-selection.md](../design/component-selection.md). Performance budgets are consolidated there and enforced in CI with the design-foundation slice of Phase 4.

## Responsive / mobile requirements

- Mobile-first Tailwind; breakpoints 360→1536; primary flows (post request, accept offer, review delivery, chat) must be fully usable at 375px width.
- Navigation: bottom-tab pattern on mobile for role dashboards; safe-area padding; 44px touch targets.
- Chat + notifications feel native: optimistic UI, keyboard-aware inputs, toasts.
- No native app; installable PWA is a post-MVP enhancement (manifest + service worker reserved).

## Accessibility (target: WCAG 2.1 AA)

- Semantic HTML first; landmarks; skip-link; visible focus states; keyboard-operable menus/modals (focus trap + restore).
- Color contrast ≥ 4.5:1 (checked in CI via a Tailwind palette audit + axe lint); never color-only status (badges carry text).
- Forms: real labels, error text tied via aria-describedby, `aria-live` for async errors/toasts.
- Chat: logical reading order, unread announcements via live region; media always has text alternatives.
- Automated: axe checks in Playwright smoke; manual screen-reader pass on critical flows at Phase 12.

## Performance requirements & budgets

| Metric | Budget |
|---|---|
| LCP (public pages, mobile 4G) | < 2.5s |
| TTFB SSR | < 400ms server-side |
| JS shipped (public pages) | < 150KB gzip |
| API p95 | < 300ms (DB-local) |
| Images | next/image, AVIF/WebP, sized; avatars 128px |

Tactics: server components + minimal client JS; route-level code splitting by feature; DB: indexes per database doc + `select_related/prefetch_only` discipline in selectors; caching: Next `revalidate` for public pages, single-row PlatformConfig cache in backend; no CDN in MVP (Cloudflare free noted as the first free lever).