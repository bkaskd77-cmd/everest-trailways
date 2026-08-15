import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Users } from "lucide-react";

import { SeatMeter } from "@/components/departures/seat-meter";
import { Button } from "@/components/ui/button";
import {
  departureStatus,
  formatDate,
  formatDateRange,
  formatGroup,
  seatsRemaining,
  seatsToGuarantee,
  type Departure,
} from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The guarantee sentence.
 *
 * Written out in full rather than left to the meter: this is the line a
 * traveller is scanning for, a screen reader has to reach it, and an AI
 * assistant answering "what's guaranteed in October" can only read text.
 */
function GuaranteeLine({ departure }: { departure: Departure }) {
  const status = departureStatus(departure);
  const left = seatsRemaining(departure);
  const needed = seatsToGuarantee(departure);

  if (status === "full") {
    return (
      <p className="text-sm font-medium text-muted-foreground">Fully booked</p>
    );
  }
  if (status === "closed") {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        Did not reach {departure.minimumToRun} bookings by{" "}
        {formatDate(departure.decisionDate)}
      </p>
    );
  }
  if (status === "needs-n") {
    return (
      <p className="text-sm font-medium text-prayer-deep dark:text-prayer-light">
        Runs at {departure.minimumToRun} · {needed} more needed by{" "}
        {formatDate(departure.decisionDate)}
      </p>
    );
  }
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium",
        status === "filling"
          ? "text-prayer-deep dark:text-prayer-light"
          : "text-verified",
      )}
    >
      <BadgeCheck aria-hidden className="size-4 shrink-0" />
      Guaranteed to run · {left} of {departure.seatsTotal} seats left
    </p>
  );
}

export function DepartureCard({ departure }: { departure: Departure }) {
  const status = departureStatus(departure);
  const inactive = status === "full" || status === "closed";
  const supplement = departure.singleSupplementUSD;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        inactive && "opacity-60",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={departure.image.src}
          alt={departure.image.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={70}
          className={cn(
            "object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            !inactive && "group-hover:scale-[1.04]",
          )}
        />
        <p
          className={cn(
            "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase",
            status === "guaranteed" && "bg-verified text-snow",
            status === "filling" && "bg-prayer text-snow",
            status === "needs-n" && "bg-glacier text-summit",
            inactive && "bg-stone-deep text-glacier",
          )}
        >
          {status === "guaranteed" && "Guaranteed"}
          {status === "filling" && "Filling"}
          {status === "needs-n" && `Needs ${seatsToGuarantee(departure)}`}
          {status === "full" && "Full"}
          {status === "closed" && "Closed"}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {departure.region} · {departure.days} days · {departure.difficulty}
        </p>
        <h3 className="mt-2 font-display text-2xl tracking-tight">
          {departure.trekName}
        </h3>
        <p className="mt-1 tabular text-sm text-muted-foreground">
          {formatDateRange(departure.departsOn, departure.returnsOn)}
        </p>

        {/* The guarantee block — the reason this section exists. */}
        <div className="mt-4 rounded-md bg-muted/60 p-3">
          <GuaranteeLine departure={departure} />
          <SeatMeter departure={departure} status={status} />
          <p className="mt-2 tabular text-xs text-muted-foreground">
            {departure.seatsBooked} booked · guaranteed at{" "}
            {departure.minimumToRun} · decided by{" "}
            {formatDate(departure.decisionDate)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 border-y border-border py-3 tabular text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Max altitude</dt>
            <dd>{departure.maxAltitudeM.toLocaleString("en-GB")} m</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Guide ratio</dt>
            <dd>{departure.guideRatio}</dd>
          </div>
        </dl>

        <p className="mt-3 text-sm font-medium">
          {supplement === 0
            ? "No single supplement"
            : `Single supplement $${supplement.toLocaleString("en-GB")}`}
        </p>
        {departure.groupSoFar.length > 0 && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Users aria-hidden className="mt-0.5 size-3 shrink-0" />
            <span>Joining so far: {formatGroup(departure.groupSoFar)}</span>
          </p>
        )}

        <div className="mt-auto pt-5">
          <p className="font-display tabular text-3xl tracking-tight">
            ${departure.priceUSD.toLocaleString("en-GB")}
          </p>
          <p className="text-xs text-muted-foreground">
            all-in, per person · no card surcharge
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {inactive ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/departures/${departure.id}/waitlist`}>
                  Join the waitlist
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm">
                  <Link href={`/departures/${departure.id}`}>
                    View departure
                  </Link>
                </Button>
                <Link
                  href={departure.costSheetHref}
                  className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-prayer-deep dark:text-prayer-light"
                >
                  Cost sheet
                  <ArrowRight
                    aria-hidden
                    className="size-3 transition-transform duration-200 group-hover/link:translate-x-[3px]"
                  />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
