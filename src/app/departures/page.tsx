import type { Metadata } from "next";

import { DepartureIndex } from "@/components/departure/departure-index";
import { departureJsonLd } from "@/lib/departures-feed";
import { departures } from "@/content/departures";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "All departures",
  description:
    "Every fixed departure we have on sale, with its published minimum to run, current bookings and decision date.",
  alternates: { canonical: "/departures" },
};

/**
 * Every departure, filterable.
 *
 * Static: the filters are client-side over a list that ships with the page, so
 * there is no request between choosing "under 3,000 m" and seeing the answer,
 * and the unfiltered list is in the HTML for anything that does not run
 * JavaScript.
 */
export default function DeparturesIndexPage() {
  const jsonLd = departures.map((d) => departureJsonLd(d, siteConfig.url));

  return (
    <main className="bg-band-sunk">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Fixed departures
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Every date we have on sale.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {departures.length} departures across{" "}
          {new Set(departures.map((d) => d.trekId)).size} routes. Each one
          publishes the number of bookings at which it is guaranteed and the
          date we decide. If a date does not reach that number you are told on
          that date and refunded in full.
        </p>

        <div className="mt-12">
          <DepartureIndex departures={departures} />
        </div>
      </div>
    </main>
  );
}
