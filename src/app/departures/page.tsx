import { Suspense } from "react";

import Link from "next/link";
import type { Metadata } from "next";

import { DepartureIndex } from "@/components/departure/departure-index";
import { departureJsonLd } from "@/lib/departures-feed";
import { bookableDepartures, departures } from "@/content/departures";
import { siteConfig } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

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
  /*
   * Bookable only, in the structured data as well as on the page.
   *
   * The cards were filtered and this was not, so an index that showed
   * seventeen dates was describing nineteen trips to a machine, one of them
   * cancelled and refunded. A page's structured data is a claim about what is
   * on it.
   */
  const jsonLd = bookableDepartures().map((d) =>
    departureJsonLd(d, siteConfig.url),
  );

  /*
   * The intro counts the same set the grid does.
   *
   * It said nineteen while the grid showed seventeen, because the sentence
   * counted every departure in the repository and the cards counted the
   * bookable ones. Two numbers on one screen disagreeing about how much we
   * sell is the precise thing this site exists not to do, so the sentence is
   * now read from the same array as the cards and the missing dates are
   * accounted for in words rather than quietly dropped.
   */
  const open = bookableDepartures();
  const excluded = departures.length - open.length;

  return (
    <main className="bg-band-sunk">
      <JsonLd data={jsonLd} />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Fixed departures
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Every date we have on sale.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {open.length} departures across{" "}
          {new Set(open.map((d) => d.trekId)).size} routes. Each one publishes
          the number of bookings at which it is guaranteed and the date we
          decide. If a date does not reach that number you are told on that date
          and refunded in full.
        </p>
        {excluded > 0 && (
          <p className="mt-4 max-w-[62ch] text-base text-muted-foreground">
            {excluded} further {excluded === 1 ? "date" : "dates"} in the
            repository {excluded === 1 ? "is" : "are"} not listed here — they
            have run, or they did not reach their minimum and were refunded.
            Those are kept on{" "}
            <Link
              href="/treks"
              className="underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              the trek pages
            </Link>
            , where each route publishes the dates that did not run.
          </p>
        )}

        <div className="mt-12">
          {/*
            The filter state lives in the query string, which `useSearchParams`
            reads, and reading it opts the subtree out of prerendering. The
            boundary keeps that opt-out inside the filters: the heading and the
            two paragraphs above still render at build time.
          */}
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <DepartureIndex departures={departures} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
