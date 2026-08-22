"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DepartureCard } from "@/components/departures/departure-card";
import { DepartureCell } from "@/components/departures/departure-cell";
import { StaggerGroup } from "@/components/motion";
import {
  departureStatus,
  isBookable,
  type Departure,
  type DepartureStatus,
} from "@/content/departures";
import { trekById } from "@/content/trek-pages";
import { cn } from "@/lib/utils";

/**
 * The departures index.
 *
 * Deliberately the same card as the homepage grid rather than a denser list
 * variant: someone comparing nineteen dates is doing the same job they were
 * doing with six, and a second card design would mean two places for the
 * guarantee copy to drift.
 *
 * The filters are plain groups of buttons over an array that is already in the
 * page. No request, no loading state, and the unfiltered list is what the HTML
 * ships with — so a crawler and a reader without JavaScript both see every
 * departure.
 *
 * Every choice is written into the query string.
 *
 * That is the difference between a filter and a view. Before this, somebody
 * who narrowed nineteen dates down to the two they wanted had nothing to send
 * to the person they were travelling with, nothing to bookmark, and nothing to
 * come back to — the state lived in a React hook and died with the tab. It
 * also meant the one link the site most wanted to hand out, "the dates on this
 * trek", could not be written down. Now it can: /departures?trek=poon-hill.
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

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The `YYYY-MM` a departure leaves in. */
const monthKey = (d: Departure) => d.departsOn.slice(0, 7);

/**
 * Every month between the first departure and the last, including the empty
 * ones.
 *
 * Derived from the dates rather than written down, so the row cannot outlive
 * the season it was typed in. The gaps are the point: a reader who sees July
 * present but unselectable learns that we do not run in July, which is a fact
 * about the monsoon. A reader who sees the row skip from June to September
 * learns nothing and assumes an oversight.
 */
