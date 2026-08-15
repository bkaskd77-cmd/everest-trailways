"use client";

import { MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` makes Motion skip transform and layout animations for
 * anyone with the OS setting on, without changing what React renders — which
 * is what keeps server and client markup identical. The CSS counterpart lives
 * in the reduced-motion block of globals.css.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
