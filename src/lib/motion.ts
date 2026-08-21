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

/**
 * When a scroll-triggered reveal fires.
 *
 * `amount` is a fraction **of the element**, not of the screen, and that makes
 * any fractional value a trap: a group 6,400px tall with `amount: 0.2` needs
 * 1,280px of itself on screen, which a 900px viewport can never supply. The
 * trigger is then unsatisfiable and the content stays at opacity 0 forever.
 * That shipped — the entire /departures grid was invisible at every scroll
 * position, on a page whose only job is to list nineteen departures.
 *
 * So the trigger is a line instead of a fraction: any part of the element,
 * once its leading edge has climbed 12% of the viewport above the bottom
 * edge. For a short block that lands where `amount: 0.25` used to; for a block
 * taller than the screen it still fires, which is the whole point.
 *
 * If you are tempted to put a fractional `amount` back, the element you are
 * animating is one dataset away from being taller than a phone.
 */
export const REVEAL_VIEWPORT = {
  once: true,
  amount: "some",
  margin: "0px 0px -12% 0px",
} as const;

/**
 * Hard ceiling on any single animation.
 *
 * Past this a transition stops reading as a response to something and starts
 * reading as a wait. Nothing in the system may exceed it, and the values below
 * are all budgeted against it.
 */
export const MAX_DURATION = 1.2;

/**
 * Layout projection — the matcher cell growing from one grid cell to the full
 * row. Slower than a fade because it is moving a large box a long way, and a
 * fast one reads as a swap rather than a growth.
 */
export const LAYOUT: Transition = {
  duration: DURATION.base * 0.9,
  ease: EASE,
};

/**
 * Pointer response on a departure card.
 *
 * 4 degrees is deliberately near the floor of what registers. The card should
 * feel like it has a surface, not like it is being thrown around; anything
 * past about six starts to distort the photograph and the price.
 */
export const TILT = {
  /** Peak rotation on either axis, degrees. */
  maxDeg: 4,
  /** How far the image slides against the card frame, px. */
  parallaxPx: 8,
  /** Perspective applied per-card, so the effect does not skew across the grid. */
  perspective: 900,
  spring: {
    type: "spring",
    stiffness: 200,
    damping: 26,
    mass: 0.5,
  } as Transition,
} as const;

/**
 * The seat meter's four beats.
 *
 * Track draws, fill grows into it, the threshold tick snaps, the line beneath
 * settles. The overlaps are intentional — each beat starts before the last has
 * finished, which is what keeps 1.06s from feeling like four separate events.
 */
export const METER = {
  track: { duration: 0.28, delay: 0 },
  fill: { duration: 0.42, delay: 0.24 },
  tick: {
    delay: 0.62,
    spring: {
      type: "spring",
      stiffness: 520,
      damping: 17,
      mass: 0.6,
    } as Transition,
  },
  label: { duration: 0.24, delay: 0.82 },
  /**
   * Added per card so the meters read across a row rather than firing at once.
   * Offset by column, not by absolute index: only three cards are ever on
   * screen together, so a running total would just delay the lower rows for no
   * one's benefit — and it would push the cascade past MAX_DURATION.
   */
  perCard: 0.06,
  /** Ceiling on that offset, so the whole cascade still fits the budget. */
  maxCardDelay: 0.12,
} as const;

/** METER's last beat ends here. Asserted by the motion budget guard. */
export const METER_TOTAL = METER.label.delay + METER.label.duration;

/**
 * Counting, not animating.
 *
 * A figure runs a hair past its target and settles back, and each one takes a
 * slightly different time, so four figures in a row do not land in lockstep.
 */
export const COUNT = {
  /** Milliseconds before jitter. */
  baseMs: 1000,
  /** Fraction either side of base, derived per figure so it is stable. */
  jitter: 0.15,
  /** Where in the run the overshoot peaks. */
  peak: 0.72,
  /** Overshoot as a fraction of the target, floored at one whole unit. */
  overshoot: 0.04,
  /** Per-glyph step when a figure assembles instead of counting ("1:4"). */
  glyphStep: 0.09,
  glyphMs: 380,
} as const;

/**
 * The hero-to-band seam.
 *
 * Both ends of the join read off one scroll progress value; these are the
 * windows within it. The ridge drifts across the whole of the hero's exit, and
 * the band's edge draws in over the back half of it, so the two overlap rather
 * than running in sequence.
 */
export const SEAM: {
  ridgeDriftPx: number;
  /** Progress window over which the band's top edge draws. */
  edgeIn: [number, number];
  /** Progress window over which the band's content settles into place. */
  liftIn: [number, number];
  liftPx: number;
} = {
  ridgeDriftPx: 28,
  edgeIn: [0.5, 1],
  liftIn: [0.4, 1],
  liftPx: 12,
};

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
