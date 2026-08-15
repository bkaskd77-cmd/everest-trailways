import type { Metadata } from "next";

import { Hero } from "@/components/design-system/hero";
import { MotionLab } from "@/components/design-system/motion-lab";
import { Section } from "@/components/design-system/section";
import { Surfaces } from "@/components/design-system/surfaces";
import { Swatches } from "@/components/design-system/swatches";
import { TypeScale } from "@/components/design-system/type-scale";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/**
 * Living reference for the token and motion layers. Not part of the public
 * site — kept reachable so the visual language stays reviewable as the build
 * grows.
 */
export default function DesignSystemPage() {
  return (
    <>
      <Hero />

      <div className="shell">
        <Reveal className="py-16 lg:py-24">
          <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
            Reference · Not indexed
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-4xl tracking-tight">
            The design system, on the record.
          </h2>
          <p className="mt-4 max-w-prose text-muted-foreground">
            Every token, type step, surface and motion primitive the rest of the
            build uses. Toggle the theme in the header to check both modes.
          </p>
        </Reveal>

        <Section
          title="Colour"
          description="Seven brand primitives, eight derived steps that hold AA on the opposite surface, and the semantic aliases components actually reference."
        >
          <Swatches />
        </Section>

        <Section
          title="Typography"
          description="Instrument Serif for display and pull quotes only; Inter for everything else. The scale is fluid between 360px and 1440px."
        >
          <TypeScale />
        </Section>

        <Section
          title="Surfaces"
          description="Two shadows, four radii plus full, and the shadcn primitives wearing the brand."
        >
          <Surfaces />
        </Section>

        <Section
          title="Motion"
          description="One easing curve, three durations, five primitives. All of it collapses to static content under prefers-reduced-motion."
        >
          <MotionLab />
        </Section>
      </div>
    </>
  );
}
