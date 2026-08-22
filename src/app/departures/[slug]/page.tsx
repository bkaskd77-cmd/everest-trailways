import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, Users } from "lucide-react";

import { AltitudeProfile } from "@/components/departure/altitude-profile";
import { GlanceBar } from "@/components/departure/glance-bar";
import { ItineraryList } from "@/components/departure/itinerary-list";
import { AskPanel } from "@/components/departures/ask-panel";
import { Reveal } from "@/components/motion";
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
  const accDays = departure.acclimatisationDays;

  return (
    <>
      <JsonLd
        data={[
          departureJsonLd(departure, siteConfig.url),
          breadcrumbJsonLd(departure, siteConfig.url),
        ]}
      />

      {/* 1 — HEADER. Shadow-based legibility, exactly as the hero does it: no
             panel, no scrim rectangle, the type carries its own contrast. */}
      <header className="relative isolate min-h-[62svh] overflow-hidden bg-summit text-glacier">
        <Image
          src={departure.image.src}
          alt={departure.image.alt}
          fill
          sizes="100vw"
          quality={72}
          loading="eager"
          fetchPriority="high"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(100deg, rgb(11 31 42 / 0.62) 0%, rgb(11 31 42 / 0.44) 42%, rgb(11 31 42 / 0.18) 72%, rgb(11 31 42 / 0) 100%)",
          }}
        />

        <div className="relative shell flex min-h-[62svh] flex-col justify-end pt-28 pb-14">
          <nav aria-label="Breadcrumb">
            <ol
              className="flex flex-wrap items-center gap-2 text-xs tracking-[0.14em] uppercase"
              style={{ textShadow: textShadowCss("small") }}
            >
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/departures" className="hover:underline">
                  Departures
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-glacier/70">{departure.trekName}</li>
            </ol>
          </nav>

          <p
            className="mt-8 text-xs tracking-[0.24em] uppercase"
            style={{ textShadow: textShadowCss("small") }}
          >
            {departure.region}
          </p>
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
        </div>
      </header>

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

        {/* 4 — ALTITUDE PROFILE */}
        <section
          aria-labelledby="altitude-heading"
          className="border-t border-border bg-band"
        >
          <div className="shell py-16 lg:py-20">
            <Reveal>
              <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
                Altitude profile
              </p>
              <h2
                id="altitude-heading"
                className="mt-4 max-w-[24ch] font-display text-3xl tracking-tight text-balance lg:text-4xl"
              >
                Where you sleep, night by night.
              </h2>
              <p className="mt-4 max-w-[62ch] text-base text-muted-foreground">
                Altitude illness follows the altitude you sleep at, not the
                highest point you touch during the day. This plots the sleeping
                altitude of every night on the trek.
              </p>
            </Reveal>

            <div className="mt-10">
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

        {/* 7 — COST SHEET PLACEHOLDER */}
        <section
          id="cost-sheet"
          aria-labelledby="cost-heading"
          className="scroll-mt-24 border-t border-border"
        >
          <div className="shell py-16 lg:py-20">
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              Cost sheet
            </p>
            <h2
              id="cost-heading"
              className="mt-4 font-display text-3xl tracking-tight lg:text-4xl"
            >
              ${departure.priceUSD.toLocaleString("en-GB")} all-in, per person.
            </h2>

            <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="text-sm font-medium">Included</h3>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {departure.priceIncludes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 tabular text-sm font-medium">
                  {departure.singleSupplementUSD === 0
                    ? "No single supplement"
                    : `Single supplement $${departure.singleSupplementUSD.toLocaleString("en-GB")}`}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Not included</h3>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {departure.priceExcludes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-6">
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Arriving here
              </p>
              <p className="mt-3 max-w-[62ch] text-base">
                The full itemised cost sheet — every permit, flight, wage and
                fee listed line by line with its own figure — publishes on this
                page. The summary above is what is settled today; the breakdown
                behind each line is not something we are willing to approximate.
              </p>
              <div className="mt-5">
                <AskPanel departure={departure} />
              </div>
            </div>
          </div>
        </section>

        {/* 8 — CLOSING */}
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
