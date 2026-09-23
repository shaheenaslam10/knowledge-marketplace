# Motion System — Hybrid Expert Marketplace

> Status: ✅ adopted (pre-Phase-4) · Last updated: Phase 3.5 · ADR-0014 · Related: [design system](design-system.md), [component selection](component-selection.md)

## Principles

1. **Motion communicates** — it explains causality (what changed), space (where things come from/go), and state (loading → loaded). Decoration without information is cut.
2. **One system:** Motion for React (`motion/react`) is the only animation runtime — CSS transitions remain for trivial hover/color states only; no CSS keyframe library, no second JS animator.
3. **Performance is a feature:** transform/opacity only (compositor-friendly); nothing animates layout properties (`width/height/top/left`) — use Motion layout animations or reserving space; ambient loops are capped and pause when off-screen/hidden tab (AnimatePresence + `whileInView` + visibility listeners).
4. **Respect the user:** `prefers-reduced-motion: reduce` is honored globally — ambient/parallax/scroll-driven motion is removed, transitions collapse to ≤150ms opacity fades.

## Durations & easing (tokens, defined once in `src/lib/motion.ts`)

| Token | Duration | Easing | Use |
|---|---|---|---|
| `micro` | 120ms | `ease-out` | hovers, presses, toggles, badge flips |
| `fast` | 180ms | `ease-out` | tooltips, small popovers, focus transitions |
| `standard` | 240ms | `cubic-bezier(0.2, 0, 0, 1)` | drawers, dialogs, sheets, tab panels |
| `entrance` | 400ms | `cubic-bezier(0.2, 0, 0, 1)` | section/page reveals, card entrances |
| `cinematic` | 550–700ms | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) | marketing hero + section transitions only |
| `ambient` | 8–20s loops | linear/ease-in-out | hero light-field, node pulse (marketing only, ≤2 concurrent) |

Springs (Motion physics): reserved for layout transitions, drag-with-momentum, and sheet gestures — `stiffness 300–380, damping 30–35`. Stagger: 40–60ms per item, max 6 items (lists animate the viewport slice only).

## Per-surface profiles

### Marketing website — narrative (strongest)

- **Hero:** one-time cinematic entrance — headline text reveal (staggered words/lines, `cinematic`), supporting UI panels float in with parallax offsets; then ≤2 continuous ambient layers (light-field drift, network-node pulse) that never compete with copy.
- **Scroll:** section reveals via `whileInView` (once, threshold ~0.25); bento/feature cards rise+fade 12px; parallax limited to illustration layers (`useScroll`+`useTransform`, small ranges, will-change managed).
- **Hover:** cards lift (translateY −4px + shadow) with border-glow on expert/network cards; CTAs get arrow-nudge + brightness; magnetic effect only on primary hero CTA.
- **Testimonial/logo rows:** slow marquee (≥30s loop, pauses on hover, static under reduced-motion).
- Never animate: legal text, pricing numbers mid-read (count-up only on first reveal), form fields.

### Marketplace application — supportive (productivity first)

- **Navigation:** shell persists; route content cross-fades ≤200ms (`template.tsx`), no page-level choreography.
- **State transitions:** draft→submitted→review progress steps animate forward (slide+fade, never backward replay); status badge changes flash-highlight once (1.2s).
- **Drawers/modals/sheets:** standard spring, scale 0.98→1 + fade; backdrop fade; escape animations are 20% faster than entrances.
- **Lists (offers/opportunities):** new items slide-in at origin (`layout` animations); accept/decline settles with a subtle scale pulse; filters reflow via layout animation.
- **Order progress:** stepper fills with `standard` duration; the active step carries a soft breathing dot (2s loop, app's single allowed ambient).
- **Forms:** error shake is forbidden; errors fade in under fields; submit button shows in-place spinner with locked width.
- **Loading:** skeleton → content cross-fade 200ms; skeletons pulse at 1.6s.
- **Notifications/toasts:** slide from edge + fade, auto-dismiss 5s, exit via AnimatePresence.

### Admin/Operations portal — minimal

- No entrance choreography beyond a 150ms content fade; no ambient motion; no hover lift — hover = background tint only.
- Table row updates flash-highlight once; drawers for inspect/edit use `standard`; everything else instant. Data speed is the aesthetic.

## Reduced motion & mobile reductions

- `prefers-reduced-motion: reduce`: ambient/parallax/scroll-linked motion removed; entrances → ≤150ms fades; marquee → static stack; hero renders final state immediately (no cinematic).
- Mobile (`< md`): ambient layers off; parallax off; entrance stagger halved; sheets replace center-modals; gesture-driven sheet dismissal (drag) retained — it is user-controlled motion.

## Performance constraints (normative)

- Transform/opacity only; no `box-shadow`/`filter` animation (pre-render two states and cross-fade if needed).
- ≤ 2 concurrent ambient animations per viewport (marketing), 1 in app, 0 in portal.
- Scroll-linked values go through Motion's `useScroll` (rAF-batched) — never scroll listeners in components.
- Canvas/DOM particle systems: ≤ 80 nodes, DPR cap 2, pause on `visibilitychange`, unmount on route change.
- Every vendored Aceternity pattern is re-audited: remove unused keyframes, replace its framer-motion import with the shared `motion/react` package, strip demo content; cost noted in component-selection.md.
- Budget enforcement (first slice of Phase 4): Next bundle analyzer in CI on the marketing + app entrypoints; regression gate at the design-system budget lines (design-system.md §Performance).
