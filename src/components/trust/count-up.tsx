"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { DURATION, EASE } from "@/lib/motion";

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
 * Counts a figure up from zero when it scrolls into view, once.
 *
 * The final value is what renders on the server, so there is no layout shift
 * and no-JS readers see the real number. The count only starts if the element
 * was below the fold at mount — otherwise it would visibly reset itself in
 * front of someone already looking at it.
 *
 * Non-numeric figures ("1:4") skip all of this and simply render.
 */
export function CountUp({ figure }: { figure: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  // Fires ~240px before the figure is actually visible, so the reset to zero
  // happens off-screen and the count plays as it scrolls in.
  const inView = useInView(ref, { once: true, margin: "0px 0px 240px 0px" });
  const match = NUMERIC.exec(figure);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !inView || target === null || target === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      // The reset lives inside the first frame, not in an earlier effect: if
      // rAF never runs — a backgrounded tab, a browser that throttles it — the
      // figure keeps its real value instead of being stranded at zero. A stuck
      // "0 public registrations" would be worse than no animation at all.
      if (!start) start = now;
      const t = Math.min(1, (now - start) / (DURATION.slow * 1500));
      node.textContent = `${Math.round(ease(t) * target)}${suffix}`;
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
