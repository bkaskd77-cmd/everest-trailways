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

import { BANNED_ADJECTIVES } from "../src/content/trust-points.ts";
import { costSheetPdf, pdfLedgerTotal } from "../src/lib/cost-sheet-pdf.ts";
import {
  RETURN_POINTS,
  departures,
  departureStatus,
  guaranteeMeta,
  itineraryHighPoint,
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

/* ------------------------------------------------------- itinerary integrity */

/*
 * The itinerary is the page's safety claim, so it is checked like one.
 *
 * `sleepAltitudeM` is required on every day because it is the number that
 * governs altitude illness — an itinerary that publishes its peaks and omits
 * where it sleeps has published the flattering half. The day count has to match
 * `days` or the page and the card disagree in public. And the advertised
 * maximum altitude is re-derived from the days themselves, ignoring travel
 * days, so a trek cannot claim a high point its own itinerary never reaches.
 */
for (const d of departures) {
  const { id } = d;

  if (d.itinerary.length !== d.days) {
    fail(
      id,
      "day-count",
      `itinerary has ${d.itinerary.length} days but the departure says ${d.days}`,
    );
  }

  d.itinerary.forEach((day, index) => {
    if (day.day !== index + 1) {
      fail(id, "day-numbering", `day ${index + 1} is numbered ${day.day}`);
    }
    if (typeof day.sleepAltitudeM !== "number") {
      fail(
        id,
        "missing-sleep-altitude",
        `day ${day.day} has no sleepAltitudeM`,
      );
    }
    if (
      day.maxAltitudeM !== undefined &&
      day.maxAltitudeM < day.sleepAltitudeM
    ) {
      fail(
        id,
        "impossible-day",
        `day ${day.day} tops out at ${day.maxAltitudeM} m but sleeps at ${day.sleepAltitudeM} m`,
      );
    }
    if (!day.meals.length) {
      fail(id, "no-meals", `day ${day.day} lists no meals`);
    }
    if (!day.toPlace.trim()) {
      fail(id, "no-destination", `day ${day.day} has no toPlace`);
    }
  });

  const derivedMax = itineraryHighPoint(d);
  if (derivedMax !== d.maxAltitudeM) {
    fail(
      id,
      "altitude-contradiction",
      `advertised max is ${d.maxAltitudeM} m but the itinerary reaches ${derivedMax} m on its walking days`,
    );
  }

  const last = d.itinerary[d.itinerary.length - 1];
  if (last && !RETURN_POINTS.some((place) => last.toPlace.includes(place))) {
    fail(
      id,
      "no-return",
      `the last day ends at "${last.toPlace}", which is not one of ${RETURN_POINTS.join(" or ")}`,
    );
  }

  const marked = d.itinerary
    .filter((day) => day.isAcclimatisation)
    .map((day) => day.day);
  if (marked.join(",") !== d.acclimatisationDays.join(",")) {
    fail(
      id,
      "acclimatisation-drift",
      `acclimatisationDays is [${d.acclimatisationDays}] but the itinerary marks [${marked}]`,
    );
  }

  if (!d.summary.trim()) fail(id, "no-summary", "summary is empty");
  if (!d.slug.trim() || !/^[a-z0-9-]+$/.test(d.slug)) {
    fail(id, "bad-slug", `slug "${d.slug}" is not kebab-case`);
  }
  if (d.groupSizeMax < d.seatsTotal) {
    fail(
      id,
      "group-cap",
      `groupSizeMax ${d.groupSizeMax} is below seatsTotal ${d.seatsTotal}`,
    );
  }
}

const slugs = new Set<string>();
for (const d of departures) {
  if (slugs.has(d.slug)) {
    fail(d.id, "duplicate-slug", `two departures share the slug "${d.slug}"`);
  }
  slugs.add(d.slug);
}

/* ------------------------------------------------------------- cost sheet */

/*
 * The cost sheet is the site's central promise, so it gets the strictest rules
 * in this file.
 *
 * The sum is the whole thing. A cost sheet that does not add up to the price on
 * the card is not a rough edge, it is the same hidden-cost problem the section
 * exists to answer, printed in a more convincing typeface. It is checked to the
 * dollar with integer arithmetic, not to a tolerance.
 */
const MARGIN_BAND = { min: 0.05, max: 0.4 };

for (const d of departures) {
  const { id, costSheet } = d;
  const included = costSheet.lines.filter((l) => l.included);
  const excluded = costSheet.lines.filter((l) => !l.included);

  const ledger = included.reduce((sum, l) => sum + l.amountUSD, 0);
  if (ledger !== d.priceUSD) {
    fail(
      id,
      "ledger-mismatch",
      `included lines total $${ledger} but the price is $${d.priceUSD} — off by $${ledger - d.priceUSD}`,
    );
  }

  if (!included.length) fail(id, "no-ledger", "the cost sheet has no lines");
  if (!excluded.length) {
    fail(
      id,
      "no-excludes",
      "nothing is listed as not included — every trip excludes something, and hiding that is the problem this section exists to solve",
    );
  }

  for (const line of included) {
    if (!Number.isInteger(line.amountUSD)) {
      fail(id, "fractional-line", `"${line.label}" is $${line.amountUSD}`);
    }
    if (line.amountUSD < 0) {
      fail(
        id,
        "negative-line",
        `"${line.label}" is negative — the price is too low to cover the stated costs`,
      );
    }
  }

  /*
   * Staff pay is its own line, never folded into a general trek cost. It is the
   * number most easily hidden and most often squeezed, and an operator
   * unwilling to show it is telling you something.
   */
  const staff = included.filter((l) => l.category === "staff");
  if (!staff.some((l) => /guide/i.test(l.label))) {
    fail(id, "wages-buried", "no distinct guide wage line");
  }
  if (staff.reduce((sum, l) => sum + l.amountUSD, 0) <= 0) {
    fail(id, "wages-buried", "staff lines total zero");
  }

  const margin = included.find((l) => l.id === "margin");
  if (!margin) {
    fail(id, "no-margin", "the margin is not published as its own line");
  } else {
    const share = margin.amountUSD / d.priceUSD;
    if (share < MARGIN_BAND.min || share > MARGIN_BAND.max) {
      fail(
        id,
        "implausible-margin",
        `margin is ${Math.round(share * 100)}% of the price, outside ${MARGIN_BAND.min * 100}-${MARGIN_BAND.max * 100}% — the components have drifted, and the ledger is balancing itself on a number nobody chose`,
      );
    }
  }

  /* ------------------------------------------------------ contingencies */

  if (!costSheet.contingencies.length) {
    fail(id, "no-contingencies", "nothing is published about what goes wrong");
  }

  // Every departure that flies to Lukla must say what happens when it does not.
  const fliesToLukla = d.itinerary.some((day) =>
    `${day.title} ${day.toPlace} ${day.fromPlace ?? ""}`.includes("Lukla"),
  );
  if (fliesToLukla) {
    const covered = costSheet.contingencies.filter((c) =>
      /lukla|ramechhap/i.test(`${c.id} ${c.trigger}`),
    );
    if (covered.length < 2) {
      fail(
        id,
        "no-lukla-contingency",
        `the itinerary flies to Lukla but only ${covered.length} cancellation contingency is published — 30-40% of peak-season flights do not go`,
      );
    }
  }

  for (const c of costSheet.contingencies) {
    if (!["us", "you", "shared"].includes(c.whoPays)) {
      fail(id, "ambiguous-who-pays", `"${c.id}" has whoPays "${c.whoPays}"`);
    }
    // 'shared' without an explanation is the ambiguity this rule exists to stop.
    if (c.whoPays === "shared" && !c.note?.trim()) {
      fail(
        id,
        "ambiguous-who-pays",
        `"${c.id}" says the cost is shared without saying how it splits`,
      );
    }
    if (!c.trigger.trim() || !c.likelihood.trim() || !c.whatWeDo.trim()) {
      fail(
        id,
        "thin-contingency",
        `"${c.id}" is missing trigger, likelihood or response`,
      );
    }
    if (Array.isArray(c.estimatedCostUSD)) {
      const [low, high] = c.estimatedCostUSD;
      if (low > high) {
        fail(id, "bad-range", `"${c.id}" has a range of $${low}-$${high}`);
      }
    }
  }

  /* --------------------------------------------------------- insurance */

  const ins = costSheet.insuranceRequirement;
  if (!ins.mandatory)
    fail(id, "insurance-optional", "insurance is not required");
  if (ins.minimumMedicalCoverUSD < 50_000) {
    fail(
      id,
      "insurance-thin",
      `minimum medical cover is $${ins.minimumMedicalCoverUSD}`,
    );
  }
  if (!ins.mustCoverHelicopterEvacuation) {
    fail(id, "insurance-thin", "helicopter evacuation is not required");
  }
  if (ins.mustCoverAltitudeM < d.maxAltitudeM) {
    fail(
      id,
      "insurance-thin",
      `policy must cover ${ins.mustCoverAltitudeM} m but the trek reaches ${d.maxAltitudeM} m`,
    );
  }
  // The whole point: people assume weather delay is covered and it is not.
  if (!/weather/i.test(ins.weatherDelayNote)) {
    fail(
      id,
      "insurance-thin",
      "the weather-delay position is not stated, which is the one thing travellers get wrong",
    );
  }

  /* ---------------------------------------------------------- tipping */

  const [tipLow, tipHigh] = costSheet.tipping.typicalRangeUSD;
  if (tipLow <= 0 || tipHigh <= tipLow) {
    fail(id, "bad-tipping", `typical range is $${tipLow}-$${tipHigh}`);
  }

  /* -------------------------------------------------------------- the PDF */

  /*
   * The document a traveller forwards to whoever is paying must carry the same
   * total as the page they read it on. Two renderers of one dataset is exactly
   * where a divergence hides, and this one would be invisible: the page would
   * be right, the PDF would be wrong, and the only person to notice would be
   * the person deciding whether to pay.
   *
   * The generator is run for real rather than inspected, so a crash in it fails
   * the build here instead of at request time.
   */
  const pdfTotal = pdfLedgerTotal(d);
  if (pdfTotal !== d.priceUSD) {
    fail(
      id,
      "pdf-mismatch",
      `the PDF totals $${pdfTotal} against a page price of $${d.priceUSD}`,
    );
  }
  try {
    const bytes = costSheetPdf(d, new Date("2026-01-01T00:00:00Z"));
    if (bytes.length < 2_000) {
      fail(id, "pdf-empty", `the generated PDF is only ${bytes.length} bytes`);
    }
    const head = String.fromCharCode(...bytes.slice(0, 8));
    if (!head.startsWith("%PDF-")) {
      fail(id, "pdf-malformed", "the generated file is not a PDF");
    }
  } catch (error) {
    fail(
      id,
      "pdf-broken",
      `generating the PDF threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  /* ------------------------------------------------------- no adjectives */

  const prose = [
    ...costSheet.lines.flatMap((l) => [
      l.label,
      l.note ?? "",
      l.payableTo ?? "",
    ]),
    ...costSheet.contingencies.flatMap((c) => [
      c.trigger,
      c.likelihood,
      c.whatWeDo,
      c.note ?? "",
    ]),
    costSheet.tipping.guidance,
    ins.weatherDelayNote,
  ]
    .join(" ")
    .toLowerCase();

  for (const word of BANNED_ADJECTIVES) {
    if (prose.includes(word.toLowerCase())) {
      fail(
        id,
        "marketing-adjective",
        `the cost sheet uses "${word}" — this section is a document, not a pitch`,
      );
    }
  }
}

/* ------------------------------------------------------------ coverage rules */

/*
 * The matcher is only as good as the inventory behind it. With six departures
 * it returned an empty list for most honest answers — one sub-3,000 m date and
 * one October date is not a catalogue, it is a demo. These are the floors that
 * keep it able to answer.
 */
const lowAltitude = departures.filter((d) => d.maxAltitudeM < 3000);
if (lowAltitude.length < 4) {
  fail(
    "section",
    "coverage",
    `only ${lowAltitude.length} departures under 3,000 m — at least 4 are needed for the matcher to answer a stated low ceiling`,
  );
}

const autumn = departures.filter((d) => {
  const month = new Date(d.departsOn).getUTCMonth();
  return month === 9 || month === 10;
});
if (autumn.length < 4) {
  fail(
    "section",
    "coverage",
    `only ${autumn.length} departures in October or November — the two busiest months need at least 4`,
  );
}

const shortTreks = new Set(
  departures.filter((d) => d.days <= 7).map((d) => d.trekId),
);
if (shortTreks.size < 3) {
  fail(
    "section",
    "coverage",
    `only ${shortTreks.size} distinct treks of 7 days or fewer — at least 3 are needed`,
  );
}

const REQUIRED_MONTHS = [
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05",
];
const present = new Set(departures.map((d) => d.departsOn.slice(0, 7)));
for (const month of REQUIRED_MONTHS) {
  if (!present.has(month)) {
    fail("section", "coverage", `no departure in ${month}`);
  }
}

const states = new Set(departures.map((d) => departureStatus(d, now)));
if (states.size < 3) {
  fail(
    "section",
    "coverage",
    `only ${states.size} distinct fill states across the whole set — the grid should show a spread`,
  );
}
if (!states.has("full")) {
  fail(
    "section",
    "coverage",
    "no departure is full — at least one should be, or the seat meter never shows its own end state",
  );
}

const trekCount = new Set(departures.map((d) => d.trekId)).size;
if (trekCount < 8) {
  fail("section", "coverage", `only ${trekCount} distinct treks — at least 8`);
}

/* ------------------------------------------------------- section-level rules */

if (departures.length < 16) {
  fail(
    "section",
    "too-few",
    `${departures.length} departures — the matcher needs at least 16 to have answers`,
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
// The matcher panel re-points the same tokens onto its own dark surface, so it
// is a third theme in every sense that matters here and gets checked like one.
const instrument = tokens(cssBlock("@utility on-instrument {"));

/** Non-text UI components. WCAG 2.2 SC 1.4.11. */
const MIN_UI_CONTRAST = 3;

/** The panel shares the dark palette, so it shares the dark sources. */
type MeterTheme = "light" | "dark" | "panel";
const sourceTheme = (theme: MeterTheme): "light" | "dark" =>
  theme === "panel" ? "dark" : theme;

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
  ["panel", instrument],
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
    const expected = brand[source[sourceTheme(theme)]];
    if (expected && value !== expected) {
      fail(
        "meter",
        "palette-drift",
        `${theme} ${bar} is ${value} but ${source[sourceTheme(theme)]} is ${expected}`,
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
    `\n  ${departures.length} departures · ${departures.reduce((n, d) => n + d.costSheet.lines.length, 0)} cost lines, every ledger balances to the dollar · ${departures.reduce((n, d) => n + d.costSheet.contingencies.length, 0)} contingencies published · feed shape ok · no problems\n`,
  );
}
