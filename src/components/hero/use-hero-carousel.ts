"use client";

import * as React from "react";
import { useMotionValue } from "motion/react";

/** Seconds a slide holds before advancing. */
export const SLIDE_DURATION = 7;
/** Seconds the image crossfade takes. */
export const CROSSFADE = 1.2;
/** Seconds the copy waits after the crossfade starts. The directed feel. */
export const COPY_OFFSET = 0.25;

type Options = {
  count: number;
  rootRef: React.RefObject<HTMLElement | null>;
};

/**
 * Autoplay clock for the hero.
 *
 * Progress is a MotionValue rather than React state: the indicator fills at
 * 60fps without re-rendering the tree, and only an index change costs a render.
 *
 * The clock never starts under `prefers-reduced-motion`, so the index stays at
 * 0 and the hero is a single static slide — decided in an effect, never in
 * render, which is what keeps server and client markup identical.
 */
export function useHeroCarousel({ count, rootRef }: Options) {
  const [index, setIndex] = React.useState(0);
  // Which slides may fetch their image: the current one and the next. Grows as
  // the carousel cycles, so all five are never in flight at once.
  const [loaded, setLoaded] = React.useState<number[]>(() =>
    count > 1 ? [0, 1] : [0],
  );

  const progress = useMotionValue(0);
  // Mirrors `index` so the animation frame can advance without a stale closure.
  const indexRef = React.useRef(0);

  // Pause reasons live in a ref so toggling one does not restart the loop.
  const pauses = React.useRef({
    pointer: false,
    focus: false,
    hidden: false,
    offscreen: false,
  });

  const setPause = React.useCallback(
    (reason: keyof typeof pauses.current, value: boolean) => {
      pauses.current[reason] = value;
    },
    [],
  );

  const commit = React.useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;
      const upcoming = (target + 1) % count;
      indexRef.current = target;
      progress.set(0);
      setIndex(target);
      setLoaded((current) =>
        current.includes(target) && current.includes(upcoming)
          ? current
          : [...new Set([...current, target, upcoming])],
      );
    },
    [count, progress],
  );

  const next = React.useCallback(() => commit(indexRef.current + 1), [commit]);
  const previous = React.useCallback(
    () => commit(indexRef.current - 1),
    [commit],
  );

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      // A backgrounded tab hands back a huge delta on return; drop those frames
      // rather than skipping a slide the instant the reader comes back.
      if (!Object.values(pauses.current).some(Boolean) && delta < 0.5) {
        const value = progress.get() + delta / SLIDE_DURATION;
        if (value >= 1) commit(indexRef.current + 1);
        else progress.set(value);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [commit, progress]);

  // Page Visibility — do not burn a slide while the tab is hidden.
  React.useEffect(() => {
    const sync = () => setPause("hidden", document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [setPause]);

  // Stop once the hero has scrolled away.
  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPause("offscreen", !entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootRef, setPause]);

  return { index, loaded, progress, goTo: commit, next, previous, setPause };
}
