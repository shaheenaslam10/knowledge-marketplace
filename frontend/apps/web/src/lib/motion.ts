/**
 * Motion tokens — docs/design/motion-system.md (single runtime: motion/react).
 * Transform/opacity only; springs for layout/drag; reduced-motion collapses
 * everything to short fades (globals.css + Reveal handle the global cutoff).
 */
import type { Transition, Variants } from "motion/react";

export const EASING = [0.2, 0, 0, 1] as const;
export const EASING_CINEMATIC = [0.16, 1, 0.3, 1] as const;

export const DURATIONS = {
  micro: 0.12,
  fast: 0.18,
  standard: 0.24,
  entrance: 0.4,
  cinematic: 0.6,
} as const;

export const spring: Transition = { type: "spring", stiffness: 340, damping: 32 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATIONS.entrance, ease: EASING } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATIONS.standard, ease: EASING } },
};

export const staggerParent = (stagger = 0.05, max = 6): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 * Math.min(max, 6) / 6 } },
});

export const viewportOnce = { once: true, amount: 0.25 } as const;
