import Link from "next/link";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";

import { Reveal, StaggerGroup } from "@/components/motion";
import { REGIONS, bookableFor, regionSlug, treksInRegion } from "@/lib/treks";

export const metadata: Metadata = pageMetadata({
  title: "Regions",
  description:
    "Khumbu, Annapurna, Langtang, Mustang, the Terai and the Kathmandu Valley rim, with the routes we run in each and how many dates are open on them.",
  path: "/regions",
});

/**
 * Nepal, by where you would be.
 *
 * A short index rather than an essay. Each region page is itself short, for
 * the reason written there: the walk's own page is where the answers are, and
 * a region page that tries to be the destination is a page written for a
 * crawler.
 */
export default function RegionsIndexPage() {
  const regions = REGIONS.map((region) => {
    const treks = treksInRegion(region);
    return {
      region,
      treks,
      open: treks.reduce((n, t) => n + bookableFor(t.id).length, 0),
    };
  });

  return (
    <main className="bg-band-sunk">
      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Regions
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Nepal, by where you would be.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {regions.length} regions,{" "}
          {regions.reduce((n, r) => n + r.treks.length, 0)} routes. The season
          is not the same in any two of them — the month tables on each route
          say so route by route rather than offering one calendar for the whole
          country.
        </p>

        <StaggerGroup as="ul" className="mt-12 grid gap-4 md:grid-cols-2">
          {regions.map(({ region, treks, open }) => (
            <Reveal as="li" key={region}>
              <Link
                href={`/regions/${regionSlug(region)}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25"
              >
                <h2 className="font-display text-2xl tracking-tight">
                  {region}
                </h2>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {treks.map((t) => t.name).join(", ")}.
                </p>
                <p className="mt-5 flex items-center justify-between tabular text-sm text-muted-foreground">
                  <span>
                    {treks.length} {treks.length === 1 ? "route" : "routes"} ·{" "}
                    {open} {open === 1 ? "date" : "dates"} open
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </p>
              </Link>
            </Reveal>
          ))}
        </StaggerGroup>
      </div>
    </main>
  );
}
