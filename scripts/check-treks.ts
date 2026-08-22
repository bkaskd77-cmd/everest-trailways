/**
 * Trek page guard.
 *
 *     pnpm check:treks
 *
 * The trek pages are the evergreen layer — what a search engine finds and what
 * an assistant quotes. Two sections make them worth citing rather than worth
 * skimming, and both are the kind of thing that quietly softens over time:
 *
 *   `notForYouIf`, because an operator that cannot say who a trek is wrong for
 *   is selling rather than advising. It is the section a competitor will not
 *   copy and the one a reader remembers.
 *
 *   `comparedTo`, because a comparison that concludes "choose ours" on both
 *   sides is an advertisement with a table in it. Every comparison must give a
 *   real reason to book the other trek.
 *
 * Everything else here re-applies rules the departure pages already live under:
 * no place a trek does not visit, no altitude it does not reach, no marketing
 * adjectives. Those were written for departures and the same prose problems
 * arrive on trek pages by the same route.
 */

import { BANNED_ADJECTIVES } from "../src/content/trust-points.ts";
import { TREK_NAMED_PLACES } from "../src/content/cost-sheets.ts";
import { PLACES } from "../src/content/places.ts";
import { TREKS } from "../src/content/treks.ts";
import {
  cancelledFor,
  departures,
  lifecycle,
} from "../src/content/departures.ts";
import { MONTH_NAME, TREK_PAGES } from "../src/content/trek-pages.ts";

type Problem = { id: string; rule: string; detail: string };
const problems: Problem[] = [];
const fail = (id: string, rule: string, detail: string) =>
  problems.push({ id, rule, detail });

const ids = new Set(TREK_PAGES.map((t) => t.id));

/* --------------------------------------------------- every departure lands */

for (const d of departures) {
  if (!ids.has(d.trekId)) {
    fail(
      d.id,
      "orphan-departure",
      `trekId "${d.trekId}" has no trek page, so this date has nothing to link up to`,
    );
  }
}

for (const trek of TREK_PAGES) {
  if (!TREKS[trek.id]) {
    fail(
      trek.id,
      "orphan-trek",
      "has no operational profile in treks.ts, so it has no itinerary",
    );
  }
}

/* ------------------------------------------------------------ known places */

const KNOWN_PLACES = [
  ...Object.keys(PLACES),
  "Lukla", "Ramechhap", "Manthali", "Khumbu", "Sagarmatha", "Everest", "Salleri",
  "Jiri", "Kala Patthar", "Annapurna", "Machhapuchhre", "Deurali", "Thorong",
  "Mardi", "Poon Hill", "Mustang", "Kali Gandaki", "Langtang", "Dhunche", "Beni",
  "Kande", "Nepalgunj", "Mugling", "Sundarijal", "Chitwan", "Bardia", "Karnali",
  "Rapti", "Terai", "Shivapuri", "Nagarjun", "Bhaktapur", "Changu Narayan",
  "Thamel", "Tharu", "Namche", "Gorakshep", "Marsyangdi", "Dudh Koshi",
  "Modi Khola", "Gurung", "Sauraha", "Himalaya",
];

