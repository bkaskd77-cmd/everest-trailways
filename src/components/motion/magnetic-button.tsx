"use client";

import * as React from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";

import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";

type MagneticButtonProps = {
  children: React.ReactNode;
  className?: string;
  /** Fraction of the cursor's offset the element travels. Keep it under 0.5. */
  strength?: number;
};

/**
 * Cursor attraction. The wrapper leans toward the pointer while it is over the
 * element and springs back on exit.
 *
 * Pointer-driven only: touch and coarse pointers never trigger it, and users
 * who prefer reduced motion get a plain, immobile control.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (reduced || event.pointerType !== "mouse" || !ref.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;

    const bounds = ref.current.getBoundingClientRect();
    x.set((event.clientX - (bounds.left + bounds.width / 2)) * strength);
    y.set((event.clientY - (bounds.top + bounds.height / 2)) * strength);
  };

  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.span
      ref={ref}
      data-motion
      // `display` stays a class, not an inline style, so callers can still
      // hide the wrapper with a responsive utility.
      className={cn("inline-block", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={release}
      onPointerCancel={release}
      // Keyboard users never move the pointer, so make sure focus resets it.
      onBlurCapture={release}
    >
      {children}
    </m.span>
  );
}
