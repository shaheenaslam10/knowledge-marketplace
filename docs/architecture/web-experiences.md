# Web Product Architecture — Three Experiences, One Product

> Status: ✅ adopted (pre-Phase-4 refinement) · Last updated: Phase 3.5 · ADR-0013 · Related: [frontend](frontend.md), [design system](../design/design-system.md), [seo-ux](seo-ux.md)

## Decision in one paragraph

The product ships **three distinct web experiences** — the **Public Marketing Website**, the **Marketplace Application** (students *and* experts, one role-aware app), and the **Admin/Operations Portal** — while remaining **one repository, one Next.js application, one backend/API, one PostgreSQL database, one design system**. The experiences are separated at the code level by **route groups + experience shells**, and at the URL level by **paths first, subdomains at deploy time**. This is a product structure, not three systems (ADR-0013).

## The three experiences

| | A. Marketing website | B. Marketplace application | C. Admin / operations portal |
|---|---|---|---|
| Purpose | SEO, brand, acquisition, trust, expert discovery, pricing/business model, FAQs, content, registration/login entry points, expert recruitment | The product: role-aware workspace for students and experts after authentication | Internal operations: expert approval, requests, assignments, orders, payments, disputes, moderation, audit, analytics |
| Audience | Prospective students/experts, search engines | Authenticated users (both roles) | Owners, admins, support, moderation, finance (future roles) |
| URL (dev) | `/` , `/experts` , `/pricing` , `/how-it-works` , `/for-experts` , `/about` , `/legal/*` , `/blog/*` (later) | `/login` , `/register` , `/account` , `/onboarding/*` , `/expert/*` , `/student/*` , `/dashboard` , `/messages/*` , `/orders/*` , `/requests/*` , `/settings` (functional areas arrive with their phases) | `/portal` , `/portal/expert-applications` , `/portal/users` , `/portal/orders` , `/portal/finance` , `/portal/moderation` , `/portal/audit` , `/portal/analytics` |
| URL (prod) | `www.<domain>` | `app.<domain>` | `admin.<domain>` |
| Route group | `(marketing)` | `(auth)` + `(app)` | `(portal)` |
| Feel | Premium, cinematic, editorial — animated storytelling | Alive but productivity-first — motion supports usability | Data-dense, fast, minimal animation |
| Dark mode | Dark hero sections on light pages | Light default, full dark support | Light, density-first |

## Structure rules (same repo, one app)

1. **One Next.js app, three route groups.** `(marketing)`, `(app)`/`(auth)`, `(portal)` each own their **shell** (header/nav/footer, chrome) and **layout motion profile**. No shared page code — shared code lives **down** in `src/components/ui` (design-system primitives), `src/components/patterns` (motion patterns), `src/features/*` (domain modules), `src/lib/*`.
2. **One shared design system.** Tokens, primitives and patterns are defined once (docs/design/design-system.md) and consumed by all three experiences. Density, motion and surface treatments differ per experience — the components support this via variants/tokens, never forks.
3. **Backend/API stays the single source of truth.** All three experiences talk to the same `/api/v1` with the same httpOnly-cookie auth and the same role dict. The admin portal is **an additional UI over the same API** — it does not bypass services; staff authorization stays server-side (`IsAdmin`/`IsSupport` + groups).
4. **Django admin remains the ops tool until the portal phase** (ADR-0010 stands). The `(portal)` shell is scaffolding-only until the "Admin operations" phase; no fake dashboards get built now.
5. **Separation is enforced, not conventional:** ESLint import boundaries will forbid `(marketing)` pages importing `(app)`-only feature modules and vice versa (domain features are app-experience code; marketing composes public selectors only). The portal may import anything read-only today; write actions must go through the same backend services.

## URL ↔ host mapping (deploy-time, not build-time)

URLs are the contract; subdomains are a reverse-proxy/middleware mapping:

| Host | Serves | Rule |
|---|---|---|
| `www.<domain>` | `(marketing)` + links out to app auth | marketing paths only |
| `app.<domain>` | `(auth)` + `(app)` | app paths only; `/` → redirect to `www` home |
| `admin.<domain>` | `(portal)` (`/portal/*`) | staff-only surface; session/role enforced by API |

Implementation: **middleware is host-aware but path-authoritative.** In dev (`localhost:3000`) every path works as-is. In production, hosts are pinned by the reverse proxy and `middleware.ts` redirects mismatched host/path combinations (e.g. `app.` + `/pricing` → `www.<domain>/pricing`). No multi-zone builds, no second frontend app — if marketing dependencies ever bloat the shared bundle beyond budget, **Next.js Multi-Zones is the documented escape hatch** (same repo, three `next build` targets), evaluated only against the performance budget in docs/design/design-system.md §Performance.

## Route inventory (current + planned)

Current (Phase 1–3): `(marketing)`: `/`, `/how-it-works`, `/experts`, `/experts/[slug]` · `(auth)`: `/login`, `/register`, `/verify-email`, `/reset-password(+/confirm)` · `(app)`: `/account`, `/onboarding/student`, `/expert/apply`, `/expert/application`, `/expert/profile` · middleware guards: `/account/*`, `/onboarding/*`, `/expert/*`.

Arrives with Phase 4+ (roadmap): student `/dashboard`, `/requests/*`, `/offers/*`, `/orders/*`, `/messages/*`, `/files`, `/reviews`, `/settings`; expert opportunities/earnings views; `(portal)` shell + first operations screens (Admin operations phase); marketing `/pricing`, `/for-experts`, `/about`, `/legal/*`, `/blog/*`.

## Mobile-first requirement

All three experiences are designed **mobile-first** (see design-system.md §Responsive): marketing sections stack with reduced ambient motion; the app uses bottom-nav + sheet patterns on small screens (drawers over modals, sticky primary actions); the portal prioritizes card-wrapped tables with horizontal scroll containment and filters-as-drawers. No surface is designed desktop-first and shrunk.
