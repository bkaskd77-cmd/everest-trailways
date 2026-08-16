/**
 * Departure integrity guard.
 *
 *     pnpm check:departures
 *
 * The promises this section makes are only worth anything if the data behind
 * them is coherent. A published `minimumToRun` that exceeds `seatsTotal` is not
 * a typo — it is a guarantee that can never be met. This runs before every
 * build.
 *
 * It also re-derives `departureStatus` independently of the content module, so
 * a change to the derivation that contradicts the raw numbers is caught rather
 * than silently shipped.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  departures,
  departureStatus,
  guaranteeMeta,
  seatsRemaining,
  type Departure,
  type DepartureStatus,
} from "../src/content/departures.ts";

type Problem = { id: string; rule: string; detail: string };
const problems: Problem[] = [];

const fail = (id: string, rule: string, detail: string) =>
  problems.push({ id, rule, detail });

/** Deliberately a second implementation, not a re-use of the first. */
function expectedStatus(d: Departure, now: Date): DepartureStatus {
  const left = d.seatsTotal - d.seatsBooked;
  if (left <= 0) return "full";
  const decided = new Date(d.decisionDate).getTime() < now.getTime();
  if (decided && d.seatsBooked < d.minimumToRun) return "closed";
  if (d.seatsBooked >= d.minimumToRun)
    return left <= 3 ? "filling" : "guaranteed";
  return "needs-n";
}

const NAME_LIKE = /^(?:[A-Z][a-z]+ [A-Z]|Mr|Mrs|Ms|Dr)\b/;
const now = new Date();
const seen = new Set<string>();

for (const d of departures) {
  const { id } = d;

  if (seen.has(id)) fail(id, "duplicate-id", "two departures share an id");
  seen.add(id);

  if (!d.priceExcludes.length) {
    fail(
      id,
      "empty-excludes",
      "priceExcludes is empty — every trip excludes something",
    );
  }
  if (!d.costSheetHref?.trim()) {
    fail(id, "missing-cost-sheet", "costSheetHref is required");
  }
  if (typeof d.singleSupplementUSD !== "number") {
    fail(
      id,
      "missing-supplement",
      "singleSupplementUSD must be stated, including when 0",
    );
  }
  if (d.seatsBooked > d.seatsTotal) {
    fail(
      id,
      "overbooked",
      `seatsBooked ${d.seatsBooked} > seatsTotal ${d.seatsTotal}`,
    );
  }
  if (d.minimumToRun > d.seatsTotal) {
    fail(
      id,
      "impossible-guarantee",
      `minimumToRun ${d.minimumToRun} > seatsTotal ${d.seatsTotal} — can never be met`,
    );
  }
  if (new Date(d.returnsOn) <= new Date(d.departsOn)) {
    fail(id, "bad-dates", "returnsOn must be after departsOn");
  }
  if (new Date(d.decisionDate) > new Date(d.departsOn)) {
    fail(id, "bad-dates", "decisionDate must fall before departsOn");
  }
  if (new Date(d.departsOn) < now) {
    fail(id, "past-departure", `departsOn ${d.departsOn} is in the past`);
  }
  if (d.priceUSD <= 0)
    fail(id, "bad-price", "priceUSD must be a positive all-in total");

  for (const g of d.groupSoFar) {
    if (NAME_LIKE.test(g.country) || g.country.split(" ").length > 3) {
      fail(
        id,
        "privacy",
        `groupSoFar entry "${g.country}" looks like a name, not a country`,
      );
    }
    if (!Number.isInteger(g.count) || g.count < 1) {
      fail(
        id,
        "privacy",
        `groupSoFar count for ${g.country} must be a positive integer`,
      );
    }
  }
  const claimed = d.groupSoFar.reduce((n, g) => n + g.count, 0);
  if (claimed > d.seatsBooked) {
    fail(
      id,
      "group-mismatch",
      `groupSoFar totals ${claimed} but seatsBooked is ${d.seatsBooked}`,
    );
  }

  const derived = departureStatus(d, now);
  const expected = expectedStatus(d, now);
  if (derived !== expected) {
    fail(
      id,
      "status-contradiction",
      `module derives "${derived}", guard expects "${expected}"`,
    );
  }
  if (d.guaranteedAt && d.seatsBooked < d.minimumToRun) {
    fail(
      id,
      "status-contradiction",
      "guaranteedAt is set but the threshold is not met",
    );
  }
}

