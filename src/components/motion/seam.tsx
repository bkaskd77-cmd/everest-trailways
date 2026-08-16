"use client";

import * as React from "react";
import { motionValue, useScroll, type MotionValue } from "motion/react";

/**
 * One scroll progress value, shared across the hero-to-band join.
 *
 * The hero's ridge and the trust band's top edge are separate components in
 * separate sections, and until now they animated on separate triggers — which
 * is why the join read as two things happening near each other rather than one
 * movement. They now read off a single `useScroll` keyed to the hero's own exit:
 * 0 when the hero fills the viewport, 1 when its last pixel leaves the top.
 *
 * Each consumer maps its own window out of that one value (see SEAM in
 * lib/motion.ts), so they are phase-locked by construction. Nothing here can
 * drift out of step with anything else, because there is only one clock.
 *
 * The hero arrives as a prop rather than as a child so the scroll target can be
 * the hero alone while the context still reaches the sections beneath it.
 */
const SeamContext = React.createContext<MotionValue<number> | null>(null);

/**
 * A standing zero for anything rendered outside a <Seam>. Module scope on
 * purpose: hooks cannot be conditional, so consumers need a value that is
 * always there and never moves.
 */
const STILL = motionValue(0);

export function useSeamProgress(): MotionValue<number> {
  return React.useContext(SeamContext) ?? STILL;
}

export function Seam({
  hero,
  children,
}: {
  hero: React.ReactNode;
  children: React.ReactNode;
}) {
  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  return (
    <SeamContext.Provider value={scrollYProgress}>
      <div ref={heroRef}>{hero}</div>
      {children}
    </SeamContext.Provider>
  );
}
