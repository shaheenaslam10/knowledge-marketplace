# Frontend Architecture — Next.js (domain-oriented)

> Status: ✅ Phase 1–3 implemented · **Phase 3.5: three-experience structure + design system adopted (ADR-0013/0014)** · Last updated: Phase 3.5

## Stack

- **Next.js (App Router) + TypeScript** (strict) + **Tailwind CSS**; npm as package manager (lowest-friction for contributors).
- Server Components by default; client components only where interactivity demands (forms, chat, real-time bits).
- State: server state via fetch + React `cache`/router refresh; minimal client state (Zustand for chat/notifications toasts). No global data-fetching framework in MVP.

## Three web experiences (Phase 3.5 refinement)

The single Next.js app now serves **three experiences** — marketing (`(marketing)`, www), the role-aware marketplace app (`(auth)`+`(app)`, app.), and the operations portal (`(portal)`, admin., `/portal/*` in dev) — separated by route groups + experience shells over **one** shared design system and **one** API. Full structure, host mapping and boundaries: [web-experiences.md](web-experiences.md) (ADR-0013).

## Design system & motion (normative docs)

Product-specific design system on Tailwind v4 CSS-first tokens: [../design/design-system.md](../design/design-system.md) · motion profiles per experience: [../design/motion-system.md](../design/motion-system.md) · per-pattern selection record incl. bundle-cost notes: [../design/component-selection.md](../design/component-selection.md). Stack decisions (ADR-0014): shadcn/ui vendored+customized as the component foundation, `motion/react` as the only animation runtime, selective Aceternity patterns for marketing storytelling, SVG/Canvas visuals (no WebGL at launch), Lucide icons. Dependency policy: new frontend deps require a line in component-selection.md.

## Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (marketing)/         # renamed from (public) in Phase 4 slice: www surfaces: page.tsx for /, /experts, /experts/[slug],
│   │   │                        # /subjects/[slug], /how-it-works, /pricing
│   │   ├── (auth)/              # /login, /register, /verify, /reset-password (minimal layout)
│   │   ├── (student)/           # /dashboard, /requests/*, /orders/*   (auth-guarded layout)
│   │   ├── (expert)/            # /expert/*                            (role-guarded layout)
│   │   ├── messages/            # cross-role
│   │   ├── admin-redirect/      # points staff to Django admin
│   │   ├── sitemap.ts / robots.ts
│   │   └── layout.tsx
│   ├── features/                # DOMAIN modules — the modularity rule
│   │   ├── auth/                # forms, guards, session hooks
│   │   ├── requests/            # post/edit wizard, detail, lists
│   │   ├── offers/              # offer cards, accept/decline flows
│   │   ├── managed/             # invitations, quotes
│   │   ├── orders/              # workspace, delivery, revisions, timeline
│   │   ├── payments/            # Stripe Elements wrapper, payment states
│   │   ├── messaging/           # thread UI + WS client
│   │   ├── notifications/       # bell, toasts, preferences
│   │   ├── files/               # uploader, secure viewer
│   │   ├── reviews/ disputes/
│   │   └── expert-profile/      # application wizard, public profile, availability
│   ├── components/ui/           # design-system primitives (Button, Input, Card, Badge, Modal…)
│   ├── lib/                     # api client, ws client, money fmt, dates, constants
│   ├── hooks/                   # shared react hooks
│   └── types/                   # shared TS types
├── public/
├── next.config.ts
└── package.json
```

**Coupling rules** (mirrors backend): `app/` routes are thin — they import from `features/*` only; features never import each other's internals (shared stuff goes down to `components/ui` or `lib`); all backend access goes through `lib/api` typed client generated from OpenAPI (below).

## API client & type safety (keeps coupling low)

1. Backend publishes OpenAPI 3 (`drf-spectacular`) at `/api/schema/` — live since Phase 1.
2. Phase 1 ships the hand-written envelope-aware `apiFetch` client (`src/lib/api/client.ts`); the generated-typed-client step (`openapi-typescript` → `src/lib/api/schema.d.ts`, `npm run generate:api`) is introduced with the first domain API (Phase 2/3) — there is no endpoint surface worth generating yet.
3. Frontend **never** hand-writes endpoint types once generation exists — contract drift is caught at CI (schema hash check + typecheck).

## Auth handling — ✅ Phase 2 foundation implemented

- JWT lives in **httpOnly cookies set by the backend**; frontend JS never touches tokens.
- `SessionProvider` (`src/features/auth/SessionProvider.tsx`) holds client session state (`loading`/`authenticated`/`unauthenticated` from `GET /api/v1/me`) + logout; root-layout scoped so every route group shares it.
- Middleware (`src/middleware.ts`) guards protected routes by cookie **presence** (no secret at the edge — UX only): anonymous → `/login?next=`; cookie holders are redirected off login/register. Real authorization remains server-side; role-gated route groups arrive with their phases.
- Auth surfaces live (`src/app/(auth)`): `/login`, `/register`, `/verify-email`, `/reset-password`, `/reset-password/confirm` — loading/error states with the backend's stable error codes mapped to copy (`src/features/auth/errors.ts`); `(protected)/account` proves the guarded layout. API surface: `src/features/auth/api.ts`.
- **Phase 3 role-specific surfaces** (`src/features/experts`, middleware-protected where authed): student onboarding `/onboarding/student` (self-service, taxonomy interest chips), expert pipeline `/expert/apply` (form + credential upload + attestations) and `/expert/application` (lifecycle status incl. reviewer reason), `/expert/profile` (post-approval editing, availability pause, directory opt-out), and the public directory `/experts` + `/experts/[slug]` (approved experts only). Admin management deliberately stays in Django admin — there is no admin UI flow (ADR-0012).
- `apiFetch` sends `credentials: "include"` and `X-Requested-With` on mutations; on 401 the caller drives UX (sign-in redirect) — no transparent refresh-retry loop (documented decision).
- Global 401 handling: session context flips to `unauthenticated`, guarded layouts redirect to login.

## Rendering & SEO

**Every document route renders on demand.** The root layout awaits `headers()`, which
opts the whole tree out of static prerendering. That is a hard requirement of the
enforced nonce CSP, not a performance preference — see *Why nothing is prerendered*
below and **ADR-0018**. `/robots.txt` is the one static output (it ships no scripts).

| Route type | Strategy |
|---|---|
| `/`, `/how-it-works` | On-demand render |
| `/pricing` | On-demand render + **60s** data cache — see note below |
| `/about` | On-demand render (no live backend data, but see ADR-0018) |
| `/for-experts`, `/subjects`, `/subjects/[slug]` | On-demand render + **1h** data cache — same build-time constraint as `/pricing` |
| `/experts`, `/experts/[slug]` | Client-component bodies + **server `layout.tsx` for SEO** — per-page `generateMetadata` (title, description, canonical, OG) and `ProfilePage`/`Person` JSON-LD on the profile |

> **How SEO works on the two expert routes.** Both `page.tsx` files are
> `"use client"` (they own filter state, the reviews feed, availability and loading
> states), and a client module has no server render pass, so it cannot export
> `generateMetadata`. Until 2026-09-28 that meant every expert profile — the most
> indexable content type in a directory marketplace, and a route listed in
> `sitemap.ts` — inherited the root layout's generic title with no canonical and no
> structured data.
>
> The fix is a **sibling server layout** in each segment rather than a rewrite of the
> interactive pages: `experts/layout.tsx` (static directory metadata) and
> `experts/[slug]/layout.tsx` (fetches the expert through `getPublicExpert()` for
> metadata + JSON-LD, then renders `{children}` unchanged). The tested client
> components were not touched and their bundle sizes are identical.
>
> Honest-data rules baked in: an unknown expert or an unreachable API yields
> `title: "Expert profile"` with `robots: noindex, follow` and **no** JSON-LD — never a
> fabricated name — while the page body still renders its own "This expert profile is
> not available" state. `aggregateRating` is emitted **only** when real reviews exist,
> so the structured data can never claim a rating the platform does not have. A missing
> profile inherits the directory's canonical (`/experts`) from the parent layout, which
> is the sensible target and is moot under `noindex`.

**Why nothing is prerendered (post-Phase-12 audit).** The production policy is
`script-src 'self' 'nonce-<n>' 'strict-dynamic'`. `'strict-dynamic'` makes browsers
**ignore `'self'`**, so the per-request nonce is the only thing that can authorise a
script. A prerendered page is built with no request, so Next cannot stamp that nonce
onto its bootstrap scripts — the page then returns `200` with flawless SSR HTML and a
flawless CSP header while executing **no JavaScript at all**. Before this was fixed,
33 of 45 routes were prerendered, including `/login`, `/register` and every `/portal/*`
page; all of them were inert in a production build. Static rendering is therefore not
available to document routes while the policy is enforced. Regression coverage lives in
`frontend/e2e/csp-nonce.spec.ts` and in `scripts/smoke_test.sh`.

**Why `/pricing` is not SSG (Phase 12).** It renders live commission rates from
`GET /api/v1/platform/pricing`, and two things ruled prerendering out:

1. The web image is built independently of the API container (`docker-compose.prod.yml`
   builds `./frontend` with no API reachable). A prerendered page therefore bakes the
   degraded "rates unavailable" state into the HTML and ISR keeps serving it. This was
   observed, not theorised — the first build of the page shipped exactly that.
2. Commission is fixed at the moment an order is booked. Every second the page shows a
   stale rate is a second a student can book at a rate the page never advertised, so the
   data cache is 60s rather than the 1h used for static marketing copy.

Net cost is one config read per minute; `next: { revalidate }` on the fetch keeps repeat
visitors on the data cache. A failed fetch is deliberately *not* cached, so a transient
API blip recovers on the next request instead of pinning the degraded state.

`sitemap.ts` is `force-dynamic` for reason (1) as well — a build-time fetch would ship a
sitemap with no expert profiles in it.

Reason (1) applies to **every** public page that reads backend data, so the three
decisions it forces (never prerender, cache the data not the route, never cache a
failure) are implemented once in `src/lib/api/public.ts` rather than copied per page.
`MARKETING_TTL_SECONDS` is 1h; `PRICING_TTL_SECONDS` is 60s because commission is
money. Callers receive `{ data, notFound }` so a page can tell "the backend says this
subject does not exist" (→ `notFound()`) from "the backend is unreachable" (→ degrade
in place). Conflating those would delete real subject pages during an API outage.
| dashboards/flows | CSR behind auth, `noindex` |

## UX system

- Tailwind + a small set of primitives; dark-mode-ready tokens; skeleton loaders; toast system fed by the notifications WS channel; empty/error states designed per feature (not thrown).
- Forms: react-hook-form + zod schemas (client validation mirrors backend rules, but server is authority).
- Money display via `lib/money` (minor units → locale format); dates always in user timezone with deadline countdowns.

## Testing

- Vitest + Testing Library: feature unit tests (forms, money utils, offer state logic).
- Playwright: one smoke E2E per critical path (register → post request → offer → accept → pay (Stripe test) → deliver → approve) run against docker-compose stack in CI.
- Typecheck + ESLint gate every PR.