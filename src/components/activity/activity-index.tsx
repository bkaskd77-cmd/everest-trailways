"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Reveal, StaggerGroup } from "@/components/motion";
import type { Activity } from "@/content/activities";
import { cn } from "@/lib/utils";

/**
 * Filterable by the four things that actually eliminate an activity: what kind
 * it is, where it is, how long it takes, and whether it runs when you are
 * there. Filter state is in the query string, as everywhere else on this site.
 */

const CATEGORY_LABEL: Record<Activity["category"], string> = {
  water: "Water",
  wildlife: "Wildlife",
  aerial: "Aerial",
  cultural: "Cultural",
  cycling: "Cycling",
  climbing: "Climbing",
  "day-hike": "Day hike",
};

const ANY = "any";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Does this activity run in the given month? Derived from the mode. */
function runsIn(a: Activity, month: number): boolean {
  const av = a.availability;
  if (av.mode === "on-demand") return av.operatingMonths.includes(month);
  if (av.mode === "seasonal-window") {
    return av.windows.some((w) => {
      const from = Number(w.from.slice(5, 7));
      const to = Number(w.to.slice(5, 7));
      return from <= to
        ? month >= from && month <= to
        : month >= from || month <= to;
    });
  }
  /* Scheduled: it runs when its departures run, which the page lists. */
  return true;
}

const durationOf = (a: Activity) =>
  a.durationDays ? a.durationDays * 24 : (a.durationHours ?? 0);

function FilterRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {legend}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full border px-4 py-2.5 text-sm transition-colors",
              value === o.id
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/40 hover:bg-muted",
            )}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span className="ml-1.5 tabular text-xs opacity-60">
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ActivityIndex({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const category = params.get("category") ?? ANY;
  const region = params.get("region") ?? ANY;
  const duration = params.get("duration") ?? ANY;
  const month = params.get("month") ?? ANY;

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === ANY) next.delete(k);
      else next.set(k, v);
    }
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const categories = React.useMemo(() => {
    const set = [...new Set(activities.map((a) => a.category))].sort();
    return set.map((c) => ({
      id: c,
      label: CATEGORY_LABEL[c],
      count: activities.filter((a) => a.category === c).length,
    }));
  }, [activities]);

  const regions = React.useMemo(() => {
    const set = [...new Set(activities.map((a) => a.region))].sort();
    return set.map((r) => ({
      id: r,
      label: r,
      count: activities.filter((a) => a.region === r).length,
    }));
  }, [activities]);

  const shown = React.useMemo(
    () =>
      activities.filter((a) => {
        if (category !== ANY && a.category !== category) return false;
        if (region !== ANY && a.region !== region) return false;
        if (duration === "half-day" && durationOf(a) > 5) return false;
        if (duration === "day" && (durationOf(a) <= 5 || durationOf(a) > 24))
          return false;
        if (duration === "multi-day" && durationOf(a) <= 24) return false;
        if (month !== ANY && !runsIn(a, Number(month))) return false;
        return true;
      }),
    [activities, category, region, duration, month],
  );

  const cleared =
    category === ANY && region === ANY && duration === ANY && month === ANY;

  return (
    <div>
      <div className="grid gap-6 border-y border-border py-6 lg:grid-cols-2">
        <FilterRow
          legend="Kind"
          value={category}
          onChange={(id) => set({ category: id })}
          options={[
            { id: ANY, label: "Any kind", count: activities.length },
            ...categories,
          ]}
        />
        <FilterRow
          legend="Region"
          value={region}
          onChange={(id) => set({ region: id })}
          options={[
            { id: ANY, label: "Anywhere", count: activities.length },
            ...regions,
          ]}
        />
      </div>

      <div className="grid gap-6 border-b border-border py-6 lg:grid-cols-2">
        <FilterRow
          legend="Duration"
          value={duration}
          onChange={(id) => set({ duration: id })}
          options={[
            { id: ANY, label: "Any length" },
            { id: "half-day", label: "Half day or less" },
            { id: "day", label: "A full day" },
            { id: "multi-day", label: "More than a day" },
          ]}
        />
        <FilterRow
          legend="Runs in"
          value={month}
          onChange={(id) => set({ month: id })}
          options={[
            { id: ANY, label: "Any month" },
            ...MONTH_SHORT.map((m, i) => ({
              id: String(i + 1),
              label: m,
              count: activities.filter((a) => runsIn(a, i + 1)).length,
            })),
          ]}
        />
      </div>

      <p
        aria-live="polite"
        className="mt-6 tabular text-sm text-muted-foreground"
      >
        {shown.length} of {activities.length} activities
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
          Nothing we run matches all of those. We would rather show you an empty
          list than pad it with something that does not fit what you asked for.
        </p>
      ) : (
        <StaggerGroup
          as="ul"
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((a) => (
            <Reveal as="li" key={a.id}>
              <Link
                href={`/activities/${a.slug}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25"
              >
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  {CATEGORY_LABEL[a.category]} · {a.region}
                </p>
                <h2 className="mt-3 font-display text-2xl tracking-tight text-balance">
                  {a.name}
                </h2>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {a.summary}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-5 text-sm">
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Takes
                    </dt>
                    <dd className="mt-1 tabular">
                      {a.durationDays
                        ? `${a.durationDays} days`
                        : `${a.durationHours} hours`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Group
                    </dt>
                    <dd className="mt-1 tabular">
                      {a.minParticipants}–{a.maxParticipants}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Runs
                    </dt>
                    <dd className="mt-1">
                      {a.availability.mode === "on-demand"
                        ? "On demand"
                        : a.availability.mode === "seasonal-window"
                          ? "In season"
                          : "Fixed dates"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      {a.priceScaling ? "From, at 1–2" : "Per person"}
                    </dt>
                    <dd className="mt-1 tabular">
                      ${a.priceUSD.toLocaleString("en-GB")}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {a.weatherDependency === "high"
                      ? "Weather can cancel it"
                      : a.weatherDependency === "moderate"
                        ? "Weather affects it"
                        : "Runs in most weather"}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </p>
              </Link>
            </Reveal>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
