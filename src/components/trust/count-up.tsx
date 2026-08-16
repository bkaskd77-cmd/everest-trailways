"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { COUNT, EASE } from "@/lib/motion";

/** Only a whole number, optionally with a percent sign, can count. "1:4" cannot. */
const NUMERIC = /^(\d+)(%?)$/;

function cubicBezier(p1: number, p2: number, p3: number, p4: number) {
  // Newton's method against the x-curve, then read y. Matches the CSS curve
  // rather than approximating it, so this keeps step with everything else.
  const cx = 3 * p1;
  const bx = 3 * (p3 - p1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p2;
  const by = 3 * (p4 - p2) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const slope = slopeX(t);
      if (slope === 0) break;
      t -= (sampleX(t) - x) / slope;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

const ease = cubicBezier(EASE[0], EASE[1], EASE[2], EASE[3]);

/**
 * A stable number in [-1, 1] derived from the figure itself.
 *
 * The point of the jitter is that four figures in a row should not land in
 * lockstep — but it has to be the *same* jitter every render, or the same
 * figure would count at a different speed on every visit and the effect would
 * read as jank rather than as craft. So it is hashed, not random.
 */
function jitterFor(figure: string): number {
  let h = 2166136261;
  for (let i = 0; i < figure.length; i += 1) {
    h ^= figure.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2001) / 1000 - 1;
}

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts a figure up from zero when it scrolls into view, once.
 *
 * The final value is what renders on the server, so there is no layout shift
 * and no-JS readers see the real number. Nothing animates if the figure was
 * already on screen when the component mounted — resetting a number to zero in
 * front of someone already reading it is worse than not animating at all.
 *
 * Two behaviours, because two kinds of figure:
 *
 *   A number *counts*, and overshoots its target by a hair before settling back
 *   onto it — a counter coming to rest rather than a value being tweened. Each
 *   figure's duration is nudged a little either side of a second so a row of
 *   them does not finish in unison.
 *
 *   Anything a number cannot express — "1:4" — *assembles*, one glyph at a
 *   time: the 1, then the colon, then the 4. It reads as a ratio being stated
 *   rather than a value being reached, which is what it is.
 */
export function CountUp({ figure }: { figure: string }) {
  const match = NUMERIC.exec(figure);
  const target = match ? Number(match[1]) : null;
  return target !== null && target > 0 ? (
    <Counting figure={figure} target={target} suffix={match![2]} />
  ) : (
    <Assembling figure={figure} />
  );
}

function Counting({
  figure,
  target,
  suffix,
}: {
  figure: string;
  target: number;
  suffix: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  // Fires ~240px before the figure is actually visible, so the reset to zero
  // happens off-screen and the count plays as it scrolls in.
  const inView = useInView(ref, { once: true, margin: "0px 0px 240px 0px" });

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !inView || reduced()) return;
    // Already on screen at mount: leave the real number alone.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    const duration = COUNT.baseMs * (1 + COUNT.jitter * jitterFor(figure));
    // At least one whole unit, so small figures visibly settle too: 2 runs to
    // 3 and comes back, rather than overshooting by 0.08 and showing nothing.
    const peakValue =
      target + Math.max(1, Math.round(target * COUNT.overshoot));

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      // The reset lives inside the first frame, not in an earlier effect: if
      // rAF never runs — a backgrounded tab, a browser that throttles it — the
      // figure keeps its real value instead of being stranded at zero. A stuck
      // "0 public registrations" would be worse than no animation at all.
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const value =
        t < COUNT.peak
          ? peakValue * ease(t / COUNT.peak)
          : peakValue +
            (target - peakValue) * ease((t - COUNT.peak) / (1 - COUNT.peak));
      node.textContent = `${Math.round(value)}${suffix}`;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      // Never leave a partial number behind on unmount.
      node.textContent = figure;
    };
  }, [inView, target, suffix, figure]);

  return (
    <span ref={ref} className="tabular">
      {figure}
    </span>
  );
}

function Assembling({ figure }: { figure: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 240px 0px" });
  const glyphs = React.useMemo(() => [...figure], [figure]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !inView || reduced()) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    // Driven with the Web Animations API rather than React state so the server
    // markup and the first client render are byte-identical — the glyphs are
    // already in the DOM at their final values, and this only ever plays while
    // they are still below the fold.
    const parts = [...node.querySelectorAll<HTMLElement>("[data-glyph]")];
    const animations = parts.map((part, index) =>
      part.animate(
        [
          { opacity: 0, transform: "translateY(0.22em)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: COUNT.glyphMs,
          delay: index * COUNT.glyphStep * 1000,
          easing: `cubic-bezier(${EASE.join(",")})`,
          fill: "backwards",
        },
      ),
    );

    return () => animations.forEach((animation) => animation.cancel());
  }, [inView, glyphs.length]);

  return (
    <span ref={ref} className="tabular">
      {/* The glyphs carry the visual; the full string is what gets announced,
          so a screen reader hears "1:4" and not "one, colon, four". */}
      <span aria-hidden className="inline-flex">
        {glyphs.map((glyph, index) => (
          <span
            key={`${glyph}-${index}`}
            data-glyph
            data-motion
            className="inline-block"
          >
            {glyph}
          </span>
        ))}
      </span>
      <span className="sr-only">{figure}</span>
    </span>
  );
}
