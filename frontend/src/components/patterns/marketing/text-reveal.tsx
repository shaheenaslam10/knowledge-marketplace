"use client";
/**
 * TextReveal — adapted Aceternity "Text Generate Effect" (#M3): word stagger
 * via our Motion tokens (not the original custom hook); static under
 * reduced-motion (global collapse in globals.css).
 */
import { motion } from "motion/react";

import { DURATIONS, EASING_CINEMATIC } from "@/lib/motion";

export function TextReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <motion.p
      className={className}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: DURATIONS.cinematic, ease: EASING_CINEMATIC },
            },
          }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.p>
  );
}
