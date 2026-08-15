"use client";

import { LazyMotion, MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` makes Motion skip transform and layout animations for
 * anyone with the OS setting on, without changing what React renders — which is
 * what keeps server and client markup identical. The CSS counterpart lives in
 * the reduced-motion block of globals.css.
 *
 * `LazyMotion` loads the animation features as a separate async chunk. Every
 * component in the app uses `m` rather than `motion`, so the feature set is not
 * in the initial bundle at all; `strict` makes that a build-time contract
 * rather than a convention — a stray `motion.div` throws in development.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion
      strict
      features={() => import("@/lib/motion-features").then((m) => m.default)}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
