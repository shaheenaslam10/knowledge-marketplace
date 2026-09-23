# Design System — Hybrid Expert Marketplace

> Status: ✅ implemented in the Phase 4 design-foundation slice · Last updated: Phase 4 · ADR-0014 · Related: [motion system](motion-system.md), [component selection](component-selection.md), [web experiences](../architecture/web-experiences.md), [frontend](../architecture/frontend.md)

## Brand personality

**"Precise intelligence."** A modern expert marketplace / intelligent learning platform — closer to a premium SaaS/AI product than an education portal.

- **Precise** — generous whitespace, aligned grids, restrained color; density where work happens.
- **Intelligent** — subtle signals of matching/flow (network diagrams, light fields, data traces), never gimmick AI effects.
- **Trustworthy** — calm neutrals, one decisive accent, real photography/illustrations of work — no stock classroom clichés.
- **Alive** — motion with purpose (see motion-system.md); nothing animates without communication value.

Explicitly rejected: generic tutoring-site templates, old academic-portal look, glassmorphism as a system, gradient soup, random colorful cards, animation on every element.

## Visual principles (ranked)

1. **One accent, many neutrals.** Iris carries brand/action; everything else is a neutral scale. Success/warning/danger appear only in status contexts.
2. **Type does the heavy lifting.** Hierarchy through size/weight/tracking — not color or boxes.
3. **Flat surfaces, layered meaning.** Elevation via subtle borders + soft shadows (light) / surface steps (dark). Glass only as a one-off marketing overlay, never a system.
4. **Motion communicates** state, causality and space. Marketing may narrate; app may reassure; admin stays still.
5. **Density is a feature** in the app/portal: content first, chrome minimal.
6. **Accessible by construction:** WCAG 2.1 AA contrast, focus-visible everywhere, hit targets ≥ 44px, reduced-motion honored.

## Color tokens

Defined once as Tailwind v4 `@theme` CSS variables in `src/app/globals.css` (semantic names; raw values below). Light + dark both defined; components consume semantics only.

### Core

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `#FAFAF9` (warm paper) | `#0C0D10` | page canvas |
| `--foreground` | `#18181B` | `#E7E8EA` | primary text |
| `--surface` | `#FFFFFF` | `#14151A` | cards, panels |
| `--surface-2` | `#F4F4F3` | `#1B1C22` | subtle fills, table headers |
| `--border` | `#E4E4E1` | `#26272E` | hairlines |
| `--muted` | `#71717A` | `#9D9FA7` | secondary text |

### Brand

| Token | Value (light) | Dark | Usage |
|---|---|---|---|
| `--primary` | Iris `#5B5BD6` | `#7C7CE8` | primary actions, links, active nav |
| `--primary-strong` | `#4A4AC4` | `#8E8EF0` | hover/pressed |
| `--primary-soft` | `#EEEEFC` | `#23233B` | selected states, soft chips |
| `--accent-flow` | Teal `#0D9488` | `#2DD4BF` | data/flow/matching highlights (marketing + live states only) |

### Status

| Token | Light | Dark |
|---|---|---|
| `--success` | `#15803D` / soft `#E8F6EC` | `#4ADE80` / soft `#12291C` |
| `--warning` | `#B45309` / soft `#FCF3E3` | `#FBBF24` / soft `#332510` |
| `--danger` | `#DC2626` / soft `#FDECEC` | `#F87171` / soft `#331414` |

Gradients are **marketing-only** (hero light-field: iris→teal at ≤12% opacity over dark), never on app/admin surfaces. Iris+teal on dark is the signature "intelligence" pairing.

## Typography

- **Inter** (variable) via `next/font`, self-hosted — UI + body everywhere. **JetBrains Mono** for data/code accents (order numbers, IDs).
- Display style = Inter 600 with tracking `-0.02em`; body 400; UI labels 500.
- Scale (px): 12, 13, 14 (UI default), 16 (body), 18, 20, 24, 30, 36, 48, 60 (marketing display only).
- Marketing headlines may reach 60px/`-0.03em`; app headings cap at 24px; portal at 20px.
- Line-height: 1.1 display, 1.25 headings, 1.55 body. Max prose width 68ch.

## Spacing, radius, borders, shadows

- **Spacing:** 4px base grid — 4/8/12/16/20/24/32/40/48/64/80. Section rhythm (marketing): 96–128px desktop, 64 mobile.
- **Radius tokens:** `sm` 6 (inputs, chips inside tables), `md` 10 (buttons, inputs), `lg` 14 (cards, dialogs), `xl` 20 (marketing panels), `full` (pills/avatars).
- **Borders:** 1px `--border`; marketing dark sections may use white-alpha borders (`#FFFFFF1F`).
- **Shadows (light mode only):** `sm` = `0 1px 2px rgb(0 0 0 / .05)`; `md` = `0 4px 12px rgb(24 24 27 / .08)`; `lg` = `0 16px 40px rgb(24 24 27 / .12)` (hover/dialog). Dark mode elevates via `--surface` steps + borders, shadows nearly invisible.

