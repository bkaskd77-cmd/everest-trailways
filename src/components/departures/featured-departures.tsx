import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DepartureGrid } from "@/components/departures/departure-grid";
import { Reveal } from "@/components/motion";
import { departures } from "@/content/departures";
import { departureJsonLd } from "@/lib/departures-feed";
import { siteConfig } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

/** How many dates the homepage shows. The rest live on `/departures`. */
const FEATURED_COUNT = 6;

/**
 * The six the homepage shows.
 *
 * Soonest first, and at most one date per trek — three Bardia dates in a row
 * would read as a thin catalogue rather than a broad one, and someone scanning
 * the homepage is asking "what do you run?" before "when?".
 *
 * This cap is the section's own, not a property of the dataset. When the
 * dataset went from six departures to nineteen the grid rendered all of them:
 * a 17,000px wall of cards between the trust strip and the footer. The whole
 * set belongs on `/departures`, which is what the link above the grid is for.
 */
function featured() {
  const seen = new Set<string>();
  return [...departures]
    .sort((a, b) => a.departsOn.localeCompare(b.departsOn))
    .filter((d) => {
      if (seen.has(d.trekId)) return false;
      seen.add(d.trekId);
      return true;
    })
    .slice(0, FEATURED_COUNT);
}

/**
 * Featured departures.
 *
 * This section does not sell trips; it sells the certainty that a date will
 * run. "Fixed departure" is a phrase this market has learned to distrust, so
 * the published minimum and the decision date do the persuading, not adjectives.
 *
 * The JSON-LD is server-rendered per departure so the same facts a traveller
 * reads are the ones a search engine or an assistant can quote — and it
 * describes the six on this page, not all nineteen. `/departures` carries the
 * full set.
 */
export function FeaturedDepartures() {
  const shown = featured();
  const jsonLd = shown.map((d) => departureJsonLd(d, siteConfig.url));

  return (
    <section
      aria-labelledby="departures-heading"
      className="bg-band-sunk text-foreground"
    >
      <JsonLd data={jsonLd} />

      <div className="shell pt-4 pb-24 lg:pb-28">
        {/* Two columns sharing the page's left spine. Nothing is centred: the
            wordmark, hero eyebrow, trust columns and this heading all sit on
            one continuous edge. The right column is baseline-aligned to the
            heading rather than to the top of the block. */}
        <Reveal className="border-t border-border pt-16 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-[55fr_40fr] lg:items-end lg:gap-12">
            <div>
              <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
                Fixed departures
              </p>
              <h2
                id="departures-heading"
                className="mt-4 font-display text-4xl tracking-tight text-balance lg:text-5xl"
              >
                Guaranteed to run.
              </h2>
            </div>

            <div>
              <p className="text-base text-muted-foreground">
                Every departure publishes the number of bookings at which it is
                guaranteed, and the date we decide. If it does not reach that
                number you are told on that date and refunded in full.
              </p>
              <Link
                href="/departures"
                className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-prayer-deep dark:text-prayer-light"
              >
                All {departures.length} departures
                <ArrowRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px]"
                />
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 lg:mt-14">
          <DepartureGrid departures={shown} />
        </div>
      </div>
    </section>
  );
}
