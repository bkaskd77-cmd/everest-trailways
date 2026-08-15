"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

import { fadeUp, withDelay } from "@/lib/motion";
import { StaggerContext } from "@/components/motion/stagger-context";

type RevealElement = "div" | "section" | "article" | "li" | "span" | "p";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to hold before animating. Ignored inside a <StaggerGroup>. */
  delay?: number;
  as?: RevealElement;
  variants?: Variants;
};

/**
 * Viewport-triggered fade-up. Fires once and never re-hides.
 *
 * Reduced motion: `data-motion` pins the element to its resting state from
 * first paint (see the reduced-motion block in globals.css) and the root
 * <MotionConfig reducedMotion="user"> stops Motion animating transforms.
 * Content is therefore never hidden behind an animation it will not play.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  variants = fadeUp,
}: RevealProps) {
  const staggered = React.useContext(StaggerContext);
  const Component = motion[as] as typeof motion.div;
  const resolved = withDelay(variants, delay);

  // Inside a StaggerGroup the parent owns the trigger; a second one would
  // fight it.
  if (staggered) {
    return (
      <Component data-motion className={className} variants={resolved}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      data-motion
      className={className}
      variants={resolved}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
    >
      {children}
    </Component>
  );
}
