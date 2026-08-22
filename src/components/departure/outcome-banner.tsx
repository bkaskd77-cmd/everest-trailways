import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  formatDate,
  lifecycle,
  type Departure,
  type Lifecycle,
} from "@/content/departures";

/**
 * What happened to this date, said at the top of its own page.
 *
 * A departure that did not reach its minimum was left live, indexed, priced and
 * offered in stock — a page describing a purchasable trip that had been
 * cancelled and refunded a month earlier. Deleting it would have been the
 * easier fix and the dishonest one: a cancelled date is the strongest evidence
 * this company has that the published minimum is a real threshold rather than a
 * marketing device. Almost nobody in this market shows you one.
 *
 * So the page stays, and it says what happened before it says anything else.
 * The banner is above the header rather than inside it because somebody
 * arriving from a search result needs to know within one screen, and the header
 * is a photograph.
 */

function copyFor(
  d: Departure,
  state: Lifecycle,
): { label: string; headline: string; body: string } | null {
  switch (state) {
    case "cancelled":
      return {
        label: "This date did not run",
        headline: `${formatDate(d.departsOn)} was cancelled.`,
        body: `It reached ${d.seatsBooked} of the ${d.minimumToRun} bookings it needed by ${formatDate(d.decisionDate)}, so it did not run. Everyone who had booked was refunded in full — the whole amount, not a credit note. The page is still here because a date that did not fill is the only real evidence that the minimum on every other page means something.`,
      };
    case "departed":
      return {
        label: "This date is under way",
        headline: `${formatDate(d.departsOn)} is on the trail.`,
        body: `This group left on ${formatDate(d.departsOn)} and returns on ${formatDate(d.returnsOn)}. Nothing on this page can be booked. The itinerary, the cost sheet and the contingencies are exactly what this group is walking.`,
      };
    case "completed":
      return {
        label: "This date has finished",
        headline: `${formatDate(d.departsOn)} has been and gone.`,
        body: `This group returned on ${formatDate(d.returnsOn)}. The page is kept as published — the itinerary, the prices and the promises are the ones that date actually carried, not a tidied version.`,
      };
    default:
      return null;
  }
}

export function OutcomeBanner({
  departure,
  nextDate,
}: {
  departure: Departure;
  /** The next bookable date on the same trek, if there is one. */
  nextDate?: Departure;
}) {
  const state = lifecycle(departure);
  const copy = copyFor(departure, state);
  if (!copy) return null;

  return (
    <aside
      aria-label="Status of this departure"
      /*
       * Deliberately not a warning colour. Nothing has gone wrong that the
       * reader needs to act on, and dressing a refunded cancellation as an
       * alert would make the guarantee look like a failure rather than like the
       * mechanism working.
       */
      className="border-b border-border bg-band-sunk"
    >
      <div className="shell py-8 lg:py-10">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {copy.label}
        </p>
        <h2 className="mt-3 max-w-[22ch] font-display text-2xl tracking-tight text-balance lg:text-3xl">
          {copy.headline}
        </h2>
        <p className="mt-4 max-w-[68ch] text-base text-muted-foreground">
          {copy.body}
        </p>

        {nextDate && (
          <Link
            href={`/departures/${nextDate.slug}`}
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-prayer-deep dark:text-prayer-light"
          >
            The next {departure.trekName} date is{" "}
            {formatDate(nextDate.departsOn)}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px]"
            />
          </Link>
        )}
      </div>
    </aside>
  );
}