for (const trek of TREK_PAGES) {
  const profile = TREKS[trek.id];
  const allowed = new Set<string>(TREK_NAMED_PLACES[trek.id] ?? []);
  const allow = (text: string) => {
    for (const place of KNOWN_PLACES) if (text.includes(place)) allowed.add(place);
  };
  allow(trek.region);
  allow(trek.name);
  for (const feature of trek.routeFeatures ?? []) allowed.add(feature);
  for (const day of profile?.itinerary ?? []) {
    allow(day.toPlace);
    allow(day.fromPlace ?? "");
    allow(day.title);
  }
  // A comparison names the other trek, so the other trek's name is legitimate.
  for (const c of trek.comparedTo) {
    const other = TREK_PAGES.find((t) => t.id === c.otherTrekId);
    if (other) {
      allow(other.name);
      allow(other.region);
    }
  }

  /* Everything this page renders. */
  const rendered: [string, string][] = [
    ["summary", trek.summary],
    ["routeOverview", trek.routeOverview],
    ...trek.permitsRequired.map(
      (p, i) => [`permit[${i}]`, p] as [string, string],
    ),
    ...trek.suitsYouIf.map((s, i) => [`suitsYouIf[${i}]`, s] as [string, string]),
    ...trek.notForYouIf.map(
      (s, i) => [`notForYouIf[${i}]`, s] as [string, string],
    ),
    ...trek.comparedTo.flatMap(
      (c, i) =>
        [
          [`comparedTo[${i}].chooseThisIf`, c.chooseThisIf],
          [`comparedTo[${i}].chooseOtherIf`, c.chooseOtherIf],
        ] as [string, string][],
    ),
    ...trek.seasonality.map(
      (m) => [`${MONTH_NAME[m.month - 1]}`, m.note] as [string, string],
    ),
    ["heroImage.alt", trek.heroImage.alt],
  ];

  for (const [where, text] of rendered) {
    for (const place of KNOWN_PLACES) {
      if (!text.includes(place)) continue;
      if (allowed.has(place)) continue;
      fail(
        trek.id,
        "foreign-place",
        `${where} names "${place}", which is not on this route`,
      );
    }

    /* Altitudes the route never reaches — the 8b rule, same allowance. */
    for (const match of text.matchAll(/\b([1-9][,.]?\d{3})\s?m\b/g)) {
      const cited = Number(match[1].replace(/[,.]/g, ""));
      if (cited < 2000) continue;
      if (cited <= trek.maxAltitudeM + 300) continue;
      // A comparison legitimately cites the other trek's altitude.
      const comparison = where.startsWith("comparedTo");
      if (comparison) {
        const others = trek.comparedTo
          .map((c) => TREK_PAGES.find((t) => t.id === c.otherTrekId))
          .filter(Boolean);
        if (others.some((o) => cited <= (o as { maxAltitudeM: number }).maxAltitudeM + 300)) {
          continue;
        }
      }
      fail(
        trek.id,
        "altitude-never-reached",
        `${where} cites ${cited} m, and this route never goes above ${trek.maxAltitudeM} m`,
      );
    }

    /*
     * The month table is allowed its comparatives.
     *
     * A superlative is marketing when its subject is the trek and information
     * when its subject is a month: "the best trek in Nepal" sells, "the best
     * visibility of the year" is the answer the reader came for. The section
     * already carries `rating: "best"` as a field, so ranking months against
     * each other is what it is for, and a rule that forbade the word here
     * would only make the table say less than its own data.
     *
     * Everywhere else on the page the ban stands, superlatives included.
     */
    const ranksAMonth = MONTH_NAME.includes(where);
    for (const word of BANNED_ADJECTIVES) {
      if (ranksAMonth && word.toLowerCase() === "best") continue;
      if (text.toLowerCase().includes(word.toLowerCase())) {
        fail(trek.id, "marketing-adjective", `${where} uses "${word}"`);
      }
    }
  }

  /* ------------------------------------------------------ the two spines */

  if (trek.notForYouIf.length < 3) {
    fail(
      trek.id,
      "thin-disqualifiers",
      `${trek.notForYouIf.length} reasons not to book this — an operator that cannot say who a trek is wrong for is selling`,
    );
  }
  for (const [i, line] of trek.notForYouIf.entries()) {
    if (line.trim().length < 30) {
      fail(trek.id, "thin-disqualifiers", `notForYouIf[${i}] is too short to be a real one`);
    }
  }
  /*
   * The decay this watches for is the empty hedge.
   *
   * This started as an allow-list of concrete words — altitude, days, budget —
   * and it failed eight disqualifiers that were entirely concrete, because no
   * word list can anticipate "you want a famous name to take home" or "you are
   * uneasy on an exposed ridge in weather". An allow-list of good words does
   * not measure honesty; it measures vocabulary, and prose edited to satisfy a
   * vocabulary is prose edited away from what is true.
   *
   * So the rule names the failure instead. These are the phrasings a real
   * disqualifier turns into when someone softens it: sentences that disqualify
   * nobody and could be appended to any trek on the site.
   */
  const HEDGES = [
    "not for everyone",
    "may not be for everyone",
    "might not be for everyone",
    "not suitable for all",
    "not for all fitness levels",
    "isn't for everybody",
    "is not for everybody",
    "requires a certain level",
    "some people may find",
    "should be considered carefully",
    "please consider whether",
  ];
  for (const [i, line] of trek.notForYouIf.entries()) {
    for (const hedge of HEDGES) {
      if (line.toLowerCase().includes(hedge)) {
        fail(
          trek.id,
          "vague-disqualifier",
          `notForYouIf[${i}] says "${hedge}", which disqualifies nobody and would fit any trek on the site`,
        );
      }
    }
  }

  if (trek.comparedTo.length < 2) {
    fail(trek.id, "thin-comparisons", `${trek.comparedTo.length} comparisons, fewer than 2`);
  }
  const seenOthers = new Set<string>();
  for (const [i, c] of trek.comparedTo.entries()) {
    if (!ids.has(c.otherTrekId)) {
      fail(trek.id, "bad-comparison", `comparedTo[${i}] names "${c.otherTrekId}", which is not a trek`);
    }
    if (c.otherTrekId === trek.id) {
      fail(trek.id, "bad-comparison", `comparedTo[${i}] compares the trek with itself`);
    }
    if (seenOthers.has(c.otherTrekId)) {
      fail(trek.id, "bad-comparison", `compared with "${c.otherTrekId}" twice`);
    }
    seenOthers.add(c.otherTrekId);

    if (c.chooseOtherIf.trim().length < 40) {
      fail(
        trek.id,
        "one-sided-comparison",
        `comparedTo[${i}] gives ${c.chooseOtherIf.trim().length} characters of reason to choose the other trek — that is a hedge, not a comparison`,
      );
    }
    /*
     * The failure mode this exists for: both sides concluding "choose this".
     * A reason to pick the other trek that names this one favourably is a
     * reason to pick this one wearing the wrong label.
     */
    const other = TREK_PAGES.find((t) => t.id === c.otherTrekId);
    if (other && c.chooseOtherIf.includes(trek.name) && !c.chooseOtherIf.includes(other.name)) {
      fail(
        trek.id,
        "one-sided-comparison",
        `comparedTo[${i}] argues for "${trek.name}" in the half that should argue for "${other.name}"`,
      );
    }
  }

  /* ------------------------------------------------------------ the table */

  const seenMonths = new Set(trek.seasonality.map((m) => m.month));
  for (let month = 1; month <= 12; month += 1) {
    if (!seenMonths.has(month)) {
      fail(trek.id, "missing-month", `${MONTH_NAME[month - 1]} has no entry`);
    }
  }
  if (trek.seasonality.length !== 12) {
    fail(trek.id, "missing-month", `${trek.seasonality.length} entries, not 12`);
  }
  for (const m of trek.seasonality) {
    if (m.note.trim().length < 30) {
      fail(
        trek.id,
        "thin-month",
        `${MONTH_NAME[m.month - 1]} says almost nothing — the month table is the point of the page`,
      );
    }
  }
  /*
   * Monsoon is real and a calendar with no bad months is a calendar nobody
   * needs. Every route in Nepal has at least one month worth avoiding.
   */
  if (!trek.seasonality.some((m) => m.rating === "avoid")) {
    fail(
      trek.id,
      "no-bad-months",
      "twelve months and not one to avoid — monsoon happens to every route in Nepal",
    );
  }

  /* ------------------------------------------------------------- numbers */

  if (trek.highestSleepM > trek.maxAltitudeM) {
    fail(
      trek.id,
      "altitude-contradiction",
      `sleeps at ${trek.highestSleepM} m but claims a maximum of ${trek.maxAltitudeM} m`,
    );
  }
  const [minDays, maxDays] = trek.typicalDays;
  if (minDays > maxDays) fail(trek.id, "bad-days", `typicalDays is ${minDays}-${maxDays}`);

  const dates = departures.filter((d) => d.trekId === trek.id);
  for (const d of dates) {
    if (d.maxAltitudeM !== trek.maxAltitudeM) {
      fail(
        trek.id,
        "altitude-drift",
        `${d.id} reaches ${d.maxAltitudeM} m but the trek page says ${trek.maxAltitudeM} m`,
      );
    }
    if (d.days < minDays || d.days > maxDays) {
      fail(
        trek.id,
        "days-drift",
        `${d.id} is ${d.days} days, outside the stated ${minDays}-${maxDays}`,
      );
    }
  }
  if (!trek.permitsRequired.length) {
    fail(trek.id, "no-permits", "no permits listed — every route in Nepal needs at least one");
  }

  /*
   * A date that did not run has to be on its trek's page.
   *
   * This is the assertion the archive exists for. Deleting a cancelled
   * departure is the easiest thing in the world to do quietly — it removes an
   * embarrassment and nothing on the site contradicts it afterwards — and the
   * published minimum is worth exactly nothing if the times it was not met can
   * disappear. So the archive is derived from the same lifecycle function the
   * departure pages use, and every cancelled date must appear in it.
   */
  const cancelled = dates.filter((d) => lifecycle(d) === "cancelled");
  const archived = cancelledFor(trek.id).map((c) => c.departure.id);
  for (const d of cancelled) {
    if (!archived.includes(d.id)) {
      fail(
        trek.id,
        "missing-from-archive",
        `${d.id} was cancelled and is absent from this trek's archive`,
      );
    }
  }
  for (const c of cancelledFor(trek.id)) {
    if (c.minimum <= c.booked) {
      fail(
        trek.id,
        "incoherent-archive",
        `${c.departure.id} is archived as not run with ${c.booked} booked against a minimum of ${c.minimum}`,
      );
    }
    if (!c.decidedOn) {
      fail(trek.id, "incoherent-archive", `${c.departure.id} has no decision date`);
    }
  }
}

/* ------------------------------------------------------------------ report */

console.log("\n  Trek pages\n");
console.log(`  ok    ${TREK_PAGES.length} treks, every departure resolves to one`);
console.log(
  `  ok    ${TREK_PAGES.reduce((n, t) => n + t.notForYouIf.length, 0)} stated disqualifiers, ${TREK_PAGES.reduce((n, t) => n + t.comparedTo.length, 0)} two-sided comparisons`,
);
console.log(
  `  ok    ${TREK_PAGES.length * 12} months rated, ${TREK_PAGES.reduce((n, t) => n + t.seasonality.filter((m) => m.rating === "avoid").length, 0)} of them "avoid"`,
);

if (problems.length) {
  console.log("\n  Problems:");
  const seen = new Set<string>();
  for (const p of problems) {
    const line = `    [${p.rule}] ${p.id}: ${p.detail}`;
    if (seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
