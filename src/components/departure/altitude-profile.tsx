"use client";

import * as React from "react";
import * as m from "motion/react-m";

import { DURATION, EASE } from "@/lib/motion";
import type { ItineraryDay } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The sleeping-altitude profile.
 *
 * The safety centrepiece of the page, and the reason it plots `sleepAltitudeM`
 * rather than each day's high point: altitude illness is a function of where
 * the night is spent. An operator that charts its peaks is charting the
 * flattering number.
 *
 * Hand-built SVG, no charting library — the whole component is under 8KB and a
 * library would be twenty times that to draw eleven line segments. It is also
 * the only way to keep the marks meaningful: acclimatisation nights are a
 * different mark, not a different colour in a legend nobody reads.
 *
 * The chart is decoration for a machine. Every number in it also exists as
 * literal text in the itinerary below, and the table underneath this SVG is
 * readable by a screen reader — an SVG polyline is not data anyone can quote.
 */

const H = 220;
const PAD_T = 28;
const PAD_B = 44;
const PAD_L = 52;
const PAD_R = 16;
/** Horizontal room per day. Below this the labels collide, so it scrolls. */
const DAY_W = 62;

function niceCeiling(value: number): number {
  const step = value > 4000 ? 1000 : value > 1500 ? 500 : 200;
  return Math.ceil(value / step) * step;
}

function ticks(max: number): number[] {
  const step = max > 4000 ? 1000 : max > 1500 ? 500 : 200;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}

export function AltitudeProfile({
  itinerary,
  trekName,
  acclimatisationDays,
}: {
  itinerary: ItineraryDay[];
  trekName: string;
  acclimatisationDays: number[];
}) {
  const [active, setActive] = React.useState<number | null>(null);

  const width = PAD_L + PAD_R + DAY_W * (itinerary.length - 1);
  const top = niceCeiling(
    Math.max(...itinerary.map((d) => d.maxAltitudeM ?? d.sleepAltitudeM)),
  );
  const plotH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + i * DAY_W;
  const y = (alt: number) => PAD_T + plotH - (alt / top) * plotH;

  const line = itinerary
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.sleepAltitudeM)}`)
    .join(" ");

  const peak = itinerary.reduce(
    (best, d, i) => {
      const v = d.maxAltitudeM ?? d.sleepAltitudeM;
      const bestV = best.day.maxAltitudeM ?? best.day.sleepAltitudeM;
      return v > bestV ? { day: d, i } : best;
    },
    { day: itinerary[0], i: 0 },
  );
  const peakAlt = peak.day.maxAltitudeM ?? peak.day.sleepAltitudeM;

  const current = active === null ? null : itinerary[active];

  return (
    <div>
      {/* Horizontal scroll rather than a chart squeezed until the labels
          overlap. A profile you cannot read is worse than one you have to
          push sideways. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          role="img"
          aria-label={`Sleeping altitude by day for ${trekName}, from ${itinerary[0].sleepAltitudeM} metres on day 1 to a high point of ${peakAlt} metres on day ${peak.day.day}. The same figures are listed in the table below.`}
          className="block max-w-none"
          onMouseLeave={() => setActive(null)}
        >
          {ticks(top).map((t) => (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {t.toLocaleString("en-GB")}
              </text>
            </g>
          ))}

          {/* Beat 1 — the line draws left to right. */}
          <m.path
            data-motion
            d={line}
            fill="none"
            className="stroke-prayer-deep dark:stroke-prayer-light"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: DURATION.slow * 1.2, ease: EASE }}
          />

          {itinerary.map((d, i) => {
            const isAcc = d.isAcclimatisation === true;
            const isActive = active === i;
            return (
              <g key={d.day}>
                {/* Beat 2 — the marks arrive after the line has passed. */}
                <m.g
                  data-motion
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: DURATION.fast,
                    ease: EASE,
                    delay: DURATION.slow * 1.2 * 0.7 + i * 0.03,
                  }}
                >
                  {isAcc ? (
                    // A square, not a coloured dot: the difference has to
                    // survive being printed, and read without colour vision.
                    <rect
                      x={x(i) - 4.5}
                      y={y(d.sleepAltitudeM) - 4.5}
                      width="9"
                      height="9"
                      className="fill-background stroke-verified"
                      strokeWidth="2"
                    />
                  ) : (
                    <circle
                      cx={x(i)}
                      cy={y(d.sleepAltitudeM)}
                      r={isActive ? 5 : 3.5}
                      className="fill-background stroke-prayer-deep dark:stroke-prayer-light"
                      strokeWidth="2"
                    />
                  )}
                </m.g>

                <text
                  x={x(i)}
                  y={H - PAD_B + 18}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px]",
                    isActive ? "fill-foreground" : "fill-muted-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {d.day}
                </text>

                {/* The hit area. Bigger than the mark, focusable, and the only
                    thing keyboard users need to reach. */}
                <rect
                  x={x(i) - DAY_W / 2}
                  y={PAD_T}
                  width={DAY_W}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`Day ${d.day}, ${d.toPlace}, sleeping at ${d.sleepAltitudeM.toLocaleString("en-GB")} metres`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-pointer outline-none focus-visible:stroke-ring focus-visible:[stroke-width:2]"
                />
              </g>
            );
          })}

          {/* The high point, annotated in place. */}
          <g>
            <line
              x1={x(peak.i)}
              x2={x(peak.i)}
              y1={y(peakAlt)}
              y2={y(peak.day.sleepAltitudeM)}
              className="stroke-foreground"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={x(peak.i)}
              y={y(peakAlt) - 8}
              textAnchor="middle"
              className="fill-foreground text-[11px] font-medium"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {peakAlt.toLocaleString("en-GB")} m
            </text>
          </g>

          <text
            x={PAD_L}
            y={H - 6}
            className="fill-muted-foreground text-[10px] tracking-[0.14em] uppercase"
          >
            Day
          </text>
        </svg>
      </div>

      {/* One live region rather than a floating tooltip: it cannot be clipped
          by the scroll container and a screen reader is told about it. */}
      <p
        aria-live="polite"
        className="min-h-6 tabular text-sm text-muted-foreground"
      >
        {current
          ? `Day ${current.day} · ${current.toPlace} · sleeps ${current.sleepAltitudeM.toLocaleString("en-GB")} m${
              current.maxAltitudeM
                ? ` · reaches ${current.maxAltitudeM.toLocaleString("en-GB")} m`
                : ""
            }${current.isAcclimatisation ? " · acclimatisation day" : ""}`
          : "Hover or tab through the profile for each day."}
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 rounded-full border-2 border-prayer-deep bg-background dark:border-prayer-light"
          />
          Night on the trail
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 border-2 border-verified bg-background"
          />
          Acclimatisation night ({acclimatisationDays.length})
        </li>
      </ul>
    </div>
  );
}
