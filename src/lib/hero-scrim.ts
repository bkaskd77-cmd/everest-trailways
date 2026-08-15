/**
 * The hero's overlay maths, in one place.
 *
 * Both the rendered component and `scripts/check-hero-contrast.ts` read these
 * numbers, so the guard can never drift from what actually ships. Change a
 * value here and `pnpm check:hero` immediately re-measures against it.
 *
 * There is exactly one background layer — the mood gradient, full-bleed.
 * Legibility is carried by shadows on the type itself, which have no bounding
 * box to give themselves away. An earlier version used a radial "text bed"
 * anchored to the copy block; because a farthest-corner ellipse only reaches
 * its 100% stop at the box's *corners*, it was still at alpha 0.22 where the
 * element's edges clipped it, painting two hard vertical lines across the
 * photograph. Nothing here may be clipped by its own element again.
 */

export type GradientStop = [position: number, alpha: number];

/** Summit, as the scrims use it. */
export const SCRIM_RGB = "11 31 42";

/**
 * The only background layer: atmosphere, edge to edge.
 *
 * Five stops rather than four, easing out gradually enough that no single step
 * is visible against the flat summit tone.
 */
export const MOOD = {
  angleDeg: 100,
  stops: [
    [0, 0.5],
    [0.3, 0.34],
    [0.55, 0.18],
    [0.78, 0.06],
    [1, 0],
  ] as GradientStop[],
};

export type Shadow = { dy: number; blur: number; alpha: number };

/**
 * Layered text shadows, three stops each: a tight one for edge definition, a
 * mid one for local lift, a wide one for ambient separation.
 *
 * Small text gets a tighter, stronger first stop — thin strokes need the
 * contrast right at the edge, where a wide blur contributes almost nothing.
 */
export const TEXT_SHADOWS = {
  display: [
    { dy: 1, blur: 2, alpha: 0.55 },
    { dy: 2, blur: 12, alpha: 0.42 },
    { dy: 4, blur: 40, alpha: 0.3 },
  ] as Shadow[],
  small: [
    { dy: 1, blur: 1, alpha: 0.9 },
    { dy: 1, blur: 6, alpha: 0.65 },
    { dy: 2, blur: 24, alpha: 0.42 },
  ] as Shadow[],
};

/** Applied to every slide image. */
export const BASE_IMAGE_FILTER = "brightness(1.08) contrast(1.03)";

/**
 * WCAG AA. The headline is large-scale text (Instrument Serif at text-4xl and
 * up, well past 24px), which AA scores at 3:1. Small text keeps a margin over
 * the 4.5 requirement.
 */
export const CONTRAST_TARGETS = {
  smallText: 4.6,
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

/** Clamp a per-slide `scrimStrength` into something sane. */
const strengthOf = (strength: number | undefined) =>
  Math.max(0, Math.min(2, strength ?? 1));

/** CSS `text-shadow` for a given role, scaled by a per-slide strength. */
export function textShadowCss(
  kind: keyof typeof TEXT_SHADOWS,
  strength?: number,
): string {
  const k = strengthOf(strength);
  return TEXT_SHADOWS[kind]
    .map(
      (s) =>
        `0 ${s.dy}px ${s.blur}px rgb(${SCRIM_RGB} / ${Math.min(1, s.alpha * k).toFixed(3)})`,
    )
    .join(", ");
}

/** The same stack as a `box-shadow`, for the ghost button's border. */
export function boxShadowCss(
  kind: keyof typeof TEXT_SHADOWS,
  strength?: number,
): string {
  const k = strengthOf(strength);
  return TEXT_SHADOWS[kind]
    .slice(0, 2)
    .map(
      (s) =>
        `0 ${s.dy}px ${s.blur}px rgb(${SCRIM_RGB} / ${Math.min(1, s.alpha * k).toFixed(3)})`,
    )
    .join(", ");
}

/**
 * Distance from a glyph's edge, in px, that decides whether it reads.
 * @see shadowAlpha
 */
const SHADOW_CORE = 2;

/**
 * How much a text-shadow effectively darkens the backdrop right at a glyph's
 * edge — which is what governs legibility.
 *
 * WCAG says nothing about text shadows, so this is a model, not a measurement.
 * Each layer is a copy of the glyph blurred by `blur`, so at the glyph's edge
 * it retains roughly `CORE / (CORE + blur)` of its alpha: a 2px blur keeps half,
 * a 40px ambient blur keeps almost none. That matches how the stops actually
 * read, and it deliberately gives wide stops very little credit rather than
 * flattering them.
 */
export function shadowAlpha(
  kind: keyof typeof TEXT_SHADOWS,
  strength?: number,
): number {
  const k = strengthOf(strength);
  return (
    1 -
    TEXT_SHADOWS[kind].reduce(
      (acc, s) =>
        acc *
        (1 - Math.min(1, s.alpha * k) * (SHADOW_CORE / (SHADOW_CORE + s.blur))),
      1,
    )
  );
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