function monthWindow(list: Departure[]) {
  if (!list.length) return [] as { key: string; label: string }[];
  const keys = list.map(monthKey).sort();
  const [fromY, fromM] = keys[0].split("-").map(Number);
  const [toY, toM] = keys[keys.length - 1].split("-").map(Number);

  const out: { key: string; label: string }[] = [];
  for (let y = fromY, m = fromM; y < toY || (y === toY && m <= toM); ) {
    out.push({
      key: `${y}-${String(m).padStart(2, "0")}`,
      label: `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}`,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function FilterRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { id: string; label: string; disabled?: boolean; count?: number }[];
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
            disabled={option.disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2.5 text-sm transition-colors",
              option.disabled
                ? "cursor-not-allowed border-border/60 text-muted-foreground/50"
                : "cursor-pointer",
              value === option.id
                ? "border-foreground bg-foreground text-background"
                : !option.disabled &&
                    "border-border hover:border-foreground/40 hover:bg-muted",
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span className="tabular ml-1.5 text-xs opacity-60">
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Every filter, and the query-string key it is written to. */
const KEYS = {
  trek: "trek",
  region: "region",
  month: "month",
  altitude: "altitude",
  length: "length",
  state: "state",
} as const;

const ANY = {
  trek: "any-trek",
  region: "any-region",
  month: "any-month",
  altitude: ALTITUDE[0].id,
  length: LENGTH[0].id,
  state: STATE[0].id,
} as const;

export function DepartureIndex({ departures }: { departures: Departure[] }) {
  /*
   * Bookable only, whatever the caller passes.
   *
   * Filtered here rather than at the call site so a future page cannot list
   * cancelled dates by forgetting to. A date that did not fill still has a page
   * and is still reachable — it is not offered on a shelf of things to buy.
   * The archive of those dates belongs on the trek page, where it is evidence
   * rather than inventory.
   */
  const open = React.useMemo(
    () => departures.filter((d) => isBookable(d)),
    [departures],
  );

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /*
   * The query string is the state. There is no second copy of it in a hook to
   * fall out of step with the address bar, and the back button therefore steps
   * through views rather than out of the page.
   */
  const read = (key: keyof typeof KEYS) => params.get(KEYS[key]) ?? ANY[key];
  const trek = read("trek");
  const region = read("region");
  const month = read("month");
  const altitude = read("altitude");
  const length = read("length");
  const state = read("state");

  const set = (changes: Partial<Record<keyof typeof KEYS, string>>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      const k = key as keyof typeof KEYS;
      // Defaults are absent from the URL rather than spelled out in it, so a
      // link to the unfiltered index is /departures and nothing longer.
      if (!value || value === ANY[k]) next.delete(KEYS[k]);
      else next.set(KEYS[k], value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const treks = React.useMemo(() => {
    const ids = [...new Set(open.map((d) => d.trekId))];
    return ids
      .map((id) => ({
        id,
        label: trekById(id)?.name ?? id,
        count: open.filter((d) => d.trekId === id).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [open]);

  const regions = React.useMemo(() => {
    const names = [...new Set(open.map((d) => d.region))].sort();
    return names.map((name) => ({
      id: name,
      label: name,
      count: open.filter((d) => d.region === name).length,
    }));
  }, [open]);

  const months = React.useMemo(() => monthWindow(open), [open]);

  const shown = React.useMemo(() => {
    const pick = (list: Filter[], id: string) =>
      list.find((f) => f.id === id) ?? list[0];
    const tests = [
      pick(ALTITUDE, altitude),
      pick(LENGTH, length),
      pick(STATE, state),
    ];
    return open.filter(
      (d) =>
        tests.every((t) => t.test(d)) &&
        (trek === ANY.trek || d.trekId === trek) &&
        (region === ANY.region || d.region === region) &&
        (month === ANY.month || monthKey(d) === month),
    );
  }, [open, altitude, length, state, trek, region, month]);

  const cleared =
    trek === ANY.trek &&
    region === ANY.region &&
    month === ANY.month &&
    altitude === ANY.altitude &&
    length === ANY.length &&
    state === ANY.state;

  /* The count of dates the region filter would leave, for its own labels. */
  const withinRegion = (d: Departure) =>
    region === ANY.region || d.region === region;

  return (
    <div>
      <div className="grid gap-6 border-y border-border py-6 lg:grid-cols-2">
        <FilterRow
          legend="Trek"
          value={trek}
          onChange={(id) =>
            // Choosing a trek clears the region: the trek is inside one, and
            // leaving a contradictory pair in the URL produces a view with
            // nothing in it and no obvious reason why.
            set({ trek: id, region: ANY.region })
          }
          options={[
            { id: ANY.trek, label: "Any trek", count: open.length },
            ...treks,
          ]}
        />
        <FilterRow
          legend="Region"
          value={region}
          onChange={(id) => set({ region: id, trek: ANY.trek })}
          options={[
            { id: ANY.region, label: "Anywhere", count: open.length },
            ...regions,
          ]}
        />
      </div>

      <div className="border-b border-border py-6">
        <FilterRow
          legend="Month of departure"
          value={month}
          onChange={(id) => set({ month: id })}
          options={[
            { id: ANY.month, label: "Any month" },
            ...months.map((m) => {
              const count = open.filter(
                (d) => monthKey(d) === m.key && withinRegion(d),
              ).length;
              return {
                id: m.key,
                label: m.label,
                count,
                // Shown and unselectable rather than removed — see monthWindow.
                disabled: count === 0,
              };
            }),
          ]}
        />
      </div>

      <div className="grid gap-6 border-b border-border py-6 sm:grid-cols-2 lg:grid-cols-3">
        <FilterRow
          legend="Altitude"
          options={ALTITUDE}
          value={altitude}
          onChange={(id) => set({ altitude: id })}
        />
        <FilterRow
          legend="Length"
          options={LENGTH}
          value={length}
          onChange={(id) => set({ length: id })}
        />
        <FilterRow
          legend="Guarantee"
          options={STATE}
          value={state}
          onChange={(id) => set({ state: id })}
        />
      </div>

      <p
        aria-live="polite"
        className="mt-6 tabular text-sm text-muted-foreground"
      >
        {shown.length} of {open.length} departures
        {!cleared && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => router.replace(pathname, { scroll: false })}
              className="cursor-pointer underline underline-offset-4 hover:text-foreground"
            >
              Clear filters
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="mt-10 max-w-[62ch] font-display text-2xl tracking-tight text-balance">
          Nothing on sale matches all of those at once. Widen one of them, or{" "}
          <Link
            href="/treks"
            className="underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            look at the trek itself
          </Link>{" "}
          — every route lists the months it runs in and the dates that did not.
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
