import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, Users } from "lucide-react";

import { AltitudeProfile } from "@/components/departure/altitude-profile";
import { GlanceBar } from "@/components/departure/glance-bar";
import { ItineraryList } from "@/components/departure/itinerary-list";
import { AskPanel } from "@/components/departures/ask-panel";
import { Button } from "@/components/ui/button";
import {
  bySlug,
  departureStatus,
  departures,
  formatDate,
  formatDateRange,
  formatGroup,
  highestSleep,
  seatsRemaining,
  seatsToGuarantee,
} from "@/content/departures";
import { breadcrumbJsonLd, departureJsonLd } from "@/lib/departures-feed";
import { textShadowCss } from "@/lib/hero-scrim";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/json-ld";
import { CostSheetSection } from "@/components/departure/cost-sheet-section";
import { RouteMap } from "@/components/departure/route-map";
import { SectionHead } from "@/components/departure/section-head";
import { faqJsonLd } from "@/lib/departures-feed";

/*
 * What is actually deferred here, and what is not.
 *
 * The obvious move — wrap every below-fold section in `next/dynamic` — was
 * measured and does nothing. Two of these are server components and server
 * components ship no client JavaScript at all, so importing them dynamically
 * defers zero bytes. The two client ones render in the initial tree, so Next
 * preloads their chunks anyway; the page loaded the same 280KB before a single
 * scroll either way.
 *
 * So the wrappers are gone from the server components, where they were pure
 * indirection with a comment claiming a benefit they did not deliver. What is
 * genuinely deferred is inside the gallery: the lightbox, its focus trap and
 * its keyboard handling load on the first click and not before, because until
 * somebody opens an image none of that code can run.
 *
 * The prose is prerendered into the HTML in every case, which is the property
 * that actually matters for this page — a crawler and an assistant read the
 * FAQ and the cost sheet whether or not any JavaScript arrives.
 */
import { FaqAccordion } from "@/components/departure/faq-section";
import { OtherDates } from "@/components/departure/other-dates";
import { PracticalitiesSection } from "@/components/departure/practicalities";
import {
  DepartureHeroSlider,
  HeroBreadcrumb,
} from "@/components/departure/hero-slider";

/**
 * One departure, in full.
 *
 * Statically generated for every departure at build time — the page is a
 * rendering of a file in the repository, so there is nothing to fetch and no
 * moment where the page exists but the numbers do not.
 *
 * The order of the page is the order of the decision: what it is, what it
 * costs, whether it will run, how high it sleeps, what each day holds, what it
 * asks of you, and only then the ask. The altitude profile sits above the
 * itinerary rather than below it because the shape of the trek is the thing
 * someone weighs before they read twelve days of detail.
 */

const HEADER_SENTINEL = "departure-header-end";

export function generateStaticParams() {
  return departures.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const departure = bySlug(slug);
  if (!departure) return { title: "Departure not found" };

  const title = `${departure.trekName}, ${formatDate(departure.departsOn)}`;
  return {
    title,
    description: departure.summary,
    alternates: { canonical: `/departures/${departure.slug}` },
    openGraph: {
      title: `${title} — ${siteConfig.name}`,
      description: departure.summary,
      url: `${siteConfig.url}/departures/${departure.slug}`,
      images: [departure.image.src],
    },
  };
}

const STATUS_LABEL = {
  guaranteed: "Guaranteed to run",
  filling: "Filling",
  "needs-n": "Not yet guaranteed",
  full: "Fully booked",
  closed: "Closed",
} as const;

