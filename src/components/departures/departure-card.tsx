import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Users } from "lucide-react";

import { AskPanel } from "@/components/departures/ask-panel";
import { SeatMeter } from "@/components/departures/seat-meter";
import { Button } from "@/components/ui/button";
import {
  departureStatus,
  formatDate,
  formatDateRange,
  formatGroup,
  guaranteeMeta,
  seatsRemaining,
  seatsToGuarantee,
  type Departure,
} from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The card is a nine-track grid, not a stack.
 *
 * Comparing six departures means reading across, not down: the eye wants the
 * guarantee blocks on one line, the altitudes on the next, the prices on the
 * next. A flex column cannot do that — a two-line trek name on one card pushed
 * every row beneath it out of step with its neighbours, and the guarantee block
 * changed height between its two- and three-line variants.
 *
 * So the grid owns the row geometry and the card only fills it. `subgrid` makes
 * each track as tall as the tallest card in that row, which is what puts the
 * shared baselines there; the card's own content never decides where a row
 * sits. Cards in a row are therefore the same height and the actions land on
 * one line without a spacer.
 *
 * Every track must be occupied on every card, including the empty ones — grid
 * auto-placement fills in order, so a card that skips its group line would pull
 * its price up into the wrong track.
 */
export const CARD_TRACKS = "row-span-9 grid grid-rows-subgrid gap-y-0";

/** Horizontal rhythm shared by every track below the image. */
const PAD = "px-5";

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
        CARD_TRACKS,
        "group overflow-hidden rounded-lg border border-border bg-card",
        inactive && "opacity-60",
      )}
    >
      {/* 1 — image */}
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

      {/* 2 — name block. Held in one track so a two-line name borrows height
             from its own row instead of shunting everything below it. */}
      <div className={cn(PAD, "pt-5")}>
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {departure.region} · {departure.days} days · {departure.difficulty}
        </p>
        <h3 className="mt-2 font-display text-2xl tracking-tight text-balance">
          {departure.trekName}
        </h3>
        <p className="mt-1 tabular text-sm text-muted-foreground">
          {formatDateRange(departure.departsOn, departure.returnsOn)}
        </p>
      </div>

      {/* 3 — the guarantee block, the reason this section exists. The min-height
             holds it steady between its two- and three-line variants; subgrid
             then levels it across the row. */}
      <div className={cn(PAD, "pt-4")}>
        <div className="min-h-28 rounded-md bg-muted/60 p-3">
          <GuaranteeLine departure={departure} />
          <SeatMeter departure={departure} status={status} />
          {/* "decided by" only survives in the needs-n state — see
              guaranteeMeta, which the departures guard asserts against. */}
          <p className="mt-2 tabular text-xs text-muted-foreground">
            {guaranteeMeta(departure)}
          </p>
        </div>
      </div>

      {/* 4 — spec row */}
      <div className={cn(PAD, "pt-4")}>
        <dl className="grid grid-cols-2 gap-x-4 border-y border-border py-3 tabular text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Max altitude</dt>
            <dd>{departure.maxAltitudeM.toLocaleString("en-GB")} m</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Guide ratio</dt>
            <dd>{departure.guideRatio}</dd>
          </div>
        </dl>
      </div>

      {/* 5 — solo line */}
      <p className={cn(PAD, "pt-3 text-sm font-medium")}>
        {supplement === 0
          ? "No single supplement"
          : `Single supplement $${supplement.toLocaleString("en-GB")}`}
      </p>

      {/* 6 — who has booked. Always rendered, empty or not, so the track below
             it cannot drift up. */}
      <div className={cn(PAD, "pt-1")}>
        {departure.groupSoFar.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Users aria-hidden className="mt-0.5 size-3 shrink-0" />
            <span>Joining so far: {formatGroup(departure.groupSoFar)}</span>
          </p>
        )}
      </div>

      {/* 7 — price */}
      <div className={cn(PAD, "pt-5")}>
        <p className="font-display tabular text-3xl tracking-tight">
          ${departure.priceUSD.toLocaleString("en-GB")}
        </p>
        <p className="text-xs text-muted-foreground">
          all-in, per person · no card surcharge
        </p>
      </div>

      {/* 8 — actions */}
      <div className={cn(PAD, "flex flex-wrap items-center gap-3 pt-4")}>
        {inactive ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/departures/${departure.id}/waitlist`}>
              Join the waitlist
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size="sm">
              <Link href={`/departures/${departure.id}`}>View departure</Link>
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

      {/* 9 — third action, deliberately quieter and on its own line so it never
             competes with "View departure". */}
      <div className={cn(PAD, "pb-5")}>
        <AskPanel departure={departure} />
      </div>
    </article>
  );
}
