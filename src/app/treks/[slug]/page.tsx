import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, X } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { Reveal, StaggerGroup } from "@/components/motion";
import { SectionHead } from "@/components/departure/section-head";
import { SeasonalityTable } from "@/components/trek/seasonality-table";
import { SiteImage } from "@/components/site-image";
import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/departure/faq-section";
import {
  departureStatus,
  formatDate,
  formatDateRange,
  seatsRemaining,
} from "@/content/departures";
import { TREK_PAGES, trekBySlug } from "@/content/trek-pages";
import {
  bookableFor,
  cancelledFor,
  priceRange,
  regionSlug,
  trekBreadcrumbJsonLd,
  trekDepartures,
  trekFaqJsonLd,
  trekFaqs,
  trekHeroImage,
  trekJsonLd,
} from "@/lib/treks";
import { textShadowCss } from "@/lib/hero-scrim";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * One trek, across every date it runs.
 *
 * The departure pages answer "should I take this date". This answers the
 * question underneath it — "is this the right walk for me at all" — which is
 * the one somebody asks months earlier, from a search box, and the one no
 * dated page can hold because the answer does not expire.
 *
 * So the order here is the order of that decision: what it is, who it suits,
 * who it does not, when to come, what to weigh it against, and only then the
 * dates. Suits and does-not-suit are the same size on the page and neither is
 * softened. A page that cannot say who should not book is a brochure, and a
 * brochure is not worth citing.
 */

export function generateStaticParams() {
  return TREK_PAGES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trek = trekBySlug(slug);
  if (!trek) return { title: "Trek not found" };

  return {
    title: trek.name,
    description: trek.summary,
    alternates: { canonical: `/treks/${trek.slug}` },
    openGraph: {
      title: `${trek.name} — ${siteConfig.name}`,
      description: trek.summary,
      url: `${siteConfig.url}/treks/${trek.slug}`,
      ...(trekHeroImage(trek).src
        ? { images: [trekHeroImage(trek).src as string] }
        : {}),
    },
  };
}

const DIFFICULTY_NOTE = {
  moderate: "Long days on a made trail.",
  challenging: "Sustained ascent, and altitude that has to be respected.",
  strenuous: "Consecutive hard days with little margin.",
} as const;

