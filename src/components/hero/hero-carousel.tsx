"use client";

import * as React from "react";

import { HeroCopy } from "@/components/hero/hero-copy";
import { HeroIndicators } from "@/components/hero/hero-indicators";
import { HeroMedia } from "@/components/hero/hero-media";
import { Ridge } from "@/components/hero/ridge";
import { ScrollCue } from "@/components/hero/scroll-cue";
import { useHeroCarousel } from "@/components/hero/use-hero-carousel";
import { Parallax } from "@/components/motion";
import { heroSlides } from "@/content/hero-slides";

/** Horizontal travel before a touch drag counts as a swipe. */
const SWIPE_THRESHOLD = 48;

export function HeroCarousel() {
  const slides = heroSlides;
  const total = slides.length;
  const rootRef = React.useRef<HTMLElement>(null);
  const { index, loaded, progress, goTo, next, previous, setPause } =
    useHeroCarousel({ count: total, rootRef });

  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
  };

  return (
    <section
      ref={rootRef}
      // APG carousel pattern: a focusable region so the arrow keys have a home.
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured regions of Nepal"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPause("pointer", true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setPause("pointer", false);
      }}
      onFocus={() => setPause("focus", true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPause("focus", false);
        }
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
        setPause("pointer", true);
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        setPause("pointer", false);
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Ignore anything that reads as a vertical scroll.
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) {
          return;
        }
        if (dx < 0) next();
        else previous();
      }}
      className="relative h-svh w-full overflow-hidden bg-summit focus-visible:outline-none"
    >
      {/* Photography */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => (
          <HeroMedia
            key={slide.id}
            slide={slide}
            index={i}
            active={i === index}
            progress={progress}
            load={loaded.includes(i)}
            lcp={i === 0}
          />
        ))}
      </div>

      {/* Scrims, in four passes.
          A — a flat wash. Heavy below 1280px, where the copy spans most of the
              frame and there is nowhere bright to put it; light above, where it
              only occupies the left column.
          B — the two-stop directional wash the brand calls for: summit at 78%
              bottom-left to 15% top-right.
          C — a left-weighted bed, so the contrast is bought where the copy sits
              rather than by flattening the whole photograph.
          D — a floor grounding the bottom edge.
          Tuned by compositing all five photographs under this exact stack and
          taking the worst pixel inside the text block at 360/768/1024/1280/1440/
          1920. Worst case is 4.95:1; B on its own measured 2.07:1. Re-measure if
          any of these numbers move. */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-summit/65 xl:bg-summit/25"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-[linear-gradient(to_top_right,rgb(11_31_42/0.78)_0%,rgb(11_31_42/0.15)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgb(11_31_42/0.72)_0%,rgb(11_31_42/0.50)_40%,rgb(11_31_42/0)_72%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-[linear-gradient(to_top,rgb(11_31_42/0.70)_0%,rgb(11_31_42/0.35)_35%,rgb(11_31_42/0)_65%)]"
      />
      {/* Ridgeline: above the photo, below the text. */}
      <Parallax
        distance={24}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
      >
        <Ridge className="h-[30vh] w-full opacity-40" />
      </Parallax>

      {/* Dissolve into the page. Drawn last of the z-10 layers so it takes the
          ridgeline down with it. In light mode this band goes pale, which is why
          the controls below sit clear of it. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent to-background"
      />

      {/* Copy — sits slightly above true centre (55/45). */}
      <div className="pointer-events-none relative z-20 flex h-full flex-col justify-center pb-[10svh]">
        <div className="pointer-events-auto shell">
          <HeroCopy
            key={slides[index].id}
            slide={slides[index]}
            index={index}
            total={total}
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-28 z-30 shell flex items-end justify-between gap-6">
        <HeroIndicators
          slides={slides}
          index={index}
          progress={progress}
          onSelect={goTo}
        />
        <div className="hidden sm:block">
          <ScrollCue />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {slides[index].region}
      </p>
    </section>
  );
}
