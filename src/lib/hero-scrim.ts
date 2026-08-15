/**
 * The hero's overlay maths, in one place.
 *
 * Both the rendered component and `scripts/check-hero-contrast.ts` read these
 * numbers, so the guard can never drift from what actually ships. Change a
 * value here and `pnpm check:hero` immediately re-measures against it.
 */

export type GradientStop = [position: number, alpha: number];

/** Summit, as the scrims use it. */
export const SCRIM_RGB = "11 31 42";

/**
 * Layer 1 — mood. Atmosphere only; it must never be the thing carrying
 * contrast. By 62% of the gradient line it is down to 0.10, so the right of the
 * frame stays essentially unveiled at every breakpoint.
 */
export const MOOD = {
  angleDeg: 100,
  stops: [
    [0, 0.55],
    [0.38, 0.3],
    [0.62, 0.1],
    [1, 0],
  ] as GradientStop[],
};

/**
 * Layer 2 — the text bed. The only layer responsible for legibility.
 *
 * It is anchored to the copy block's own box and inflated by these fractions,
 * so it scales with the copy rather than the viewport: a short headline gets a
 * small pool of shade, a long one gets a bigger one.
 */
export const BED = {
  /**
   * Peak opacity at the centre, before any per-slide `scrimStrength`.
   *
   * The spec for this rewrite called for 0.30. Measured, 0.30 could not hold
   * 4.6:1 for small text on any of the five placeholders — the subline failed
   * at 1.85–3.71:1. 0.62 is the lowest value that clears every slide at every
   * breakpoint. It is a global shape decision, not a per-image correction, and
   * because the bed is local the right of the frame is untouched either way.
   * Lower it the moment the real photography lands and `pnpm check:hero` says
   * it can be lowered.
   */
  alpha: 0.62,
  /**
   * The bed holds full strength across a plateau and only then feathers out.
   * A ramp starting at the very centre left the outer half of every line of
   * copy on almost nothing; the plateau is what makes the pool cover the text
   * rather than just its middle.
   */
  plateau: 0.5,
  feather: 0.82,
  /** Inflation of the copy box, as a fraction of its width / height. */
  insetX: 0.35,
  insetY: 0.85,
};

/** Applied to every slide image. Safe now that the scrim is local, not global. */
export const BASE_IMAGE_FILTER = "brightness(1.08) contrast(1.03)";

/**
 * WCAG AA. The headline is large-scale text (Instrument Serif at text-4xl and
 * up, well past 24px), which AA scores at 3:1 — holding it to 4.5:1 is what
 * forced the whole frame to be over-darkened. Small text keeps a margin over
 * the 4.5 requirement.
 */
export const CONTRAST_TARGETS = {
  /** Eyebrow and subline. These alone drive the bed opacity. */
  smallText: 4.6,
  /** Headline. */
  largeText: 3.2,
};

/** CSS for the mood layer. */
export function moodGradientCss(): string {
  const stops = MOOD.stops
    .map(
      ([at, alpha]) => `rgb(${SCRIM_RGB} / ${alpha}) ${(at * 100).toFixed(0)}%`,
    )
    .join(", ");
  return `linear-gradient(${MOOD.angleDeg}deg, ${stops})`;
}

/** CSS for the text bed at a given strength (1 = the default). */
export function textBedCss(strength = 1): string {
  const alpha = (BED.alpha * strength).toFixed(3);
  return (
    `radial-gradient(ellipse at center, ` +
    `rgb(${SCRIM_RGB} / ${alpha}) 0%, ` +
    `rgb(${SCRIM_RGB} / ${alpha}) ${(BED.plateau * 100).toFixed(0)}%, ` +
    `rgb(${SCRIM_RGB} / 0) ${(BED.feather * 100).toFixed(0)}%)`
  );
}

/** Inset shorthand that inflates the bed off the copy box. */
export function textBedInset(): string {
  return `${-BED.insetY * 100}% ${-BED.insetX * 100}%`;
}

/** Alpha of the mood layer at a point, matching the CSS gradient exactly. */
export function moodAlphaAt(
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const rad = (MOOD.angleDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  // CSS gradient-line length for the given angle.
  const length = Math.abs(width * sin) + Math.abs(height * cos);
  const t = ((x - width / 2) * sin + (height / 2 - y) * cos) / length + 0.5;
  return sampleStops(MOOD.stops, t);
}

/**
 * Alpha of the text bed at a point. `box` is the copy block; the bed is that
 * box inflated by BED.insetX / BED.insetY, with a farthest-corner ellipse.
 */
export function bedAlphaAt(
  x: number,
  y: number,
  box: { x0: number; y0: number; x1: number; y1: number },
  strength = 1,
): number {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const bedW = w * (1 + BED.insetX * 2);
  const bedH = h * (1 + BED.insetY * 2);
  const cx = box.x0 + w / 2;
  const cy = box.y0 + h / 2;
  // `ellipse at center` defaults to farthest-corner sizing.
  const rx = (bedW / 2) * Math.SQRT2;
  const ry = (bedH / 2) * Math.SQRT2;
  const t = Math.hypot((x - cx) / rx, (y - cy) / ry);
  const ramp =
    t <= BED.plateau
      ? 0
      : Math.min(1, (t - BED.plateau) / (BED.feather - BED.plateau));
  return BED.alpha * strength * (1 - ramp);
}

function sampleStops(stops: GradientStop[], t: number): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, a0] = stops[i - 1];
      const [p1, a1] = stops[i];
      return a0 + (a1 - a0) * ((t - p0) / (p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}
