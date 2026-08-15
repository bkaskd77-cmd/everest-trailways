"use client";

import * as m from "motion/react-m";

import { DURATION, EASE } from "@/lib/motion";

/**
 * A separator rule that draws itself in.
 *
 * The columns are divided by hairlines rather than gaps, so these are real
 * elements rather than borders — a border cannot animate its own length.
 * Vertical rules grow from the top, horizontal ones from the left.
 */
export function Hairline({
  orientation,
  className,
  delay = 0,
}: {
  orientation: "vertical" | "horizontal";
  className?: string;
  delay?: number;
}) {
  const vertical = orientation === "vertical";
  return (
    <m.span
      data-motion
      aria-hidden
      className={className}
      style={{ transformOrigin: vertical ? "top" : "left" }}
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: DURATION.slow * 0.75, ease: EASE, delay }}
    />
  );
}
