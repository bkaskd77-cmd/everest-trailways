"use client";

import * as React from "react";
import { useTransform } from "motion/react";
import * as m from "motion/react-m";

import { useSeamProgress } from "@/components/motion";
import { SEAM } from "@/lib/motion";

/**
 * The band's half of the hero-to-band seam.
 *
 * Both of these read off the hero's exit progress, not off their own viewport
 * trigger. The consequence is that the ridge does not finish drifting and then,
 * some indeterminate moment later, the band arrive — the edge is already
 * halfway drawn while the ridge is still moving, because they are two windows
 * on one value. That overlap is the whole point.
 *
 * Transform and opacity only. The edge is absolutely positioned and the lift is
 * a translate, so neither can move a layout box or contribute to CLS.
 */
export function SeamEdge() {
  const seam = useSeamProgress();
  const scaleX = useTransform(seam, SEAM.edgeIn, [0, 1]);
  const opacity = useTransform(seam, SEAM.edgeIn, [0, 1]);

  return (
    <m.span
      data-motion
      aria-hidden
      // Drawn from the centre out, so it reads as the band opening rather than
      // a rule sliding in from one side.
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px origin-center bg-border will-change-transform"
      style={{ scaleX, opacity }}
    />
  );
}

export function SeamLift({ children }: { children: React.ReactNode }) {
  const seam = useSeamProgress();
  const y = useTransform(seam, SEAM.liftIn, [SEAM.liftPx, 0]);

  return (
    <m.div data-motion className="will-change-transform" style={{ y }}>
      {children}
    </m.div>
  );
}