## Surfaces & per-experience treatment

| Surface | Canvas | Cards | Density | Notes |
|---|---|---|---|---|
| Marketing | light, with **dark hero/features sections** | `--surface` on light; translucent on dark | airy (8-col grid, 1120px container) | motion-forward |
| App | light + full dark | `--surface`, radius `lg`, border+`sm` shadow | comfortable (fluid, max 1280) | sidebar/topbar shell, bottom-nav mobile |
| Portal | light | `--surface`, radius `md` | dense (fluid) | table-first, filters in drawers, minimal chrome |

## Components (inventory & states)

Foundation vendored from **shadcn/ui and customized** (ADR-0014) into `src/components/ui`: Button, Input, Textarea, Label, Select, Checkbox, Switch, RadioGroup, Combobox (Command), Dialog, Sheet/Drawer, DropdownMenu, Tabs, Table, Card, Badge, Avatar, Tooltip, Skeleton, Separator, Toast (Sonner), Pagination, Breadcrumb, Alert, Progress, Popover, Calendar (later), Command palette (app, ⌘K).

**Button** variants: `primary` (iris, white text), `secondary` (surface+border), `ghost`, `danger`, `link`. Sizes 32/40/44 (min hit 44 on touch). **Badges** = status system: `available/success`, `paused/neutral`, `under_review/info(iris)`, `rejected/danger`, `suspended/warning`, each with dot + label (never color-only).

States every interactive component defines: default, hover, focus-visible (2px iris ring, 2px offset), active, disabled (50% + not-allowed), loading (spinner-in-place, width-locked), skeleton (for async content).

**Empty states:** illustration slot (line-style SVG, 120px) + one-line cause + primary next action. **Loading states:** skeletons matching final layout (no spinners for >300ms async); optimistic UI only for chat/notifications later. **Error states:** inline form errors under fields + envelope-mapped banners (`src/features/*/errors`).

## Iconography & illustration

- **Icons:** Lucide, 16/20/24, 1.5px stroke, `--muted`/currentColor. No mixed icon sets.
- **Illustration/object style (marketing):** abstract "intelligence network" line-art — thin iris/teal strokes, node dots, soft light fields; dark-section native. No stock photos of classrooms; expert imagery = avatars + work artifacts.
- **Expert↔student matching visualization** = bespoke SVG/Canvas pattern (component-selection.md) — the brand's signature visual.

## Motion principles

Summarized; normative doc = motion-system.md. Durations 120–500ms; `cubic-bezier(0.2, 0, 0, 1)` default; springs only for layout/drag; transform/opacity only; `prefers-reduced-motion` collapses ambient/parallax to ≤150ms fades.

## Responsive rules (mobile-first)

- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Design starts at 360px.
- Marketing: single column → 2-col (`md`) → 12-col hero (`lg`); ambient animation off on `sm`.
- App: bottom navigation + sheets (`sm`), sidebar shell (`lg`); data lists render as cards under `md`, tables above.
- Portal: filter drawers on mobile; tables scroll horizontally inside cards with sticky first column when needed.
- Touch targets ≥ 44px; drawers/modals become full-screen sheets under `md`.

## Accessibility rules

- WCAG 2.1 AA: contrast ≥ 4.5:1 text / 3:1 UI; focus-visible ring on every interactive element; semantic landmarks + skip-link; form errors linked via `aria-describedby`; dialogs trap focus (Radix); status conveyed by text+color (badges carry labels); `prefers-reduced-motion` and `prefers-color-scheme` respected; keyboard paths for every flow (bidding/messaging included); E2E a11y smoke (Playwright + axe) on golden paths from Phase 4 on.

## Performance budget (normative)

| Metric | Marketing | App | Portal |
|---|---|---|---|
| First-load JS (gz) | ≤ 180KB | ≤ 220KB | ≤ 250KB |
| LCP (4G, mid-tier phone) | ≤ 2.0s | ≤ 2.5s | — |
| CLS | ≤ 0.02 | ≤ 0.02 | ≤ 0.02 |
| INP | ≤ 200ms | ≤ 200ms | ≤ 200ms |
| Ambient animations concurrent | ≤ 2 | 0–1 | 0 |

Rules: animation = transform/opacity only (compositor-friendly); canvas visuals pause on `visibilitychange` and cap DPR at 2; fonts subset + `font-display: swap` fallback metrics locked (size-adjust) to protect CLS; images via `next/image` (AVIF/WebP, explicit sizes); no video backgrounds; WebGL/R3F **not** adopted at launch (SVG/CSS/Canvas chosen — see ADR-0014); every vendored pattern ships with a bundle-cost note; budget checks land as CI checks when the design foundation is implemented (first slice of Phase 4).

## Governance

New components/patterns must be added to component-selection.md (source, purpose, adaptation, cost) before use. Visual drift = design review against this document. Tokens change here first, then in `globals.css` (`@theme`) — never ad hoc in components.
