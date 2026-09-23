# SEO, Responsive, Accessibility & Performance

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## SEO architecture

**Crawlable surface (the strategy):** public pages are Next.js server-rendered with complete metadata; dashboards are noindex.

| Page | Route | Indexing | Notes |
|---|---|---|---|
| Home | `/` | yes | value prop, both modes, subject links, stats |
| Expert directory | `/experts` (+filters via `?`, canonical to base) | yes | internal linking hub |
| Expert profile | `/experts/[slug]` | yes (if `list_in_directory`) | JSON-LD `Person` + `AggregateRating` (when ≥3 reviews); otherwise `noindex` |
| Subject pages | `/subjects/[slug]` | yes | "Find help in {subject}" — directory of experts + how-it-works snippet; hub-and-spoke internal links |
| How it works / Pricing | `/how-it-works`, `/pricing` | yes | FAQPage JSON-LD; trust content targeting long-tail queries |
| Dashboards/API | everything else | `noindex, follow` | robots + meta |

Mechanics: `generateMetadata` per route (title templates, descriptions, canonical, OG/Twitter cards with generated OG images for profiles), `sitemap.ts` (static routes + experts + subjects, `Last-Modified` from updated_at), `robots.ts`, 404/410 handling, `hreflang` deferred (single-locale MVP). Performance is an SEO feature: budgets below.

**Content roadmap note (post-MVP):** blog/study-guides CMS is the planned authority play (see mvp-scope) — routes and design reserved.

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
