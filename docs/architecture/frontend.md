# Frontend Architecture — Next.js (domain-oriented)

> Status: 📐 Phase 0 · Last updated: 2026-09-23

## Stack

- **Next.js (App Router) + TypeScript** (strict) + **Tailwind CSS**; npm as package manager (lowest-friction for contributors).
- Server Components by default; client components only where interactivity demands (forms, chat, real-time bits).
- State: server state via fetch + React `cache`/router refresh; minimal client state (Zustand for chat/notifications toasts). No global data-fetching framework in MVP.

## Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (public)/            # SEO surfaces: page.tsx for /, /experts, /experts/[slug],
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
- **Phase 3 role-specific surfaces** (`src/features/experts`, middleware-protected where authed): student onboarding `/onboarding/student` (self-service, taxonomy interest chips), expert pipeline `/expert/apply` (form + credential upload + attestations) and `/expert/application` (lifecycle status incl. reviewer reason), `/expert/profile` (post-approval editing, availability pause, directory opt-out), and the public directory `/experts` + `/experts/[slug]` (approved experts only). Admin management deliberately stays in Django admin — there is no admin UI flow (ADR-0011).
- `apiFetch` sends `credentials: "include"` and `X-Requested-With` on mutations; on 401 the caller drives UX (sign-in redirect) — no transparent refresh-retry loop (documented decision).
- Global 401 handling: session context flips to `unauthenticated`, guarded layouts redirect to login.

## Rendering & SEO

| Route type | Strategy |
|---|---|
| `/`, `/how-it-works`, `/pricing` | SSG (+ revalidate) |
| `/experts`, `/experts/[slug]`, `/subjects/[slug]` | SSR/ISR with `generateMetadata`, JSON-LD, canonical, `sitemap.ts` fed by backend public endpoints |
| dashboards/flows | CSR behind auth, `noindex` |

## UX system

- Tailwind + a small set of primitives; dark-mode-ready tokens; skeleton loaders; toast system fed by the notifications WS channel; empty/error states designed per feature (not thrown).
- Forms: react-hook-form + zod schemas (client validation mirrors backend rules, but server is authority).
- Money display via `lib/money` (minor units → locale format); dates always in user timezone with deadline countdowns.

## Testing

- Vitest + Testing Library: feature unit tests (forms, money utils, offer state logic).
- Playwright: one smoke E2E per critical path (register → post request → offer → accept → pay (Stripe test) → deliver → approve) run against docker-compose stack in CI.
- Typecheck + ESLint gate every PR.
