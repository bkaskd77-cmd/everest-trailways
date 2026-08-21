"use client";

import * as React from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  Bed,
  ChevronDown,
  Home,
  Mountain,
  Plane,
  Tent,
  Utensils,
} from "lucide-react";

import { DURATION, EASE } from "@/lib/motion";
import type { ItineraryDay } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The day-by-day itinerary.
 *
 * A disclosure list rather than a radix accordion: the rows are plain buttons
 * controlling plain regions, which is all the pattern needs and leaves nothing
 * between the keyboard and the content. Every row's headline facts — day,
 * title, sleeping altitude, hours — are in the DOM whether it is open or shut,
 * so nothing a machine or a screen reader needs is hidden behind an
 * interaction. Only the prose note and the from/to detail are disclosed.
 *
 * The height animates rather than the opacity. A row that fades in over
 * content that has already jumped is the tell of an accordion built in a hurry.
 */

const STAY_ICON = {
  teahouse: Home,
  lodge: Bed,
  hotel: Bed,
  camp: Tent,
} as const;

const MEAL_LETTER = { breakfast: "B", lunch: "L", dinner: "D" } as const;

function DayRow({
  day,
  open,
  onToggle,
}: {
  day: ItineraryDay;
  open: boolean;
  onToggle: () => void;
}) {
  const Stay = STAY_ICON[day.accommodation];
  const panelId = `itinerary-day-${day.day}`;

  return (
    <li
      className={cn(
        "border-t border-border",
        day.isAcclimatisation && "bg-verified/5",
        day.isTravelDay && "bg-muted/40",
      )}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-start gap-4 px-1 py-4 text-left hover:bg-muted/40"
        >
          <span className="w-10 shrink-0 pt-0.5 tabular text-sm text-muted-foreground">
            Day {day.day}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-medium">{day.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular">
                Sleeps {day.sleepAltitudeM.toLocaleString("en-GB")} m
              </span>
              {day.maxAltitudeM && (
                <span className="inline-flex items-center gap-1 tabular">
                  <Mountain aria-hidden className="size-3" />
                  Reaches {day.maxAltitudeM.toLocaleString("en-GB")} m
                </span>
              )}
              {day.walkingHours && (
                <span className="tabular">{day.walkingHours} h walking</span>
              )}
              {day.distanceKm && (
                <span className="tabular">{day.distanceKm} km</span>
              )}
              <span className="inline-flex items-center gap-1">
                {day.isTravelDay ? (
                  <Plane aria-hidden className="size-3" />
                ) : (
                  <Stay aria-hidden className="size-3" />
                )}
                {day.accommodation}
              </span>
              <span className="inline-flex items-center gap-1">
                <Utensils aria-hidden className="size-3" />
                <span className="sr-only">Meals included: </span>
                {day.meals.map((meal) => MEAL_LETTER[meal]).join("")}
              </span>
              {day.isAcclimatisation && (
                <span className="font-medium text-verified">
                  Acclimatisation day
                </span>
              )}
              {day.isTravelDay && (
                <span className="font-medium">Travel day</span>
              )}
            </span>
          </span>

          <ChevronDown
            aria-hidden
            className={cn(
              "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            data-motion
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-5 pl-14 text-sm text-muted-foreground">
              {(day.fromPlace || day.toPlace) && (
                <p className="text-foreground">
                  {day.fromPlace ? `${day.fromPlace} to ` : "Based at "}
                  {day.toPlace}
                </p>
              )}
              {day.note && <p className="mt-2 max-w-[70ch]">{day.note}</p>}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function ItineraryList({ itinerary }: { itinerary: ItineraryDay[] }) {
  // The first day open, because an accordion where everything is shut asks the
  // reader to guess what is inside before they will open one.
  const [open, setOpen] = React.useState<Set<number>>(
    () => new Set([itinerary[0]?.day]),
  );
  const allOpen = open.size === itinerary.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="tabular text-sm text-muted-foreground">
          {itinerary.length} days
        </p>
        <button
          type="button"
          onClick={() =>
            setOpen(allOpen ? new Set() : new Set(itinerary.map((d) => d.day)))
          }
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <ul className="mt-2 border-b border-border">
        {itinerary.map((day) => (
          <DayRow
            key={day.day}
            day={day}
            open={open.has(day.day)}
            onToggle={() =>
              setOpen((current) => {
                const next = new Set(current);
                if (next.has(day.day)) next.delete(day.day);
                else next.add(day.day);
                return next;
              })
            }
          />
        ))}
      </ul>
    </div>
  );
}
