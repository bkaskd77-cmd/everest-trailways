"use client";

import * as React from "react";
import { useMotionValue, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";

import { CARD_TRACKS } from "@/components/departures/departure-card";
import { TILT, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The grid cell a departure card lives in, and the surface it responds from.
 *
 * The old hover was a flat scale on the photograph — the same lift every card
 * in every product grid on the internet has. This tracks the pointer instead:
 * the card tips toward it, at most four degrees, and the photograph slides
 * eight pixels against the frame in the opposite direction, which is what makes
 * the frame read as a window rather than a border.
 *
 * Three rules it has to obey:
 *
 *   Pointer only. A finger cannot hover, so on touch this would fire on tap and
 *   read as a glitch. Gated on `(hover: hover) and (pointer: fine)`.
 *
 *   No layout. Everything here is a transform or a custom property feeding one;
 *   the grid cannot reflow because of it, and the subgrid tracks the card sits
 *   in are resolved before any of this applies.
 *
 *   No measuring during the gesture. The bounding box is read once on entry and
 *   cached — reading it per pointermove would force a synchronous layout on
 *   every frame, on a page with six of these.
 */
export function DepartureCell({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  // Pointer position within the card, -0.5 to 0.5 on each axis.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, TILT.spring);
  const y = useSpring(pointerY, TILT.spring);

  const rotateY = useTransform(x, [-0.5, 0.5], [-TILT.maxDeg, TILT.maxDeg]);
  // Inverted: pushing the pointer down should tip the near edge toward you.
  const rotateX = useTransform(y, [-0.5, 0.5], [TILT.maxDeg, -TILT.maxDeg]);
  const parallaxX = useTransform(
    x,
    [-0.5, 0.5],
    [`${TILT.parallaxPx}px`, `${-TILT.parallaxPx}px`],
  );
  const parallaxY = useTransform(
    y,
    [-0.5, 0.5],
    [`${TILT.parallaxPx}px`, `${-TILT.parallaxPx}px`],
  );

  const box = React.useRef<DOMRect | null>(null);
  const allowed = React.useRef<boolean | null>(null);

  // Resolved on first use rather than during render: a media query read in
  // render would differ between server and client and break hydration.
  const canTilt = () => {
    if (allowed.current === null) {
      allowed.current =
        window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return allowed.current;
  };

  const rest = (node: HTMLElement) => {
    pointerX.set(0);
    pointerY.set(0);
    box.current = null;
    node.style.willChange = "";
  };

  return (
    <m.li
      data-motion
      variants={fadeUp}
      className={cn(CARD_TRACKS, "relative hover:z-10")}
      style={
        {
          transformPerspective: TILT.perspective,
          rotateX,
          rotateY,
          // Consumed by the photograph inside the card, which slides against the
          // frame rather than with it.
          "--par-x": parallaxX,
          "--par-y": parallaxY,
        } as React.CSSProperties
      }
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || !canTilt()) return;
        const node = event.currentTarget;
        box.current = node.getBoundingClientRect();
        node.style.willChange = "transform";
      }}
      onPointerMove={(event) => {
        const rect = box.current;
        if (!rect) return;
        pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
        pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={(event) => rest(event.currentTarget)}
      // Keyboard users never enter or leave with a pointer, and a card left
      // tilted after a stray pointerenter would stay that way.
      onBlur={(event) => rest(event.currentTarget)}
      data-cell-index={index}
    >
      {children}
    </m.li>
  );
}
