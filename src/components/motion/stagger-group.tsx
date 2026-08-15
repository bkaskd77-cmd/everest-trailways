"use client";

import { type Variants } from "motion/react";

import { STAGGER, staggerContainer } from "@/lib/motion";
import { StaggerContext } from "@/components/motion/stagger-context";
import * as m from "motion/react-m";

type StaggerGroupElement = "div" | "section" | "ul" | "ol" | "article";

type StaggerGroupProps = {
  children: React.ReactNode;
  className?: string;
  as?: StaggerGroupElement;
  /** Seconds between each child. Defaults to the house 0.08s step. */
  stagger?: number;
  /** Seconds before the first child animates. */
  delay?: number;
};

/**
 * Parent that reveals its <Reveal> children one after another, owning the
 * single viewport observer for the whole group.
 *
 * Reduced motion is handled by the children — see <Reveal>.
 */
export function StaggerGroup({
  children,
  className,
  as = "div",
  stagger = STAGGER,
  delay = 0,
}: StaggerGroupProps) {
  const Component = m[as] as typeof m.div;

  const variants: Variants = {
    ...staggerContainer,
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  return (
    <StaggerContext.Provider value>
      <Component
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {children}
      </Component>
    </StaggerContext.Provider>
  );
}
