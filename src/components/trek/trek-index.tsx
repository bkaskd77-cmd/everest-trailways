"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Reveal, StaggerGroup } from "@/components/motion";
import { type Trek } from "@/content/trek-pages";
import { cn } from "@/lib/utils";

/**
 * Every route, one card each.
 *
 * The card carries the six things somebody uses to eliminate a trek without
 * opening it — where, how long, how high, how hard, from how much, and how
 * many dates are actually open. The last of those is the one most operators
 * leave off, and it is the one that decides whether the page is worth
 * clicking.
 *
 * Filter state is in the query string for the same reason it is on the
 * departures index: a narrowed view is a thing people send to each other.
 */

export type TrekCard = {
  trek: Trek;
  priceFrom: number | null;
  openCount: number;
  totalCount: number;
};

const DAYS = [
  { id: "any-days", label: "Any length", test: () => true },
  {
    id: "short",
    label: "A week or less",
    test: (c: TrekCard) => c.trek.typicalDays[0] <= 7,
  },
  {
    id: "mid",
    label: "Eight to twelve days",
    test: (c: TrekCard) =>
      c.trek.typicalDays[1] >= 8 && c.trek.typicalDays[0] <= 12,
  },
  {
    id: "long",
    label: "Longer",
    test: (c: TrekCard) => c.trek.typicalDays[1] > 12,
  },
];

const DIFFICULTY = [
  { id: "any-difficulty", label: "Any", test: () => true },
  {
    id: "moderate",
    label: "Moderate",
    test: (c: TrekCard) => c.trek.difficulty === "moderate",
  },
  {
    id: "challenging",
    label: "Challenging",
    test: (c: TrekCard) => c.trek.difficulty === "challenging",
  },
  {
    id: "strenuous",
    label: "Strenuous",
    test: (c: TrekCard) => c.trek.difficulty === "strenuous",
  },
];

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
            {typeof option.count === "number" && (
              <span className="ml-1.5 tabular text-xs opacity-60">
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const ANY_REGION = "anywhere";

export function TrekIndex({ cards }: { cards: TrekCard[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const region = params.get("region") ?? ANY_REGION;
  const days = params.get("days") ?? DAYS[0].id;
  const difficulty = params.get("difficulty") ?? DIFFICULTY[0].id;

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    const defaults: Record<string, string> = {
      region: ANY_REGION,
      days: DAYS[0].id,
      difficulty: DIFFICULTY[0].id,
    };
    for (const [key, value] of Object.entries(changes)) {
      if (value === defaults[key]) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const regions = React.useMemo(() => {
    const names = [...new Set(cards.map((c) => c.trek.region))].sort();
    return names.map((name) => ({
      id: name,
      label: name,
      count: cards.filter((c) => c.trek.region === name).length,
    }));
  }, [cards]);

  const shown = React.useMemo(() => {
    const pick = <T extends { id: string }>(list: T[], id: string) =>
      list.find((f) => f.id === id) ?? list[0];
    const dayTest = pick(DAYS, days).test;
    const diffTest = pick(DIFFICULTY, difficulty).test;
    return cards.filter(
      (c) =>
        (region === ANY_REGION || c.trek.region === region) &&
        dayTest(c) &&
        diffTest(c),
    );
  }, [cards, region, days, difficulty]);

  const cleared =
    region === ANY_REGION &&
    days === DAYS[0].id &&
    difficulty === DIFFICULTY[0].id;

  return (
    <div>
      <div className="grid gap-6 border-y border-border py-6 lg:grid-cols-3">
        <FilterRow
          legend="Region"
          value={region}
          onChange={(id) => set({ region: id })}
          options={[
            { id: ANY_REGION, label: "Anywhere", count: cards.length },
            ...regions,
          ]}
        />
        <FilterRow
          legend="Length"
          value={days}
          onChange={(id) => set({ days: id })}
          options={DAYS}
        />
        <FilterRow
          legend="Difficulty"
          value={difficulty}
          onChange={(id) => set({ difficulty: id })}
          options={DIFFICULTY}
        />
      </div>

      <p
        aria-live="polite"
        className="mt-6 tabular text-sm text-muted-foreground"
      >
        {shown.length} of {cards.length} treks
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
          Nothing we run matches all three. We would rather show you an empty
          list than pad it with a trek that does not fit what you asked for.
        </p>
      ) : (
        <StaggerGroup
          as="ul"
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((c) => (
            <Reveal as="li" key={c.trek.id}>
              <Link
                href={`/treks/${c.trek.slug}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25"
              >
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  {c.trek.region}
                </p>
                <h2 className="mt-3 font-display text-2xl tracking-tight text-balance">
                  {c.trek.name}
                </h2>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {c.trek.summary}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-5 text-sm">
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Days
                    </dt>
                    <dd className="mt-1 tabular">
                      {c.trek.typicalDays[0] === c.trek.typicalDays[1]
                        ? c.trek.typicalDays[0]
                        : `${c.trek.typicalDays[0]}–${c.trek.typicalDays[1]}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Highest point
                    </dt>
                    <dd className="mt-1 tabular">
                      {c.trek.maxAltitudeM.toLocaleString("en-GB")} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Difficulty
                    </dt>
                    <dd className="mt-1 capitalize">{c.trek.difficulty}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      From
                    </dt>
                    <dd className="mt-1 tabular">
                      {c.priceFrom
                        ? `$${c.priceFrom.toLocaleString("en-GB")}`
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 flex items-center justify-between text-sm">
                  <span
                    className={cn(
                      c.openCount ? "text-verified" : "text-muted-foreground",
                    )}
                  >
                    {c.openCount
                      ? `${c.openCount} ${c.openCount === 1 ? "date" : "dates"} open`
                      : "No dates open"}
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
