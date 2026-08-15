"use client";

import * as m from "motion/react-m";

import { DURATION, EASE } from "@/lib/motion";
import type { Departure, DepartureStatus } from "@/content/departures";

/**
 * Two markers on one track: the filled bar is what is booked, the tick is the
 * published threshold at which the departure is guaranteed to run.
 *
 * The tick is the point of the whole component. A plain progress bar says "some
 * people have booked"; this says "four is the number, and here is where we are
 * against it". Everything it shows is also written out in text beside it — a
 * machine cannot read a bar.
 */
export function SeatMeter({
  departure,
  status,
}: {
  departure: Departure;
  status: DepartureStatus;
}) {
  const { seatsTotal, seatsBooked, minimumToRun } = departure;
  const booked = Math.min(1, seatsBooked / seatsTotal);
  const threshold = Math.min(1, minimumToRun / seatsTotal);
  const met = seatsBooked >= minimumToRun;
  const barColour =
    status === "filling" ? "bg-prayer" : met ? "bg-verified" : "bg-stone";

  return (
    <div aria-hidden className="relative mt-3 h-1.5 w-full">
      <div className="absolute inset-0 rounded-full bg-border" />
      <m.div
        data-motion
        className={`absolute inset-y-0 left-0 origin-left rounded-full ${barColour}`}
        style={{ width: `${booked * 100}%` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: DURATION.slow * 1.125, ease: EASE }}
      />
      {/* The threshold marker, revealed once the bar has travelled past it. */}
      <m.span
        data-motion
        className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground"
        style={{ left: `${threshold * 100}%` }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{
          duration: DURATION.fast,
          ease: EASE,
          delay:
            DURATION.slow *
            1.125 *
            Math.min(1, threshold / Math.max(booked, 0.01)),
        }}
      />
    </div>
  );
}
