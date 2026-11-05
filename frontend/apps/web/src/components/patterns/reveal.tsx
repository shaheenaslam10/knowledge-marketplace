"use client";

/**
 * Reveal — the one scroll-reveal primitive (motion-system §marketing).
 * whileInView once; reduced-motion users get the final state immediately
 * because globals.css collapses animation durations globally.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { fadeUp, staggerParent, viewportOnce } from "@/lib/motion";

export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const Comp = as === "section" ? motion.section : motion.div;
  return (
    <Comp className={className} variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewportOnce}>
      {children}
    </Comp>
  );
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerParent()}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
