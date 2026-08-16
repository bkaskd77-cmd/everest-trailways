"use client";

import * as m from "motion/react-m";

import { EASE, METER } from "@/lib/motion";
import type { Departure, DepartureStatus } from "@/content/departures";

/**
 * Two markers on one track: the filled bar is what is booked, the tick is the
 * published threshold at which the departure is guaranteed to run.
 *
 * The tick is the point of the whole component. A plain progress bar says "some
 * people have booked"; this says "four is the number, and here is where we are
 * against it". Everything it shows is also written out in text beside it — a
 * machine cannot read a bar.
 *
 * This is the signature element of the site, so it is the one place worth
 * spending real attention. It arrives in four beats rather than one:
 *
 *   1. the track draws left to right — the scale exists before anything is
 *      measured against it,
 *   2. the fill grows into it,
 *   3. the threshold tick snaps in on a spring, slightly past and back,
 *   4. the line beneath settles.
 *
 * The beats overlap; each starts before the last has finished, which is what
 * keeps 1.06s from reading as four separate events. Timings live in METER in
 * lib/motion.ts, and `pnpm perf` asserts the total against the 1.2s ceiling.
 *
 * The track colours are their own tokens because the old `bg-border` put the
 * filling bar at 2.9:1 against it in light mode and the pending bar at 2.4:1 —
 * both under the 3:1 floor. `pnpm check:departures` re-computes those ratios
 * from the stylesheet rather than trusting this comment.
 */
const BAR: Record<DepartureStatus, string> = {
  guaranteed: "bg-meter-guaranteed",
  filling: "bg-meter-filling",
  "needs-n": "bg-meter-pending",
  // Full and closed both mean "not bookable", so they deliberately share the
  // neutral rather than inventing a fourth hue for a card that is dimmed anyway.
  full: "bg-meter-inactive",
  closed: "bg-meter-inactive",
};

export function SeatMeter({
  departure,
  status,
  meta,
  index = 0,
}: {
  departure: Departure;
  status: DepartureStatus;
  /** The line beneath the track. Owned here so it can be the fourth beat. */
  meta: string;
  /** Position in the grid. Offsets the whole sequence so meters read downward. */
  index?: number;
}) {
  const { seatsTotal, seatsBooked, minimumToRun } = departure;
  const booked = Math.min(1, seatsBooked / seatsTotal);
  const threshold = Math.min(1, minimumToRun / seatsTotal);
  // By column rather than by running index: three cards enter together, and
  // offsetting the fourth by four steps would only delay it for nobody.
  const offset = Math.min(METER.maxCardDelay, (index % 3) * METER.perCard);

  // One trigger for all four beats. Firing them independently is what made the
  // old version read as "some things faded in near each other".
  const viewport = { once: true, amount: 0.6 } as const;

  return (
    <>
      <div aria-hidden className="relative mt-3 h-1.5 w-full">
        {/* 1 — the scale */}
        <m.div
          data-motion
          className="absolute inset-0 origin-left rounded-full bg-meter-track"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewport}
          transition={{
            duration: METER.track.duration,
            ease: EASE,
            delay: METER.track.delay + offset,
          }}
        />

        {/* 2 — what is booked against it */}
        <m.div
          data-motion
          className={`absolute inset-y-0 left-0 origin-left rounded-full transition-[filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:brightness-125 ${BAR[status]}`}
          style={{ width: `${booked * 100}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewport}
          transition={{
            duration: METER.fill.duration,
            ease: EASE,
            delay: METER.fill.delay + offset,
          }}
        />

        {/* 3 — the published threshold, snapping into place */}
        <m.span
          data-motion
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground"
          style={{ left: `${threshold * 100}%` }}
          initial={{ opacity: 0, scaleY: 0.2 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={viewport}
          transition={{
            ...METER.tick.spring,
            delay: METER.tick.delay + offset,
          }}
        />
      </div>

      {/* 4 — the sentence. "decided by" only survives in the needs-n state; see
             guaranteeMeta, which the departures guard asserts against. */}
      <m.p
        data-motion
        className="mt-2 tabular text-xs text-muted-foreground"
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{
          duration: METER.label.duration,
          ease: EASE,
          delay: METER.label.delay + offset,
        }}
      >
        {meta}
      </m.p>
    </>
  );
}