/* ------------------------------------------------------- section-level rules */

if (departures.length < 6) {
  fail(
    "section",
    "too-few",
    `${departures.length} departures — the grid expects at least 6`,
  );
}

// October and November are Nepal's busiest months. A visible set without them
// is not representative of what is actually on sale.
const peakMonths = departures.filter((d) => {
  const month = new Date(d.departsOn).getUTCMonth();
  return month === 9 || month === 10;
});
if (peakMonths.length < 2) {
  fail(
    "section",
    "missing-peak",
    `only ${peakMonths.length} departure(s) fall in Oct or Nov — the busiest months must be represented`,
  );
}

// A guaranteed departure showing "decided by" wastes a line on a decision that
// has already been made.
for (const d of departures) {
  const status = departureStatus(d, now);
  const meta = guaranteeMeta(d, now);
  if (status !== "needs-n" && /decided by/i.test(meta)) {
    fail(
      d.id,
      "stale-decision-date",
      `status is "${status}" but the meta line still reads "decided by"`,
    );
  }
  if (status === "needs-n" && !/decided by/i.test(meta)) {
    fail(
      d.id,
      "missing-decision-date",
      "needs-n must publish the decision date",
    );
  }
}

// The ask affordance is a component concern, so this is a source-level check:
// every card must offer the third action.
const cardSource = await readFile(
  path.join(process.cwd(), "src/components/departures/departure-card.tsx"),
  "utf8",
);
if (!/<AskPanel\b/.test(cardSource)) {
  fail("section", "missing-ask", "DepartureCard does not render <AskPanel>");
}

/* -------------------------------------------------------------- feed shape */

const REQUIRED_FEED_FIELDS = [
  "id",
  "trekName",
  "region",
  "days",
  "departsOn",
  "returnsOn",
  "status",
  "seatsTotal",
  "seatsBooked",
  "seatsRemaining",
  "minimumToRun",
  "decisionDate",
  "guideRatio",
  "priceMinorUnits",
  "priceCurrency",
  "singleSupplementMinorUnits",
  "costSheetUrl",
];

async function checkFeed() {
  const { buildFeed } = await import("../src/lib/departures-feed.ts");
  const feed = buildFeed("https://example.test");
  if (!feed.lastUpdated || Number.isNaN(Date.parse(feed.lastUpdated))) {
    fail("feed", "feed-shape", "lastUpdated must be an ISO timestamp");
  }
  if (!feed.docs || typeof feed.docs !== "object") {
    fail(
      "feed",
      "feed-shape",
      "feed must carry a docs object describing its fields",
    );
  }
  if (feed.departures.length !== departures.length) {
    fail("feed", "feed-shape", "feed does not expose every departure");
  }
  for (const entry of feed.departures) {
    for (const key of REQUIRED_FEED_FIELDS) {
      if (!(key in entry)) {
        fail(
          String(entry.id ?? "?"),
          "feed-shape",
          `feed entry is missing "${key}"`,
        );
      }
    }
    if (!Number.isInteger(entry.priceMinorUnits)) {
      fail(
        String(entry.id),
        "feed-shape",
        "priceMinorUnits must be an integer",
      );
    }
    if (!feed.docs[REQUIRED_FEED_FIELDS[0]]) {
      // checked once, below
    }
  }
  for (const key of REQUIRED_FEED_FIELDS) {
    if (!(key in feed.docs)) {
      fail("feed", "feed-docs", `docs is missing a description for "${key}"`);
    }
  }
}

await checkFeed();

/* ------------------------------------------------- seat meter legibility */

