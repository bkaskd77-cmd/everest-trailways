import { Suspense } from "react";
import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { TrekIndex, type TrekCard } from "@/components/trek/trek-index";
import { TREK_PAGES } from "@/content/trek-pages";
import { bookableFor, priceRange, trekDepartures } from "@/lib/treks";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Treks",
  description:
    "Every route we run, one page each: the full route, the month-by-month season, what it costs, who it is wrong for, and every date on it — including the ones that did not run.",
  alternates: { canonical: "/treks" },
};

/**
 * Every route we run.
 *
 * The counts and prices on these cards are read from the departures, not
 * written here. A "from $690" typed into an index is a price that goes stale
 * without anything on the site disagreeing with it, which is the quiet kind of
 * wrong this project keeps designing out.
 */
export default function TreksIndexPage() {
  const cards: TrekCard[] = TREK_PAGES.map((trek) => {
    const range = priceRange(trek.id);
    return {
      trek,
      priceFrom: range?.from ?? null,
      openCount: bookableFor(trek.id).length,
      totalCount: trekDepartures(trek.id).length,
    };
  });

  const totalOpen = cards.reduce((n, c) => n + c.openCount, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Treks",
    numberOfItems: cards.length,
    itemListElement: cards.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.trek.name,
      url: `${siteConfig.url}/treks/${c.trek.slug}`,
    })),
  };

  return (
    <main className="bg-band-sunk">
      <JsonLd data={jsonLd} />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Treks
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Every route we run, and who each one is wrong for.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {cards.length} routes across{" "}
          {new Set(cards.map((c) => c.trek.region)).size} regions, carrying{" "}
          {totalOpen} open {totalOpen === 1 ? "date" : "dates"} between them.
          Each page rates all twelve months for that route specifically, says
          plainly who should not book it, and compares it with the walks people
          weigh it against — including the reasons to choose the other one.
        </p>

        <div className="mt-12">
          {/* Filter state lives in the query string, so the subtree opts out of
              prerendering. The heading above it does not. */}
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <TrekIndex cards={cards} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
