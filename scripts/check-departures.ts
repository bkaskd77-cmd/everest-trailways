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

import {
  departures,
  departureStatus,
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