/**
 * The bars only mean anything if you can see them.
 *
 * The previous track (`bg-border`) put the filling bar at 2.9:1 and the pending
 * bar at 2.4:1 in light mode — under the 3:1 floor WCAG 1.4.11 sets for
 * non-text UI, and on Upper Mustang effectively invisible. Rather than trust a
 * fixed comment, this reads the tokens back out of the stylesheet and
 * re-computes every ratio, in both themes.
 *
 * It also asserts each bar still equals the brand step its comment names, so
 * the palette cannot quietly drift away from the design system.
 */
const css = await readFile(
  path.join(process.cwd(), "src/styles/globals.css"),
  "utf8",
);

function cssBlock(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  const end = css.indexOf("\n}", open);
  return css.slice(open, end);
}

function tokens(block: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(
    /(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
  )) {
    found[name] = value.toLowerCase();
  }
  return found;
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const brand = tokens(cssBlock("@theme {"));
const light = tokens(cssBlock(":root {"));
const dark = tokens(cssBlock(".dark {"));

/** Non-text UI components. WCAG 2.2 SC 1.4.11. */
const MIN_UI_CONTRAST = 3;

const METER_SOURCE: Record<string, { light: string; dark: string }> = {
  "--meter-guaranteed": { light: "--color-pine", dark: "--color-pine-light" },
  "--meter-filling": {
    light: "--color-prayer-deep",
    dark: "--color-prayer-light",
  },
  "--meter-pending": {
    light: "--color-stone-deep",
    dark: "--color-stone-light",
  },
  "--meter-inactive": {
    light: "--color-stone-deep",
    dark: "--color-stone-light",
  },
};

const meterRatios: string[] = [];

for (const [theme, set] of [
  ["light", light],
  ["dark", dark],
] as const) {
  const track = set["--meter-track"];
  if (!track) {
    fail("meter", "missing-token", `--meter-track is not defined in ${theme}`);
    continue;
  }
  for (const [bar, source] of Object.entries(METER_SOURCE)) {
    const value = set[bar];
    if (!value) {
      fail("meter", "missing-token", `${bar} is not defined in ${theme}`);
      continue;
    }
    const expected = brand[source[theme]];
    if (expected && value !== expected) {
      fail(
        "meter",
        "palette-drift",
        `${theme} ${bar} is ${value} but ${source[theme]} is ${expected}`,
      );
    }
    const ratio = contrast(value, track);
    meterRatios.push(
      `    ${theme.padEnd(5)} ${bar.replace("--meter-", "").padEnd(11)} ${ratio.toFixed(2)}:1`,
    );
    if (ratio < MIN_UI_CONTRAST) {
      fail(
        "meter",
        "low-contrast",
        `${theme} ${bar} is ${ratio.toFixed(2)}:1 against the track — needs ${MIN_UI_CONTRAST}:1`,
      );
    }
  }
}

// Three zones, not one surface with a hairline: the departures ground must be a
// visible step away from the trust band it sits under.
for (const [theme, set, band] of [
  ["light", light, brand["--color-glacier"]],
  ["dark", dark, brand["--color-summit-raised"]],
] as const) {
  const sunk = set["--band-sunk"];
  if (!sunk) {
    fail("meter", "missing-token", `--band-sunk is not defined in ${theme}`);
    continue;
  }
  if (!band || sunk === band) {
    fail(
      "section",
      "flat-zones",
      `${theme} --band-sunk matches the trust band — the two sections read as one surface`,
    );
  }
}

/* ------------------------------------------------------------------ report */

console.log("\n  Departures\n");
for (const d of departures) {
  const flag = problems.some((p) => p.id === d.id) ? "FAIL" : "ok";
  console.log(
    `  ${flag.padEnd(5)} ${d.id.padEnd(22)} ${departureStatus(d, now).padEnd(11)} ` +
      `${String(d.seatsBooked).padStart(2)}/${String(d.seatsTotal).padEnd(3)} ` +
      `min ${d.minimumToRun}  ${seatsRemaining(d)} left  $${d.priceUSD}`,
  );
}

console.log("\n  Seat meter contrast (bar vs track, floor 3:1)\n");
for (const line of meterRatios) console.log(line);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${departures.length} departures · feed shape ok · no problems\n`,
  );
}
