"use client";

import Link from "next/link";
import { motion } from "motion/react";

import type { HeroSlide } from "@/content/hero-slides";
import { MagneticButton, TextReveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { boxShadowCss, textShadowCss } from "@/lib/hero-scrim";
import { cn } from "@/lib/utils";
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

type HeroCopyProps = {
  slide: HeroSlide;
  index: number;
  total: number;
  /**
   * False on the opening slide.
   *
   * That slide's copy renders as plain elements with no Motion component
   * anywhere in it. Rendering the final variant state was not enough: Motion
   * still writes inline styles when it mounts, and that repaint landed after
   * ~1.2s of hydration, which Chrome then recorded as the LCP.
   *
   * The entrance is for slide *changes*, which is the only place it does any
   * work anyway.
   */
  animate: boolean;
};

/**
 * The text block.
 *
 * Legibility lives on the type: layered shadows, no background panel. A scrim
 * anchored to this block is what put two hard vertical edges across the
 * photograph — shadows follow the glyphs and have no box to clip against.
 *
 * Deliberately does not crossfade with the photograph — it re-enters a beat
 * later, which is what makes a slide change read as directed rather than
 * automatic. The parent remounts this on every change (via `key`), so the
 * entrance replays without any imperative animation control.
 */
export function HeroCopy({ slide, index, total, animate }: HeroCopyProps) {
  const centred = slide.textPosition === "center";
  const strength = slide.scrimStrength;
  const displayShadow = { textShadow: textShadowCss("display", strength) };
  const smallShadow = { textShadow: textShadowCss("small", strength) };

  const eyebrowClass = "text-glacier text-xs tracking-[0.24em] uppercase";
  const sublineClass = cn(
    "text-glacier/90 max-w-xl text-lg",
    centred && "mx-auto",
  );
  const ctaRowClass = cn(
    "mt-9 flex flex-wrap items-center gap-4",
    centred && "justify-center",
  );

  const headline = (
    <TextReveal
      as="h1"
      lines={splitHeadline(slide.headline)}
      delay={COPY_OFFSET}
      animate={animate}
      style={displayShadow}
      // Steps down on small screens: at text-5xl the longer headlines ran to
      // four lines at 360px.
      className="mt-5 font-display text-4xl tracking-tight text-glacier sm:text-5xl xl:text-6xl"
    />
  );

  const actions = (
    <>
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
          // The border and label both carry the shadow, so the button keeps its
          // shape against a bright frame.
          style={{ ...smallShadow, boxShadow: boxShadowCss("small", strength) }}
          className="border border-glacier/45 bg-transparent text-glacier hover:bg-glacier/10 hover:text-glacier"
        >
          <Link href={slide.ctaSecondary.href}>{slide.ctaSecondary.label}</Link>
        </Button>
      ) : null}
    </>
  );

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of ${total}`}
      // 58ch keeps the measure readable; 46% stops the headline running so wide
      // on a large frame that it reads as centred. Below xl the frame is too
      // narrow for the percentage to be anything but cramped.
      className={cn(
        "max-w-[58ch] xl:max-w-[min(58ch,46%)]",
        centred && "mx-auto text-center",
      )}
    >
      {animate ? (
        <>
          <motion.p
            data-motion
            variants={item}
            initial="hidden"
            animate="visible"
            transition={{ delay: COPY_OFFSET }}
            style={smallShadow}
            className={eyebrowClass}
          >
            {slide.region}
          </motion.p>

          {headline}

          <motion.div
            data-motion
            variants={group}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            <motion.p
              data-motion
              variants={item}
              style={smallShadow}
              className={sublineClass}
            >
              {slide.subline}
            </motion.p>
            <motion.div data-motion variants={item} className={ctaRowClass}>
              {actions}
            </motion.div>
          </motion.div>
        </>
      ) : (
        <>
          <p style={smallShadow} className={eyebrowClass}>
            {slide.region}
          </p>
          {headline}
          <div className="mt-6">
            <p style={smallShadow} className={sublineClass}>
              {slide.subline}
            </p>
            <div className={ctaRowClass}>{actions}</div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Break a headline into at most two display lines, splitting at the word
 * boundary that leaves the two halves closest in length, so the second line is
 * never a lone orphan.
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
