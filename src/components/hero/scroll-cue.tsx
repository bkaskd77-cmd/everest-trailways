"use client";

import * as React from "react";

import { DURATION, EASE } from "@/lib/motion";
import {
  HAIRLINE_MIN_OPACITY,
  boxShadowCss,
  textShadowCss,
} from "@/lib/hero-scrim";
import * as m from "motion/react-m";

/**
 * Vertical "SCROLL" label with a light travelling down a 1px rule. Fades out
 * once the reader has clearly started scrolling.
 */
export function ScrollCue({ strength }: { strength?: number }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const update = () => setVisible(window.scrollY < 100);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <m.div
      data-motion
      aria-hidden
      style={{ textShadow: textShadowCss("small", strength) }}
      className="pointer-events-none flex flex-col items-center gap-3 text-glacier"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: DURATION.fast, ease: EASE }}
    >
      <span className="text-[0.625rem] tracking-[0.3em] [writing-mode:vertical-rl]">
        SCROLL
      </span>
      <span
        // The rule is a hairline over photography: it needs both the opacity
        // floor and a shadow or it disappears on a bright frame.
        style={{
          opacity: HAIRLINE_MIN_OPACITY,
          boxShadow: boxShadowCss("small", strength),
        }}
        className="relative block h-14 w-px overflow-hidden bg-glacier"
      >
        <m.span
          data-motion
          className="absolute inset-x-0 block h-1/3 bg-glacier"
          initial={{ y: "-100%" }}
          animate={{ y: "300%" }}
          transition={{
            duration: 1.8,
            ease: EASE,
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        />
      </span>
    </m.div>
  );
}
