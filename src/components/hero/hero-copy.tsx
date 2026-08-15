"use client";

import Link from "next/link";
import { motion } from "motion/react";

import type { HeroSlide } from "@/content/hero-slides";
import { MagneticButton, TextReveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { COPY_OFFSET } from "@/components/hero/use-hero-carousel";

const group = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER, delayChildren: COPY_OFFSET },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
};

/**
 * The text block. Deliberately does not crossfade with the photograph — it
 * re-enters a beat later, which is what makes a slide change read as directed
 * rather than automatic.
 *
 * The parent remounts this on every slide change (via `key`), so the entrance
 * replays without any imperative animation control.
 */
export function HeroCopy({
  slide,
  index,
  total,
  animate,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  /**
   * False on the opening slide. Its copy is painted straight from the server
   * HTML, because an element animating up from opacity 0 is not eligible as the
   * LCP element until it lands — which measured as 2.3s of pure render delay.
   * The entrance is for slide *changes*, which is where it does its work.
   */
  animate: boolean;
}) {
  const state = animate ? "hidden" : "visible";

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of ${total}`}
      className="max-w-[60ch]"
    >
      <motion.p
        data-motion
        variants={item}
        initial={state}
        animate="visible"
        transition={{ delay: animate ? COPY_OFFSET : 0 }}
        // Not --color-sky: measured against the brightest pixel of these
        // photographs it tops out around 4.3:1, and no reasonable scrim fixes
        // that without flattening the image. Glacier clears AA everywhere.
        className="text-xs tracking-[0.24em] text-glacier/85 uppercase"
      >
        {slide.region}
      </motion.p>

      <TextReveal
        as="h1"
        lines={splitHeadline(slide.headline)}
        delay={COPY_OFFSET}
        animate={animate}
        // Steps down on small screens: at text-5xl the longer headlines ran to
        // four lines at 360px.
        className="mt-5 font-display text-4xl tracking-tight text-glacier sm:text-5xl xl:text-6xl"
      />

      <motion.div
        data-motion
        variants={group}
        initial={state}
        animate="visible"
        className="mt-6"
      >
        <motion.p
          data-motion
          variants={item}
          className="max-w-xl text-lg text-glacier/80"
        >
          {slide.subline}
        </motion.p>

        <motion.div
          data-motion
          variants={item}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <MagneticButton>
            <Button asChild size="lg">
              <Link href={slide.ctaPrimary.href}>{slide.ctaPrimary.label}</Link>
            </Button>
          </MagneticButton>

          {slide.ctaSecondary ? (
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="border border-glacier/30 bg-transparent text-glacier hover:bg-glacier/10 hover:text-glacier"
            >
              <Link href={slide.ctaSecondary.href}>
                {slide.ctaSecondary.label}
              </Link>
            </Button>
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Break a headline into at most two display lines, splitting at the last word
 * boundary before the midpoint so the second line is never a lone orphan.
 */
function splitHeadline(headline: string): string[] {
  const words = headline.split(" ");
  if (words.length < 3) return [headline];

  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const gap = Math.abs(left - right);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
