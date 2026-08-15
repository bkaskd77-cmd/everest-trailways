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
import { moodGradientCss } from "@/lib/hero-scrim";

/** Horizontal travel before a touch drag counts as a swipe. */
const SWIPE_THRESHOLD = 48;

export function HeroCarousel() {
  const slides = heroSlides;
  const total = slides.length;
  const rootRef = React.useRef<HTMLElement>(null);
  const {
    index,
    loaded,
    hasChanged,
    progress,
    goTo,
    next,
    previous,
    setPause,
  } = useHeroCarousel({ count: total, rootRef });

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

      {/* The only full-frame layer: atmosphere. It carries no contrast
          responsibility — that belongs to the text bed, which lives with the
          copy in <HeroCopy> and is sized from the copy's own box. Keeping the
          two apart is what lets the right of the frame stay unveiled. */}
      <div
        aria-hidden
        className="absolute inset-0 z-10"
        style={{ backgroundImage: moodGradientCss() }}
      />

      {/* Ridgeline: above the photo, below the text. Decorative only — it sits
          entirely below the copy block at every breakpoint, which
          `pnpm check:hero` asserts. */}
      <Parallax
        distance={24}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
      >
        <Ridge className="h-[30vh] w-full opacity-[0.35]" />
      </Parallax>

      {/* Dissolve into the page. --color-background is glacier in light and
          summit in dark, so this never fades toward white. Eased through a
          midpoint so it reads as a dissolve rather than a band. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-10 h-16"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-background) 18%, transparent) 65%, color-mix(in srgb, var(--color-background) 55%, transparent) 100%)",
        }}
      />

      {/* Copy — sits slightly above true centre (55/45). */}
      <div className="pointer-events-none relative z-20 flex h-full flex-col justify-center pb-[10svh]">
        <div className="pointer-events-auto shell">
          <HeroCopy
            key={slides[index].id}
            slide={slides[index]}
            index={index}
            total={total}
            animate={hasChanged}
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
          <ScrollCue strength={slides[index]?.scrimStrength} />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {slides[index].region}
      </p>
    </section>
  );
}
