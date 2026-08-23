import { Suspense } from "react";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

import { JsonLd } from "@/components/json-ld";
import { ActivityIndex } from "@/components/activity/activity-index";
import { ACTIVITIES } from "@/content/activities";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Activities",
  description:
    "Rafting, paragliding, safari, cycling, cultural days and one climb — run on demand or in season rather than as fixed group departures, with the same itemised cost sheet.",
  path: "/activities",
});

/**
 * The second product type.
 *
 * Kept separate from /departures rather than merged into it, because the two
 * answer different questions. A departure asks "will this date run"; an
 * activity asks "can I go on Tuesday". Putting a two-hour paraglide in a list
 * headed "seats remaining" would be describing a mechanism that does not exist
 * for it.
 */
export default function ActivitiesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Activities",
    numberOfItems: ACTIVITIES.length,
    itemListElement: ACTIVITIES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.name,
      url: `${siteConfig.url}/activities/${a.slug}`,
    })),
  };

  const onDemand = ACTIVITIES.filter(
    (a) => a.availability.mode === "on-demand",
  ).length;

  return (
    <main className="bg-band-sunk">
      <JsonLd data={jsonLd} />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Activities
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Not every trip is a trek.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {ACTIVITIES.length} things we run that are not fixed departures.{" "}
          {onDemand} of them go on demand, for one or two people, which means
          there is no minimum to reach and nothing to guarantee — a difference
          we model rather than paper over. Each one publishes the same itemised
          cost sheet as a trek, and where the per-person price moves with group
          size the whole table is on the page.
        </p>

        <div className="mt-12">
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <ActivityIndex activities={ACTIVITIES} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
