# Component & Pattern Selection

> Status: ✅ adopted (pre-Phase-4) · Last updated: Phase 3.5 · ADR-0014 · Related: [design system](design-system.md), [motion system](motion-system.md)

Process (mandatory before building any major surface): **search ready-made → select best fit → record here → adapt to tokens → implement consistently.** Nothing is invented from scratch while a maintained pattern exists; nothing is vendored without this record. Sources: shadcn/ui (application foundation), Aceternity UI (marketing storytelling, vendored selectively), Motion for React (all choreography), Lucide (icons), Recharts (admin charts, later). Visually incompatible styles are rejected — everything passes through our tokens.

## Foundation kit (shadcn/ui — customized, not stock)

| # | Component/pattern | Source | Purpose / surface | Why selected | Adaptations | Performance |
|---|---|---|---|---|---|---|
| F1 | Button, Input, Textarea, Label, Select, Checkbox, Switch, RadioGroup | shadcn/ui | All forms across app + portal + marketing CTAs | Radix a11y for free; consistent states | Re-skinned to tokens (iris primary, radius `md`, 44px touch), loading-state added | Tree-shaken per component; no global CSS bloat |
| F2 | Dialog, Sheet/Drawer, DropdownMenu, Popover, Tooltip, Tabs, Command, Combobox | shadcn/ui (Radix) | App workflows (offer detail, filters, ⌘K palette, settings), portal inspectors | Focus trap, escape, a11y solved | Motion (`motion/react`) presence animations per motion-system; sheet gestures on mobile | Portal-free until mounted |
| F3 | Table, Card, Badge, Avatar, Skeleton, Separator, Pagination, Breadcrumb, Alert, Progress, Toast (Sonner) | shadcn/ui | Lists/dashboards (app), dense grids (portal), status system everywhere | Dense, composable, themeable | Badge = status-token map (dot+label); Card radius/shadow tokens; Table wrapped for mobile-card rendering | Sonner lazy-mounted |
| F4 | Calendar/DatePicker, DataTable (TanStack) | shadcn/ui patterns | Deadlines (Phase 4 requests), portal tables | Same family as F1–F3 | Column density tokens; mobile card-mode wrapper | TanStack only in portal/app lists that need it |

## Marketing storytelling (Aceternity UI — vendored selectively into `src/components/patterns/marketing/`)

| # | Pattern | Source | Purpose / surface | Why selected | Adaptations | Performance |
|---|---|---|---|---|---|---|
| M1 | Hero section w/ Spotlight + moving light beams | Aceternity (Spotlight, Background Beams) | `/` hero on dark canvas | Delivers the "AI-era premium" first impression with modest cost | Re-skinned iris/teal at low opacity; text reveal via our Motion tokens; final CTA routes to register | Static SVG/CSS beam animation, `prefers-reduced-motion` → static gradient; ≤1 ambient layer |
| M2 | Bento grid (features) | Aceternity (Bento Grid) | `/` product capabilities, `/for-experts` | Premium SaaS layout for heterogeneous feature content | Our Card tokens inside cells; one cell hosts the matching-network visual (M7) | Grid is static CSS; cell hover lift only |
| M3 | Text generate / reveal effect | Aceternity (Text Generate Effect) | Hero headline, section intros | Editorial reveal without video | Word-stagger via shared Motion tokens (not its custom hook), reduced-motion → static | Opacity-only |
| M4 | Infinite moving cards (testimonials) | Aceternity (Infinite Moving Cards) | `/` social proof row | Calm continuous credibility signal | Slow loop ≥30s, pause on hover, our Card skin, static stack under reduced-motion | CSS transform loop; duplicate list aria-hidden |
| M5 | Parallax illustration layers | Aceternity (Parallax) + `motion/react` `useScroll` | How-it-works section, expert showcase | Depth without heavy media | Ranges ±24px; illustration = our SVG network style | Transform-only, rAF-batched |
| M6 | CTA section (glowing border card) | Aceternity (Glowing Effect / Spotlight card) | `/` closing conversion, `/for-experts` | Single decisive closer, consistent with hero language | Iris glow at 20% on dark; button = F1 primary | Glow via pre-rendered pseudo-layer cross-fade (no animated box-shadow) |

**Rejected from Aceternity (recorded so they aren't re-proposed):** 3D card (WebGL-adjacent mouse tracking cost), Shooting stars/meta-balls (novelty > UX), ever-heavy background orbs beyond hero (clutter), animated modals (we use F2).

## Bespoke patterns (built once, reused)

| # | Pattern | Source | Purpose / surface | Why built | Notes | Performance |
|---|---|---|---|---|---|---|
| B1 | Expert↔student **matching network** visualization | Custom (SVG + Canvas fallback) | `/` hero side-panel + how-it-works; concept motif for empty states | The product's core idea (intelligent matching) deserves a signature visual no library provides | ~60 nodes, iris/teal edges, gentle pulse; respects reduced-motion (static frame) | ≤80 nodes, DPR≤2, pauses off-screen/hidden tab |
| B2 | Lifecycle stepper (application/order) | Custom on F3 primitives | `/expert/application`, future orders | State machine legibility (ADR-0012) | Forward-only fill animation; badge tokens | Opacity/transform only |
| B3 | Status badge system | Custom map on F3 Badge | Everywhere | One source for lifecycle colors | Driven by `APPLICATION_STATUS_COPY` + server role dict | — |
| B4 | Directory card (expert) | Custom on F3 Card + M-hover | `/experts`, marketing showcase strip | Reused across public surfaces | Availability badge, subject chips, rating line | Hover lift only |

## Motion runtime

| # | Pattern | Source | Purpose / surface | Why selected | Adaptations | Performance |
|---|---|---|---|---|---|---|
| A1 | Presence/entrance choreography (`motion/react`, AnimatePresence) | Motion for React | All three experiences per motion-system profiles | One runtime, gesture/layout-aware, rAF-batched | Tokens centralized in `src/lib/motion.ts` | Transform/opacity rule; reduced-motion global wrapper |
| A2 | Page content transitions | Motion (`template.tsx` cross-fade) | App experience routes | Continuity without SPA jank | ≤200ms fade only | No route-level choreography |

## Deferred decisions (explicitly not chosen now)

- **React Three Fiber / Three.js:** deferred (ADR-0014) — revisit only with a hero concept whose benefit clearly beats the ~150KB+ JS cost against the marketing budget; SVG/Canvas B1 covers the need at launch.
- **Recharts (via shadcn chart):** selected for the Admin-operations phase analytics screens; not installed before then.
- **Embla carousel (shadcn carousel):** candidate for expert showcase strip if B4 static grid under-serves; decide during marketplace UX implementation.

## Installation policy

shadcn components are vendored into `src/components/ui` (own the code; customize to tokens) via the CLI per-component — never `npx shadcn add --all`. Aceternity pieces are vendored into `src/components/patterns/marketing/<name>` with the header comment `Source: Aceternity <name> — adapted per docs/design/component-selection.md#M<x>` and a dependency diff note. `motion` (the `motion/react` package) is the single new runtime dependency; Radix packages arrive only as shadcn component prerequisites. Bundle-cost audit lands with the design-foundation slice of Phase 4 (CI bundle check).
