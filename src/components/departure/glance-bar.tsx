"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import {
  departureStatus,
  isBookable,
  formatDateRange,
  seatsRemaining,
  seatsToGuarantee,
  type Departure,
} from "@/content/departures";
import { SPRING } from "@/lib/motion";

/**
 * The persistent conversion anchor.
 *
 * It appears when the page header has scrolled away and carries the four
 * things someone is actually deciding on — when it goes, what it costs, how
 * many seats are left, and whether it is guaranteed — plus the action.
 *
 * It is `sticky`, not `fixed`, and it sits above the content rather than over
 * it, so on a phone it can never cover the sentence being read. Under 768px it
 * drops the dates and the guarantee line and keeps price, seats and the button,
 * because a two-line bar on a small screen is a bar that eats the page.
 *
 * The IntersectionObserver watches a sentinel in the header rather than reading
 * scrollY, so it costs nothing per frame and cannot fight the scroll.
 */
export function GlanceBar({
  departure,
  sentinelId,
}: {
  departure: Departure;
  sentinelId: string;
}) {
  const [shown, setShown] = React.useState(false);
  const status = departureStatus(departure);
  const left = seatsRemaining(departure);
  const needed = seatsToGuarantee(departure);
  /*
   * The bar exists to keep the decision in view while somebody reads. On a date
   * that cannot be taken there is no decision to keep in view, and a sticky
   * price with a seat count is an advertisement for something that does not
   * exist — so it does not render at all.
   */
  const openForBooking = isBookable(departure);

  React.useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  // Nothing to keep in view on a date nobody can take.
  if (!openForBooking) return null;

  return (
    <div className="sticky top-0 z-40">
      <AnimatePresence initial={false}>
        {shown && (
          <m.div
            data-motion
            key="glance"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={SPRING}
            className="border-b border-border bg-background/95 backdrop-blur"
          >
            <div className="shell flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 items-center gap-5 lg:gap-8">
                <p className="hidden tabular text-sm whitespace-nowrap text-muted-foreground md:block">
                  {formatDateRange(departure.departsOn, departure.returnsOn)}
                </p>
                <p className="font-display tabular text-xl tracking-tight whitespace-nowrap">
                  ${departure.priceUSD.toLocaleString("en-GB")}
                </p>
                <p className="tabular text-sm whitespace-nowrap text-muted-foreground">
                  {status === "full"
                    ? "No seats"
                    : `${left} of ${departure.seatsTotal} left`}
                </p>
                <p className="hidden text-sm whitespace-nowrap md:block">
                  {status === "needs-n" ? (
                    <span className="text-prayer-deep dark:text-prayer-light">
                      {needed} more to run
                    </span>
                  ) : status === "full" || status === "closed" ? (
                    <span className="text-muted-foreground">Closed</span>
                  ) : (
                    <span className="text-verified">Guaranteed</span>
                  )}
                </p>
              </div>

              <Button asChild size="sm">
                <Link href="#ask">
                  {openForBooking
                    ? "Ask about this date"
                    : "Ask about the next date"}
                </Link>
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
