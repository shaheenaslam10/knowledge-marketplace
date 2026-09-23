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

1. Backend publishes OpenAPI 3 (`drf-spectacular`) at `/api/schema/`.
2. `npm run generate:api` runs `openapi-typescript` → `src/lib/api/schema.d.ts`; a thin `apiFetch` wrapper adds credentials, error envelope parsing (`{error:{code,message,details}}`), and 401→refresh→retry.
3. Frontend **never** hand-writes endpoint types — contract drift is caught at CI (schema hash check + typecheck).

## Auth handling

- JWT lives in **httpOnly cookies set by the backend**; frontend JS never touches tokens.
- Middleware (`src/middleware.ts`) guards role layouts: unauthenticated → login redirect with `?next=`; wrong-role → 403 page. Real authorization remains server-side; this is UX only.
- Login/register/verify pages call auth endpoints; global 401 handler clears session state.

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
