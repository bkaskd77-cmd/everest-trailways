import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { Reveal, StaggerGroup } from "@/components/motion";
import { Button } from "@/components/ui/button";
import {
  REGIONS,
  bookableFor,
  priceRange,
  regionBySlug,
  regionSlug,
  treksInRegion,
} from "@/lib/treks";
import { siteConfig } from "@/lib/site";

/**
 * A region, and the treks in it.
 *
 * This page exists because the trek pages name their region and a named thing
 * that is not a link is a dead end, while a named thing that links to a 404 is
 * worse. It is deliberately short: the region is a way of getting to the
 * treks, and everything worth saying about a walk is on the walk's own page.
 * Padding this out with a thousand words about the Annapurna massif would be
 * writing for a crawler rather than a reader, and the crawler has got better
 * at telling the difference.
 */

export function generateStaticParams() {
  return REGIONS.map((region) => ({ slug: regionSlug(region) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) return { title: "Region not found" };

  const treks = treksInRegion(region);
  const description = `${treks.length} ${treks.length === 1 ? "route" : "routes"} in ${region}: ${treks.map((t) => t.name).join(", ")}. Each one publishes its month-by-month season, its full cost breakdown and every date on it.`;

  return {
    title: region,
    description,
    alternates: { canonical: `/regions/${slug}` },
    openGraph: {
      title: `${region} — ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/regions/${slug}`,
    },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) notFound();

  const treks = treksInRegion(region);
  const open = treks.reduce((n, t) => n + bookableFor(t.id).length, 0);

  return (
    <main className="bg-band-sunk">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            name: region,
            url: `${siteConfig.url}/regions/${slug}`,
            containsPlace: treks.map((t) => ({
              "@type": "TouristTrip",
              name: t.name,
              url: `${siteConfig.url}/treks/${t.slug}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Treks",
                item: `${siteConfig.url}/treks`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: region,
                item: `${siteConfig.url}/regions/${slug}`,
              },
            ],
          },
        ]}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <Link href="/treks" className="hover:text-foreground">
                Treks
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{region}</li>
          </ol>
        </nav>

        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          {region}
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {treks.length} {treks.length === 1 ? "route" : "routes"} here,
          carrying {open} open {open === 1 ? "date" : "dates"} between them.
          Each route page rates all twelve months for that route specifically —
          the same month is a different proposition on each of these.
        </p>

        <StaggerGroup as="ul" className="mt-12 grid gap-4">
          {treks.map((trek) => {
            const range = priceRange(trek.id);
            const dates = bookableFor(trek.id).length;
            return (
              <Reveal as="li" key={trek.id}>
                <Link
                  href={`/treks/${trek.slug}`}
                  className="group grid gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <h2 className="font-display text-2xl tracking-tight">
                      {trek.name}
                    </h2>
                    <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
                      {trek.summary}
                    </p>
                    <p className="tabular mt-3 text-sm text-muted-foreground">
                      {trek.typicalDays[0] === trek.typicalDays[1]
                        ? `${trek.typicalDays[0]} days`
                        : `${trek.typicalDays[0]}–${trek.typicalDays[1]} days`}{" "}
                      · {trek.maxAltitudeM.toLocaleString("en-GB")} m ·{" "}
                      <span className="capitalize">{trek.difficulty}</span> ·{" "}
                      {dates} {dates === 1 ? "date" : "dates"} open
                    </p>
                  </div>
                  <p className="tabular flex items-center gap-2 text-lg sm:justify-end">
                    {range ? `from $${range.from.toLocaleString("en-GB")}` : ""}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-1"
                    />
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </StaggerGroup>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="outline">
            <Link href="/treks">All treks</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/departures?region=${encodeURIComponent(region)}`}>
              Dates in {region}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
