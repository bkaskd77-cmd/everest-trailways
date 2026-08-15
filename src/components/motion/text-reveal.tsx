"use client";

import { motion } from "motion/react";

import { revealMask, withDelay } from "@/lib/motion";

type TextRevealProps = {
  /** One entry per line. Lines are revealed in order from behind a mask. */
  lines: readonly string[];
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  /** Seconds between lines. */
  stagger?: number;
  delay?: number;
  /** "mount" for above-the-fold headings, "inView" for anything below it. */
  trigger?: "mount" | "inView";
};

/**
 * Line-by-line mask reveal for display headings.
 *
 * Opacity stays at 1 throughout — only the transform moves — so the heading is
 * painted on the first frame and stays eligible as the LCP element. Each mask
 * is a real box at the line's own height, so nothing reflows as it plays.
 */
export function TextReveal({
  lines,
  className,
  as: Component = "h2",
  stagger = 0.09,
  delay = 0,
  trigger = "mount",
}: TextRevealProps) {
  const play =
    trigger === "mount"
      ? ({ animate: "visible" } as const)
      : ({
          whileInView: "visible",
          viewport: { once: true, amount: 0.5 },
        } as const);

  return (
    <Component className={className}>
      {lines.map((line, index) => (
        // The clipping box. `pb` leaves room for descenders so they are not
        // shaved off by the mask.
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            data-motion
            className="block"
            variants={withDelay(revealMask, delay + index * stagger)}
            initial="hidden"
            {...play}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Component>
  );
}
