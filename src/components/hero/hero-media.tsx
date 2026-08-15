"use client";

import * as React from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";

import type { HeroSlide } from "@/content/hero-slides";
import { BASE_IMAGE_FILTER } from "@/lib/hero-scrim";
import { EASE } from "@/lib/motion";
import { CROSSFADE } from "@/components/hero/use-hero-carousel";

const KEN_BURNS_SCALE = 1.08;
/** Peak drift in px. Stays inside the 6% bleed below, even at 360px wide. */
const DRIFT = 20;

type HeroMediaProps = {
  slide: HeroSlide;
  index: number;
  active: boolean;
  /** Shared 0→1 clock for the active slide. */
  progress: MotionValue<number>;
  /** False until this slide is the next one up — keeps 5 images off the wire. */
  load: boolean;
  /** True for slide 1 only: the LCP element. */
  lcp: boolean;
};

/**
 * One photographic layer. Crossfades on `active`, and runs its Ken Burns move
 * off the same clock as the autoplay timer — so pausing the carousel pauses the
 * zoom too, and the two can never drift apart.
 */
export function HeroMedia({
  slide,
  index,
  active,
  progress,
  load,
  lcp,
}: HeroMediaProps) {
  // Mirrors `progress` while active, then freezes — the outgoing slide holds
  // its zoom through the crossfade instead of snapping back.
  const local = useMotionValue(0);

  React.useEffect(() => {
    if (!active) return;
    local.set(progress.get());
    return progress.on("change", (value) => local.set(value));
  }, [active, progress, local]);

  // Odd slides (1st, 3rd, 5th) drift up-left; even slides drift down-right.
  const direction = index % 2 === 0 ? -1 : 1;
  const scale = useTransform(local, [0, 1], [1, KEN_BURNS_SCALE]);
  const x = useTransform(local, [0, 1], [0, DRIFT * direction]);
  const y = useTransform(local, [0, 1], [0, DRIFT * direction]);

  return (
    <motion.div
      data-hero-slide
      data-active={active}
      aria-hidden={!active}
      className="absolute inset-0 overflow-hidden bg-summit"
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: CROSSFADE, ease: EASE }}
      style={{ zIndex: active ? 2 : 1 }}
    >
      {load ? (
        <motion.div
          data-motion
          className="absolute -inset-[6%] will-change-transform"
          style={{ scale, x, y }}
        >
          <Image
            src={slide.image.src}
            alt={slide.image.alt}
            fill
            sizes="100vw"
            quality={70}
            loading={lcp ? "eager" : "lazy"}
            fetchPriority={lcp ? "high" : "auto"}
            placeholder={slide.image.blurDataURL ? "blur" : "empty"}
            blurDataURL={slide.image.blurDataURL}
            style={{
              objectFit: "cover",
              objectPosition: slide.focalPoint,
              // The scrim is local now, so lifting every frame costs nothing in
              // legibility. Per-slide `imageFilter` is appended, not replaced.
              filter: slide.imageFilter
                ? `${BASE_IMAGE_FILTER} ${slide.imageFilter}`
                : BASE_IMAGE_FILTER,
            }}
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
