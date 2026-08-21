"use client";

import * as React from "react";

import { DepartureCard } from "@/components/departures/departure-card";
import { DepartureCell } from "@/components/departures/departure-cell";
import { StaggerGroup } from "@/components/motion";
import {
  departureStatus,
  type Departure,
  type DepartureStatus,
} from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The departures index.
 *
 * Deliberately the same card as the homepage grid rather than a denser list
 * variant: someone comparing nineteen dates is doing the same job they were
 * doing with six, and a second card design would mean two places for the
 * guarantee copy to drift.
 *
 * The filters are three plain groups of buttons over an array that is already
 * in the page. No request, no loading state, and the unfiltered list is what
 * the HTML ships with — so a crawler and a reader without JavaScript both see
 * every departure.
 */

type Filter = { id: string; label: string; test: (d: Departure) => boolean };

const ALTITUDE: Filter[] = [
  { id: "any-altitude", label: "Any altitude", test: () => true },
  {
    id: "under-3000",
    label: "Under 3,000 m",
    test: (d) => d.maxAltitudeM < 3000,
  },
  {
    id: "3000-4500",
    label: "3,000–4,500 m",
    test: (d) => d.maxAltitudeM >= 3000 && d.maxAltitudeM <= 4500,
  },
  {
    id: "over-4500",
    label: "Above 4,500 m",
    test: (d) => d.maxAltitudeM > 4500,
  },
];

const LENGTH: Filter[] = [
  { id: "any-length", label: "Any length", test: () => true },
  { id: "short", label: "A week or less", test: (d) => d.days <= 7 },
  {
    id: "mid",
    label: "Eight to twelve days",
    test: (d) => d.days >= 8 && d.days <= 12,
  },
  { id: "long", label: "Longer", test: (d) => d.days > 12 },
];

const STATE: Filter[] = [
  { id: "any-state", label: "Any state", test: () => true },
  {
    id: "guaranteed",
    label: "Guaranteed to run",
    test: (d) => {
      const s: DepartureStatus = departureStatus(d);
      return s === "guaranteed" || s === "filling";
    },
  },
  {
    id: "bookable",
    label: "Still bookable",
    test: (d) => {
      const s: DepartureStatus = departureStatus(d);
      return s !== "full" && s !== "closed";
    },
  },
];

function FilterRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Filter[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {legend}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full border px-4 py-2.5 text-sm transition-colors",
              value === option.id
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/40 hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DepartureIndex({ departures }: { departures: Departure[] }) {
  const [altitude, setAltitude] = React.useState(ALTITUDE[0].id);
  const [length, setLength] = React.useState(LENGTH[0].id);
  const [state, setState] = React.useState(STATE[0].id);

  const shown = React.useMemo(() => {
    const pick = (list: Filter[], id: string) =>
      list.find((f) => f.id === id) ?? list[0];
    const tests = [
      pick(ALTITUDE, altitude),
      pick(LENGTH, length),
      pick(STATE, state),
    ];
    return departures.filter((d) => tests.every((t) => t.test(d)));
  }, [departures, altitude, length, state]);

  const cleared =
    altitude === ALTITUDE[0].id &&
    length === LENGTH[0].id &&
    state === STATE[0].id;

  return (
    <div>
      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-3">
        <FilterRow
          legend="Altitude"
          options={ALTITUDE}
          value={altitude}
          onChange={setAltitude}
        />
        <FilterRow
          legend="Length"
          options={LENGTH}
          value={length}
          onChange={setLength}
        />
        <FilterRow
          legend="Guarantee"
          options={STATE}
          value={state}
          onChange={setState}
        />
      </div>

      <p
        aria-live="polite"
        className="mt-6 tabular text-sm text-muted-foreground"
      >
        {shown.length} of {departures.length} departures
        {!cleared && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => {
                setAltitude(ALTITUDE[0].id);
                setLength(LENGTH[0].id);
                setState(STATE[0].id);
              }}
              className="cursor-pointer underline underline-offset-4 hover:text-foreground"
            >
              Clear filters
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="mt-10 max-w-[62ch] font-display text-2xl tracking-tight text-balance">
          Nothing on sale matches all three of those. Widen one of them, or ask
          us on any departure page and we will tell you what is coming next.
        </p>
      ) : (
        <StaggerGroup
          as="ul"
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((departure, index) => (
            <DepartureCell key={departure.id} index={index}>
              <DepartureCard departure={departure} index={index} />
            </DepartureCell>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
