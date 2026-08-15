"use client";

import * as React from "react";
import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";

/** Hard ceiling from the motion spec — parallax stays a hint, not an effect. */
const MAX_OFFSET = 40;

type ParallaxProps = {
  children: React.ReactNode;
  className?: string;
  /** Peak translateY in px. Clamped to 40. Negative inverts the direction. */
  distance?: number;
};

/**
 * Scroll-linked vertical drift, keyed to the element's own trip through the
 * viewport: it sits at +distance on entry and -distance on exit, so it reads as
 * neutral while centred.
 *
 * Purely decorative — never wrap copy or controls in this.
 */
export function Parallax({
  children,
  className,
  distance = 24,
}: ParallaxProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, distance));

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [clamped, -clamped]);

  return (
    <div ref={ref} className={className}>
      <m.div data-motion className="will-change-transform" style={{ y }}>
        {children}
      </m.div>
    </div>
  );
}
