"use client";

import { motion, useTransform, type MotionValue } from "motion/react";

import type { HeroSlide } from "@/content/hero-slides";

function Indicator({
  slide,
  index,
  active,
  progress,
  onSelect,
}: {
  slide: HeroSlide;
  index: number;
  active: boolean;
  progress: MotionValue<number>;
  onSelect: () => void;
}) {
  // Inactive bars sit empty; the active one fills as the timer runs.
  const scaleX = useTransform(progress, (value) => (active ? value : 0));

  return (
    <button
      type="button"
      data-hero-dot
      data-active={active}
      aria-label={`Go to slide ${index + 1}: ${slide.region}`}
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      className="group relative h-10 w-10 cursor-pointer sm:w-16"
    >
      <span
        data-hero-track
        className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-glacier/25 transition-colors group-hover:bg-glacier/45"
      />
      <motion.span
        data-hero-progress
        style={{ scaleX }}
        className="absolute inset-x-0 top-1/2 h-[3px] origin-left -translate-y-1/2 rounded-full bg-glacier"
      />
    </button>
  );
}

/**
 * Bottom-left progress bars. They fill with the autoplay timer rather than just
 * marking the active slide, so the wait is legible.
 *
 * Under reduced motion the fill is hidden and the active track goes solid —
 * see the hero block in globals.css. They stay clickable either way.
 */
export function HeroIndicators({
  slides,
  index,
  progress,
  onSelect,
}: {
  slides: HeroSlide[];
  index: number;
  progress: MotionValue<number>;
  onSelect: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {slides.map((slide, i) => (
        <Indicator
          key={slide.id}
          slide={slide}
          index={i}
          active={i === index}
          progress={progress}
          onSelect={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
