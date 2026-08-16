import { ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

import { CountUp } from "@/components/trust/count-up";
import { Hairline } from "@/components/trust/hairline";
import { SeamEdge, SeamLift } from "@/components/trust/seam-band";
import { Reveal, StaggerGroup } from "@/components/motion";
import { trustPoints, type TrustPoint } from "@/content/trust-points";
import { STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Padding per column position, written out rather than computed so Tailwind's
 * scanner can see every class. The outer columns lose their outside padding, so
 * the first figure's left edge lands on the same gutter as the wordmark and the
 * hero eyebrow. Indices cycle if the content file ever holds more than four.
 */
const COLUMN_PADDING = [
  "sm:pr-8 sm:pl-0 lg:pr-8 lg:pl-0",
  "sm:pr-0 sm:pl-8 lg:px-8",
  "sm:pr-8 sm:pl-0 lg:px-8",
  "sm:pr-0 sm:pl-8 lg:pr-0 lg:pl-8",
];

/** Which separators a column shows, per breakpoint. */
const RULE_VISIBILITY = (index: number) => ({
  horizontal:
    index === 0 ? "hidden" : index < 2 ? "block sm:hidden" : "block lg:hidden",
  vertical:
    index === 0
      ? "hidden"
      : index % 2 === 1
        ? "hidden sm:block"
        : "hidden lg:block",
});

function VerifyLink({ verify }: { verify: TrustPoint["verify"] }) {
  const Icon = verify.external ? ExternalLink : ArrowRight;
  const content = (
    <>
      {verify.label}
      <Icon
        aria-hidden
        className="size-3 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[3px]"
      />
    </>
  );
  const className =
    "text-prayer-deep dark:text-prayer-light group mt-5 inline-flex items-center gap-2 text-sm font-medium";

  return verify.external ? (
    <a
      href={verify.href}
      target="_blank"
      rel="noreferrer noopener"
      className={className}
    >
      {content}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : (
    <Link href={verify.href} className={className}>
      {content}
    </Link>
  );
}

function StatusBadge({ status }: { status: TrustPoint["status"] }) {
  if (status === "verified") {
    return (
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs tracking-[0.1em] text-verified uppercase">
        <BadgeCheck aria-hidden className="size-3.5" />
        Verified
      </p>
    );
  }
  return (
    <p className="mt-4 text-xs tracking-[0.1em] text-muted-foreground uppercase">
      Verification pending
    </p>
  );
}

/**
 * The band beneath the hero.
 *
 * Deliberately the opposite of the photography above it: paperwork. Every claim
 * here carries a link to something a stranger can check without contacting us —
 * see the rules at the top of src/content/trust-points.ts.
 */
export function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="relative bg-band text-foreground"
    >
      <h2 id="trust-heading" className="sr-only">
        What you can check for yourself
      </h2>

      {/* The band's end of the seam. Both of these are driven by the hero's
          exit progress rather than by a trigger of their own — see seam-band. */}
      <SeamEdge />

      {/* Asymmetric on purpose: the closing line carries its own top margin, so
          equal padding top and bottom read as roughly twice the space below. */}
      <SeamLift>
        <div className="shell pt-20 pb-12 lg:pt-28 lg:pb-16">
          <StaggerGroup
            as="ul"
            // The row track lives on the list, and each column opts into it with
            // subgrid. Giving every column its own grid cannot align anything
            // across siblings — row heights are per-item — which is why the
            // verify links previously sat at four different heights.
            className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-[repeat(2,auto_auto_1fr_auto_auto)] lg:grid-cols-4 lg:grid-rows-[auto_auto_1fr_auto_auto]"
          >
            {trustPoints.map((point, index) => {
              const rules = RULE_VISIBILITY(index);
              return (
                <Reveal
                  as="li"
                  key={point.id}
                  // A five-row grid with only the body flexible, so the verify
                  // link and the status badge land on shared baselines across all
                  // four columns however long the sentence is.
                  className={cn(
                    "relative grid grid-rows-[auto_auto_1fr_auto_auto] py-10",
                    "sm:row-span-5 sm:grid-rows-subgrid sm:py-12 lg:py-0",
                    COLUMN_PADDING[index % COLUMN_PADDING.length],
                  )}
                >
                  <Hairline
                    orientation="horizontal"
                    delay={STAGGER * index + 0.2}
                    className={cn(
                      "absolute inset-x-0 top-0 h-px bg-border",
                      rules.horizontal,
                    )}
                  />
                  <Hairline
                    orientation="vertical"
                    delay={STAGGER * index + 0.2}
                    className={cn(
                      "absolute inset-y-0 left-0 w-px bg-border",
                      rules.vertical,
                    )}
                  />

                  {/* Fixed line box so figures share a baseline across columns
                    however wide the string is. */}
                  <p className="font-display text-5xl leading-[1.05] tracking-tight text-summit dark:text-glacier">
                    <CountUp figure={point.figure} />
                  </p>
                  <p className="mt-3 text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    {point.figureLabel}
                  </p>
                  <p className="mt-5 max-w-[34ch] pb-2 text-base">
                    {point.body}
                  </p>

                  <div className="flex items-start">
                    <VerifyLink verify={point.verify} />
                  </div>
                  <StatusBadge status={point.status} />
                </Reveal>
              );
            })}
          </StaggerGroup>

          <Reveal delay={0.35}>
            <p className="mt-16 text-center font-display text-xl tracking-tight text-muted-foreground lg:mt-20 lg:text-2xl">
              Every claim on this page links to something you can check
              yourself.
            </p>
          </Reveal>
        </div>
      </SeamLift>
    </section>
  );
}