export default async function TrekPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trek = trekBySlug(slug);
  if (!trek) notFound();

  const all = trekDepartures(trek.id);
  const open = bookableFor(trek.id);
  const cancelled = cancelledFor(trek.id);
  const range = priceRange(trek.id);
  const hero = trekHeroImage(trek);
  const faqs = trekFaqs(trek);
  const [minDays, maxDays] = trek.typicalDays;
  const dayLabel = minDays === maxDays ? `${minDays}` : `${minDays}–${maxDays}`;

  return (
    <>
      <JsonLd
        data={[
          trekJsonLd(trek, siteConfig.url),
          trekBreadcrumbJsonLd(trek, siteConfig.url),
          trekFaqJsonLd(trek, siteConfig.url),
        ]}
      />

      {/* 1 — HEADER */}
      <header className="relative isolate overflow-hidden bg-summit text-glacier">
        {hero.src ? (
          <SiteImage
            slot="departureHero"
            src={hero.src}
            alt={hero.alt}
            focal={hero.focal}
            priority
            className="absolute inset-0 -z-10 size-full object-cover opacity-70"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-summit via-summit/70 to-summit/30"
        />

        <div className="shell py-20 lg:py-28">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-glacier/70">
              <li>
                <Link href="/treks" className="hover:text-snow">
                  Treks
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/regions/${regionSlug(trek.region)}`}
                  className="hover:text-snow"
                >
                  {trek.region}
                </Link>
              </li>
            </ol>
          </nav>

          <h1
            className="mt-4 max-w-[16ch] font-display text-5xl tracking-tight text-balance lg:text-6xl"
            style={{ textShadow: textShadowCss("display") }}
          >
            {trek.name}
          </h1>

          <dl
            className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm"
            style={{ textShadow: textShadowCss("small") }}
          >
            {(
              [
                ["Region", trek.region, false],
                ["Days", dayLabel, false],
                [
                  "Highest point",
                  `${trek.maxAltitudeM.toLocaleString("en-GB")} m`,
                  false,
                ],
                [
                  "Highest night",
                  `${trek.highestSleepM.toLocaleString("en-GB")} m`,
                  false,
                ],
                // The only value here that is a bare lowercase word. It used
                // to share a `capitalize` with the rest of the row, which
                // rendered the unit as "3,210 M" and the count as "1 Of 2".
                ["Difficulty", trek.difficulty, true],
                ["Dates open", `${open.length} of ${all.length}`, false],
              ] as [string, string, boolean][]
            ).map(([label, value, capitalise]) => (
              <div key={label}>
                <dt className="text-xs tracking-[0.14em] text-glacier/70 uppercase">
                  {label}
                </dt>
                <dd className={cn("mt-1 tabular", capitalise && "capitalize")}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main className="bg-band-sunk">
        {/* 2 — SUMMARY AND ROUTE */}
        <section
          aria-labelledby="about-heading"
          className="shell py-16 lg:py-20"
        >
          <h2 id="about-heading" className="sr-only">
            About {trek.name}
          </h2>
          <div className="grid gap-10 lg:grid-cols-[55fr_40fr] lg:gap-16">
            <Reveal>
              <p className="max-w-[62ch] font-display text-2xl tracking-tight text-balance lg:text-3xl">
                {trek.summary}
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-xl tracking-tight">
                  The route
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {trek.routeOverview}
                </p>
                <dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-muted-foreground">
                      Permits
                    </dt>
                    <dd>{trek.permitsRequired.join("; ")}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-muted-foreground">
                      Difficulty
                    </dt>
                    <dd>
                      <span className="capitalize">{trek.difficulty}</span>.{" "}
                      {DIFFICULTY_NOTE[trek.difficulty]}
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 3 — SUITS YOU / DOES NOT.
               Two columns of equal width, equal weight and equal type size.
               The second column is not a caveat under the first; it is the
               other half of the same answer, and laying it out as a footnote
               would say otherwise before a word was read. */}
        <section
          aria-labelledby="fit-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Whether it fits"
              id="fit-heading"
              title="Who this is for, and who it is not."
            >
              <p>
                Both lists are ours and both are complete. We would rather lose
                a booking here than have somebody find out on day four.
              </p>
            </SectionHead>

            <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
              {(
                [
                  ["Take this trek if", trek.suitsYouIf, "yes"],
                  ["Do not take it if", trek.notForYouIf, "no"],
                ] as const
              ).map(([heading, items, kind]) => (
                <Reveal key={kind}>
                  <div
                    className={cn(
                      "h-full rounded-lg border p-6 lg:p-8",
                      kind === "yes"
                        ? "border-verified/30 bg-verified/5"
                        : "border-prayer/30 bg-prayer/5",
                    )}
                  >
                    <h3 className="font-display text-2xl tracking-tight">
                      {heading}
                    </h3>
                    <ul className="mt-6 grid gap-4">
                      {items.map((item) => (
                        <li key={item} className="flex gap-3 text-base">
                          {kind === "yes" ? (
                            <Check
                              aria-hidden
                              className="mt-1 size-4 shrink-0 text-verified"
                            />
                          ) : (
                            <X
                              aria-hidden
                              className="mt-1 size-4 shrink-0 text-prayer-deep"
                            />
                          )}
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 4 — MONTH BY MONTH */}
        <section
          aria-labelledby="season-heading"
          className="border-t border-border py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Month by month"
              id="season-heading"
              title="When to walk it, and when not to."
            >
              <p>
                Rated for this route rather than for Nepal in general — the same
                month is a different proposition at{" "}
                {trek.maxAltitudeM.toLocaleString("en-GB")} m than it is in the
                hills. Twelve months, including the ones we tell people to skip.
              </p>
            </SectionHead>

            <SeasonalityTable months={trek.seasonality} trekName={trek.name} />
          </div>
        </section>

        {/* 5 — COMPARED WITH */}
        <section
          aria-labelledby="compare-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Compared with"
              id="compare-heading"
              title="The walks people weigh against this one."
            >
              <p>
                Each of these gives a real reason to book the other trek. A
                comparison that concludes in our favour twice is an
                advertisement with a table in it.
              </p>
            </SectionHead>

            <StaggerGroup className="mt-12 grid gap-6">
              {trek.comparedTo.map((c) => {
                const other = TREK_PAGES.find((t) => t.id === c.otherTrekId);
                if (!other) return null;
                return (
                  <Reveal key={c.otherTrekId}>
                    <article className="rounded-lg border border-border bg-card p-6 lg:p-8">
                      <h3 className="font-display text-xl tracking-tight lg:text-2xl">
                        {trek.name} or{" "}
                        <Link
                          href={`/treks/${other.slug}`}
                          className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                        >
                          {other.name}
                        </Link>
                        ?
                      </h3>

                      <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-10">
                        <div>
                          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                            Choose {trek.name}
                          </p>
                          <p className="mt-2 text-base">{c.chooseThisIf}</p>
                        </div>
                        <div className="md:border-l md:border-border md:pl-10">
                          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                            Choose {other.name}
                          </p>
                          <p className="mt-2 text-base">{c.chooseOtherIf}</p>
                          <p className="mt-4 text-sm">
                            <Link
                              href={`/treks/${other.slug}`}
                              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                              {other.typicalDays[0]}
                              {other.typicalDays[0] !== other.typicalDays[1]
                                ? `–${other.typicalDays[1]}`
                                : ""}{" "}
                              days, {other.maxAltitudeM.toLocaleString("en-GB")}{" "}
                              m
                              <ArrowRight aria-hidden className="size-3.5" />
                            </Link>
                          </p>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </StaggerGroup>
          </div>
        </section>

        {/* 6 — THE DATES */}
        <section
          aria-labelledby="dates-heading"
          className="border-t border-border py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Dates"
              id="dates-heading"
              title={
                open.length
                  ? `${open.length} ${open.length === 1 ? "date" : "dates"} you can still take.`
                  : "No dates are open on this route."
              }
            >
              <p>
                {open.length
                  ? "Each one carries its own itinerary, altitude profile and itemised cost sheet. The minimum to run and the date it is decided are on every one."
                  : "Every date on this route has either run or been withdrawn. Tell us when you want to walk and we will say whether we can put a date on it."}
              </p>
            </SectionHead>

            {open.length ? (
              <StaggerGroup as="ul" className="mt-12 grid gap-3">
                {open.map((d) => {
                  const status = departureStatus(d);
                  const left = seatsRemaining(d);
                  return (
                    <Reveal as="li" key={d.id}>
                      <Link
                        href={`/departures/${d.slug}`}
                        className="group grid gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-display tabular text-lg tracking-tight">
                            {formatDateRange(d.departsOn, d.returnsOn)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {d.days} days · {left}{" "}
                            {left === 1 ? "seat" : "seats"} left of{" "}
                            {d.seatsTotal} ·{" "}
                            {status === "guaranteed"
                              ? "guaranteed to run"
                              : `${d.minimumToRun} needed to run, decided ${formatDate(d.decisionDate)}`}
                          </p>
                        </div>
                        <p className="flex items-center gap-2 tabular text-lg sm:justify-end">
                          ${d.priceUSD.toLocaleString("en-GB")}
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
            ) : null}
          </div>
        </section>

        {/* 7 — THE DATES THAT DID NOT RUN.
               Absent entirely when there are none, rather than rendered as an
               empty box saying "no cancellations" — which reads as a boast and
               would be one. */}
        {cancelled.length ? (
          <section
            aria-labelledby="cancelled-heading"
            className="border-t border-border bg-band py-16 lg:py-20"
          >
            <div className="shell">
              <SectionHead
                eyebrow="Not run"
                id="cancelled-heading"
                title={`${cancelled.length} ${cancelled.length === 1 ? "date" : "dates"} on this route did not reach the minimum.`}
              >
                <p>
                  Published because the minimum is only worth reading if the
                  times it was not met are on the same page. Everyone booked on
                  these dates was refunded in full, and the refund is not
                  conditional on rebooking with us.
                </p>
              </SectionHead>

              <ul className="mt-10 grid gap-3">
                {cancelled.map((c) => (
                  <Reveal as="li" key={c.departure.id}>
                    <div className="grid gap-2 rounded-lg border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-baseline">
                      <div>
                        <p className="font-display tabular text-lg tracking-tight">
                          {formatDateRange(
                            c.departure.departsOn,
                            c.departure.returnsOn,
                          )}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {c.booked} booked against a minimum of {c.minimum}.
                          Decided {c.decidedOn}. Refunded in full.
                        </p>
                      </div>
                      <p className="text-xs tracking-[0.08em] text-prayer-deep uppercase">
                        Did not run
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* 8 — WHAT IT COSTS. A range and what sets it, not a cost sheet —
               the sheet belongs to a date, because that is what the numbers
               belong to. */}
        {range ? (
          <section
            aria-labelledby="cost-heading"
            className="border-t border-border py-16 lg:py-20"
          >
            <div className="shell">
              <SectionHead
                eyebrow="What it costs"
                id="cost-heading"
                title={
                  range.from === range.to
                    ? `$${range.from.toLocaleString("en-GB")} per person, all in.`
                    : `$${range.from.toLocaleString("en-GB")} to $${range.to.toLocaleString("en-GB")} per person, all in.`
                }
              >
                <p>
                  {range.bookable
                    ? range.count === 1
                      ? "On the one date open now."
                      : `Across the ${range.count} dates open now.`
                    : range.count === 1
                      ? "On the one date we have run. Nothing is on sale at that price today."
                      : `Across the ${range.count} dates we have run. Nothing is on sale at that price today.`}{" "}
                  {range.singleSupplement > 0
                    ? `A single room adds $${range.singleSupplement.toLocaleString("en-GB")} where one exists.`
                    : "There is no single supplement."}{" "}
                  The full itemised breakdown, including what we keep, lives on
                  each date.
                </p>
              </SectionHead>
            </div>
          </section>
        ) : null}

        {/* 9 — FAQ */}
        <section
          aria-labelledby="faq-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Questions"
              id="faq-heading"
              title={`${trek.name}, answered.`}
            >
              <p>
                Every number below is read from the departures themselves, so
                these answers change when the dates do rather than six months
                afterwards.
              </p>
            </SectionHead>

            <div className="mt-10">
              <FaqAccordion faqs={faqs} />
            </div>
          </div>
        </section>

        {/* 10 — CLOSE */}
        <section className="border-t border-border py-16 lg:py-24">
          <div className="shell">
            <Reveal>
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <h2 className="max-w-[20ch] font-display text-3xl tracking-tight text-balance lg:text-4xl">
                    {open.length
                      ? "Read the cost sheet before you decide."
                      : "Tell us when you want to walk."}
                  </h2>
                  <p className="mt-4 max-w-[56ch] text-muted-foreground">
                    {open.length
                      ? "Every date on this trek publishes what it costs line by line, what we keep, and what it does not include. Nothing about it is behind an enquiry form."
                      : "There is nothing open on this route at the moment. We will tell you honestly whether we can run it in the window you have."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {open.length ? (
                    <Button asChild size="lg">
                      <Link href={`/departures?trek=${trek.id}`}>
                        See the {open.length}{" "}
                        {open.length === 1 ? "date" : "dates"}
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild size="lg" variant="outline">
                    <Link href="/treks">All treks</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