export default async function DeparturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const departure = bySlug(slug);
  if (!departure) notFound();

  const status = departureStatus(departure);
  const left = seatsRemaining(departure);
  const needed = seatsToGuarantee(departure);
  const bookable = status !== "full" && status !== "closed";
  const highest = highestSleep(departure);
  /*
   * Other dates on this trek, and what to offer when there are none.
   *
   * The fallback is the nearest by region and length rather than by price,
   * because somebody reading a nine-day Annapurna page wants a nine-day walk in
   * the same part of the country — not whatever costs about the same. They are
   * labelled as different treks, which is the whole point of showing them.
   */
  const sameTrek = departures
    .filter((other) => other.trekId === departure.trekId)
    .sort((a, b) => a.departsOn.localeCompare(b.departsOn));

  const alternatives =
    sameTrek.length > 1
      ? []
      : departures
          .filter((other) => other.trekId !== departure.trekId)
          .map((other) => ({
            other,
            distance:
              (other.region === departure.region ? 0 : 40) +
              Math.abs(other.days - departure.days) * 6,
          }))
          .sort(
            (a, b) =>
              a.distance - b.distance ||
              a.other.departsOn.localeCompare(b.other.departsOn),
          )
          .slice(0, 4)
          .map((entry) => entry.other);

  const accDays = departure.acclimatisationDays;

  return (
    <>
      <JsonLd
        data={[
          departureJsonLd(departure, siteConfig.url),
          breadcrumbJsonLd(departure, siteConfig.url),
          faqJsonLd(departure, siteConfig.url),
        ]}
      />

      {/* 1 — HEADER, and the gallery.
             The page used to open on one decided photograph and keep the
             gallery in a band below the fold. Both were weaker for it. Most
             operators lead with a summit; this leads with the room and the
             plate, which is what somebody is actually buying. */}
      <DepartureHeroSlider
        images={departure.gallery}
        region={departure.region}
        trekName={departure.trekName}
      >
        <HeroBreadcrumb trekName={departure.trekName} />

        <h1
          className="mt-3 max-w-[18ch] font-display text-5xl tracking-tight text-balance lg:text-6xl"
          style={{ textShadow: textShadowCss("display") }}
        >
          {departure.trekName}
        </h1>

        <div
          className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          style={{ textShadow: textShadowCss("small") }}
        >
          <p className="tabular">
            {formatDateRange(departure.departsOn, departure.returnsOn)}
          </p>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase",
              status === "guaranteed" && "bg-verified text-snow",
              status === "filling" && "bg-prayer text-snow",
              status === "needs-n" && "bg-glacier text-summit",
              !bookable && "bg-stone-deep text-glacier",
            )}
            style={{ textShadow: "none" }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        <dl
          className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm"
          style={{ textShadow: textShadowCss("small") }}
        >
          {[
            ["Days", `${departure.days}`],
            [
              "Max altitude",
              `${departure.maxAltitudeM.toLocaleString("en-GB")} m`,
            ],
            ["Difficulty", departure.difficulty],
            ["Guide ratio", departure.guideRatio],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs tracking-[0.14em] text-glacier/70 uppercase">
                {label}
              </dt>
              <dd className="mt-1 tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </DepartureHeroSlider>

      {/* The sentinel the sticky bar watches. Zero height, so it cannot shift
          anything. */}
      <div id={HEADER_SENTINEL} aria-hidden className="h-0" />

      {/* 2 — AT-A-GLANCE BAR */}
      <GlanceBar departure={departure} sentinelId={HEADER_SENTINEL} />

      <main className="bg-band-sunk">
        {/* 3 — SUMMARY AND THE GUARANTEE */}
        <section
          aria-labelledby="summary-heading"
          className="shell py-16 lg:py-20"
        >
          <h2 id="summary-heading" className="sr-only">
            About this departure
          </h2>
          <div className="grid gap-10 lg:grid-cols-[55fr_40fr] lg:gap-16">
            <p className="max-w-[62ch] font-display text-2xl tracking-tight text-balance lg:text-3xl">
              {departure.summary}
            </p>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-xl tracking-tight">
                <BadgeCheck aria-hidden className="size-5 text-verified" />
                The guarantee
              </h3>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Runs at</dt>
                  <dd className="tabular font-medium">
                    {departure.minimumToRun} bookings
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Booked now</dt>
                  <dd className="tabular font-medium">
                    {departure.seatsBooked} of {departure.seatsTotal}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Decided by</dt>
                  <dd className="tabular font-medium">
                    {formatDate(departure.decisionDate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Group cap</dt>
                  <dd className="tabular font-medium">
                    {departure.groupSizeMax} people
                  </dd>
                </div>
              </dl>

              <p className="mt-5 border-t border-border pt-4 text-sm">
                {status === "needs-n" ? (
                  <>
                    This departure needs {needed} more{" "}
                    {needed === 1 ? "booking" : "bookings"} to be guaranteed. We
                    decide on {formatDate(departure.decisionDate)} and tell you
                    that day either way. If it does not reach{" "}
                    {departure.minimumToRun}, you are refunded in full — not
                    credited, not transferred to another date without your
                    say-so.
                  </>
                ) : status === "full" ? (
                  <>
                    Every seat is taken. Had this departure not reached{" "}
                    {departure.minimumToRun} bookings by{" "}
                    {formatDate(departure.decisionDate)}, everyone booked would
                    have been refunded in full.
                  </>
                ) : status === "closed" ? (
                  <>
                    This departure did not reach {departure.minimumToRun}{" "}
                    bookings by {formatDate(departure.decisionDate)}. Everyone
                    booked was refunded in full.
                  </>
                ) : (
                  <>
                    This departure passed its minimum of{" "}
                    {departure.minimumToRun} bookings
                    {departure.guaranteedAt
                      ? ` on ${formatDate(departure.guaranteedAt)}`
                      : ""}
                    , so it runs regardless of what happens next. Had it not, we
                    would have told you on {formatDate(departure.decisionDate)}{" "}
                    and refunded you in full.
                  </>
                )}
              </p>

              {departure.groupSoFar.length > 0 && (
                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Users aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Joining so far: {formatGroup(departure.groupSoFar)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 4 — ROUTE AND ALTITUDE, read together */}
        <section
          aria-labelledby="altitude-heading"
          className="border-t border-border bg-band"
        >
          <div className="shell py-16 lg:py-20">
            <SectionHead
              eyebrow="Route and altitude"
              title="Where you go, and where you sleep."
              id="altitude-heading"
            >
              Altitude illness follows the altitude you sleep at, not the
              highest point you touch during the day. The diagram shows the
              shape of the route; the chart below it plots the sleeping altitude
              of every night on the trek.
            </SectionHead>

            <div className="mt-10">
              <RouteMap
                itinerary={departure.itinerary}
                trekName={departure.trekName}
              />
            </div>

            <div className="mt-14">
              <AltitudeProfile
                itinerary={departure.itinerary}
                trekName={departure.trekName}
                acclimatisationDays={accDays}
              />
            </div>

            <p className="mt-8 max-w-[62ch] text-base">
              {accDays.length > 0 ? (
                <>
                  This itinerary schedules{" "}
                  <strong className="font-medium">
                    {accDays.length} acclimatisation{" "}
                    {accDays.length === 1 ? "day" : "days"}
                  </strong>{" "}
                  — {accDays.map((d) => `day ${d}`).join(" and ")} — on which
                  the group walks higher and returns to the same bed. The
                  highest night is{" "}
                  {highest.sleepAltitudeM.toLocaleString("en-GB")} m at{" "}
                  {highest.toPlace}.
                </>
              ) : (
                <>
                  This itinerary schedules{" "}
                  <strong className="font-medium">
                    no separate acclimatisation days
                  </strong>
                  . The highest night is{" "}
                  {highest.sleepAltitudeM.toLocaleString("en-GB")} m at{" "}
                  {highest.toPlace}, and the profile above shows what the
                  overnight gains are.
                </>
              )}{" "}
              Whether altitude is safe for you is a question for your doctor,
              and we would want a licensed guide&rsquo;s assessment too.
            </p>
          </div>
        </section>

        {/* 5 — DAY BY DAY */}
        <section
          aria-labelledby="itinerary-heading"
          className="border-t border-border"
        >
          <div className="shell py-16 lg:py-20">
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              Day by day
            </p>
            <h2
              id="itinerary-heading"
              className="mt-4 font-display text-3xl tracking-tight lg:text-4xl"
            >
              The whole itinerary.
            </h2>
            <div className="mt-8">
              <ItineraryList itinerary={departure.itinerary} />
            </div>
          </div>
        </section>

        {/* 6 — PHYSICAL DEMAND */}
        <section
          aria-labelledby="demand-heading"
          className="border-t border-border bg-band"
        >
          <div className="shell py-16 lg:py-20">
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              Physical demand
            </p>
            <h2
              id="demand-heading"
              className="mt-4 max-w-[26ch] font-display text-3xl tracking-tight text-balance lg:text-4xl"
            >
              What the trek asks for.
            </h2>

            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Walking hours per day",
                  `${departure.physicalDemand.walkingHoursPerDay} h`,
                ],
                [
                  "Consecutive walking days",
                  `${departure.physicalDemand.consecutiveDays}`,
                ],
                ["Maximum group size", `${departure.groupSizeMax}`],
                ["Guide ratio", departure.guideRatio],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-2 font-display tabular text-3xl tracking-tight">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Terrain
                </h3>
                <p className="mt-3 max-w-[58ch] text-base">
                  {departure.physicalDemand.terrain}
                </p>
              </div>
              <div>
                <h3 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Before you arrive
                </h3>
                <p className="mt-3 max-w-[58ch] text-base">
                  {departure.physicalDemand.preparationNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7 — PRACTICAL DETAIL */}
        <PracticalitiesSection practicalities={departure.practicalities} />

        {/* 8 — COST SHEET, and everything that hangs off it */}
        <CostSheetSection departure={departure} />

        {/* 9 — FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="scroll-mt-24 border-t border-border bg-band-sunk"
        >
          <div className="shell py-16 lg:py-20">
            <SectionHead
              eyebrow="Questions"
              title="The awkward ones, answered."
              id="faq-heading"
            >
              What if you cannot keep up, what if you do not get on with the
              group, what happens to your money. These are answered for this
              date specifically, with this date&rsquo;s own numbers, so nothing
              here can drift out of step with the cost sheet above.
            </SectionHead>

            <div className="max-w-4xl">
              <FaqAccordion faqs={departure.faqs} />
            </div>
          </div>
        </section>

        {/* 10 — OTHER DATES */}
        <OtherDates
          departure={departure}
          sameTrek={sameTrek}
          alternatives={alternatives}
        />

        {/* 11 — CLOSING */}
        <section
          aria-labelledby="closing-heading"
          className="border-t border-border bg-band"
        >
          <div className="shell py-16 lg:py-20">
            <h2
              id="closing-heading"
              className="max-w-[22ch] font-display text-3xl tracking-tight text-balance lg:text-4xl"
            >
              {bookable
                ? status === "needs-n"
                  ? `${needed} more ${needed === 1 ? "booking" : "bookings"} and this date runs.`
                  : "This date runs."
                : "This date is closed to new bookings."}
            </h2>
            <p className="mt-4 max-w-[62ch] text-base text-muted-foreground">
              {status === "needs-n"
                ? `Decided on ${formatDate(departure.decisionDate)}, and you are told that day either way. If it does not reach ${departure.minimumToRun}, you are refunded in full.`
                : bookable
                  ? `${left} of ${departure.seatsTotal} seats remain, and the date runs regardless of whether they fill.`
                  : "Ask us and we will tell you the next date on the same route, with the same guarantee."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild>
                <Link href="#cost-sheet">
                  {bookable ? "Reserve a seat" : "Ask about the next date"}
                </Link>
              </Button>
              <Link
                href="/departures"
                className="group inline-flex items-center gap-2 text-sm font-medium text-prayer-deep dark:text-prayer-light"
              >
                <ArrowLeft
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 group-hover:-translate-x-[3px]"
                />
                All departures
              </Link>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <AskPanel departure={departure} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
