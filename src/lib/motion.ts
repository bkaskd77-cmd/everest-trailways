import type { TargetAndTransition, Transition, Variants } from "motion/react";

/**
 * The house easing curve (expo-out). Everything decelerates the same way, which
 * is most of what makes the motion read as one system rather than many.
 * Mirrored in CSS as `--ease-house`.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.25,
  base: 0.5,
  slow: 0.8,
} as const;

/** Stagger step between siblings in a StaggerGroup. */
export const STAGGER = 0.08;

/** Header solidify / magnetic pull. Springs, not durations. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.6,
};

const transition = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  ease: EASE,
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transition(DURATION.base) },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition(DURATION.base) },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transition(DURATION.base) },
};

/**
 * Line-level mask reveal: the parent clips, the child slides up from under it.
 * Pair with a wrapper that has `overflow: hidden`.
 */
export const revealMask: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: transition(DURATION.slow) },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER, delayChildren: 0 },
  },
};

/**
 * Returns `variants` with `delay` folded into its `visible` transition.
 *
 * A variant's own transition always beats the `transition` prop on the
 * component, so a delay has to be merged in here rather than passed alongside.
 */
export function withDelay(variants: Variants, delay: number): Variants {
  if (!delay) return variants;
  const visible = variants.visible as TargetAndTransition | undefined;
  return {
    ...variants,
    visible: {
      ...visible,
      transition: { ...visible?.transition, delay },
    },
  };
}
