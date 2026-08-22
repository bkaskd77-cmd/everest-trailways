import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { SectionHead } from "@/components/departure/section-head";
import {
  departureStatus,
  formatDate,
  seatsRemaining,
  seatsToGuarantee,
  type Departure,
} from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * If this date does not work, where does the reader go?
 *
 * Nowhere, until now — which made this the largest leak on the page. Somebody
 * who has read the itinerary, the cost sheet and the contingencies has done all
 * the work of deciding they want the trek, and if the one date in front of them
 * is full or badly timed they leave, having been given no reason to believe
 * there is another.
 *
 * Other dates on the same trek come first and are labelled as the same trek.
 * When there are none, the nearest alternatives by region and length are shown
 * instead and are labelled as alternatives — never quietly presented as though
 * they were the same walk, which is the substitution this company exists to
 * argue against.
 */

function Row({
  departure,
  current,
}: {
  departure: Departure;
  current: boolean;
}) {
  const status = departureStatus(departure);
  const left = seatsRemaining(departure);
  const inactive = status === "full" || status === "closed";

  return (
    <li
      className={cn(
        "border-t border-border",
        current && "bg-muted/40",
        inactive && "opacity-70",
      )}
    >
      <Link
        href={`/departures/${departure.slug}`}
        className="group grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[12rem_1fr_auto] sm:items-baseline"
        aria-current={current ? "page" : undefined}
      >
        <span className="tabular text-base font-medium">
          {formatDate(departure.departsOn)}
        </span>

        <span className="min-w-0 text-sm text-muted-foreground">
          {current ? (
            <span className="text-foreground">The date you are reading</span>
          ) : status === "guaranteed" || status === "filling" ? (
            <span className="inline-flex items-center gap-1.5 text-verified">
              <BadgeCheck aria-hidden className="size-4 shrink-0" />
              Guaranteed to run · {left} of {departure.seatsTotal} seats left
            </span>
          ) : status === "needs-n" ? (
            <>
              Needs {seatsToGuarantee(departure)} more by{" "}
              {formatDate(departure.decisionDate)}
            </>
          ) : status === "full" ? (
            "Fully booked"
          ) : (
            "Closed"
          )}
        </span>

        <span className="flex items-center gap-2 tabular text-base whitespace-nowrap">
          ${departure.priceUSD.toLocaleString("en-GB")}
          {!current && (
            <ArrowRight
              aria-hidden
              className="size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-[3px]"
            />
          )}
        </span>
      </Link>
    </li>
  );
}

export function OtherDates({
  departure,
  sameTrek,
  alternatives,
}: {
  departure: Departure;
  /** Every other date on this exact trek, including this one, by date. */
  sameTrek: Departure[];
  /** Nearest by region and length. Only used when there are no other dates. */
  alternatives: Departure[];
}) {
  const hasOthers = sameTrek.length > 1;
  const list = hasOthers ? sameTrek : alternatives;
  if (!list.length) return null;

  return (
    <section
      id="other-dates"
      aria-labelledby="other-dates-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="shell py-16 lg:py-20">
        <SectionHead
          eyebrow={hasOthers ? "Other dates" : "Alternatives"}
          title={
            hasOthers
              ? `Other dates for ${departure.trekName}.`
              : "Nothing else on this trek this season."
          }
          id="other-dates-heading"
        >
          {hasOthers ? (
            <>
              The same route, the same itinerary and the same cost sheet, on a
              different date. Prices differ where the season does.
            </>
          ) : (
            <>
              These are <em>different treks</em>, not other dates for this one —
              the nearest we run by region and length. Each has its own
              itinerary, altitude and cost sheet, and none of them is a
              substitute for the walk on this page.
            </>
          )}
        </SectionHead>

        <ul className="mt-10 max-w-4xl border-b border-border lg:mt-12">
          {list.map((other) => (
            <Row
              key={other.id}
              departure={other}
              current={hasOthers && other.id === departure.id}
            />
          ))}
        </ul>

        <Link
          href="/departures"
          className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-prayer-deep dark:text-prayer-light"
        >
          All departures
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px]"
          />
        </Link>
      </div>
    </section>
  );
}
