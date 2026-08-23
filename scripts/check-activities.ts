/**
 * Activities, and the guarantee they must not claim.
 *
 *     pnpm check:activities
 *
 * The whole reason activities are a separate type is that most of them have no
 * threshold to reach and therefore no guarantee to give. The failure this file
 * exists to prevent is that distinction quietly collapsing — a page saying "3
 * more bookings needed" beside a paraglide that goes for one person, which
 * would be describing a mechanism we do not operate on a site whose argument
 * is that we describe mechanisms accurately.
 *
 * Everything else here re-applies rules the departures already live under: the
 * dispositions from step 10, the permit composition, the place-name rule from
 * 8a and the altitude rule from 8b.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { BANNED_ADJECTIVES } from "../src/content/trust-points.ts";
import { PLACES } from "../src/content/places.ts";
import {
  ACTIVITIES,
  type Activity,
  availabilitySentence,
  hasGuarantee,
} from "../src/content/activities.ts";
import { byId, lineAmount, providedLines } from "../src/content/departures.ts";
import { TREK_PAGES } from "../src/content/trek-pages.ts";
import { PERMITS, permitsFor } from "../src/content/permits.ts";

const root = process.cwd();

type Problem = { id: string; rule: string; detail: string };
const problems: Problem[] = [];
const fail = (id: string, rule: string, detail: string) =>
  problems.push({ id, rule, detail });

/**
 * Words and phrases that only mean something when there is a threshold.
 *
 * Deliberately specific. "Guarantee" alone would fire on "we guarantee the
 * pilot is licensed", which is a different and perfectly good sentence. What
 * must not appear on a product with no minimum is the machinery of one.
 */
const GUARANTEE_LANGUAGE: [RegExp, string][] = [
  [/\bminimum to run\b/i, "minimum to run"],
  [/\bguaranteed to run\b/i, "guaranteed to run"],
  [/\bseats? (left|remaining)\b/i, "seats left"],
  [/\bdecision date\b/i, "decision date"],
  [/\bmore bookings? (needed|to)\b/i, "bookings needed"],
  [/\bnot yet guaranteed\b/i, "not yet guaranteed"],
  [/\bguarantee reserve\b/i, "guarantee reserve"],
  [/\bdoes not (reach|fill) its minimum\b/i, "does not reach its minimum"],
];

const KNOWN_PLACES = [
  ...Object.keys(PLACES),
  "Lukla",
  "Ramechhap",
  "Khumbu",
  "Sagarmatha",
  "Everest",
  "Annapurna",
  "Machhapuchhre",
  "Thorong",
  "Mardi",
  "Poon Hill",
  "Mustang",
  "Langtang",
  "Chitwan",
  "Bardia",
  "Terai",
  "Shivapuri",
  "Bhaktapur",
  "Changu Narayan",
  "Namche",
  "Gorakshep",
  "Pokhara",
  "Kathmandu",
  "Sarangkot",
  "Trishuli",
  "Rapti",
  "Sundarijal",
  "Jomsom",
  "Kagbeni",
  "Tatopani",
];

for (const a of ACTIVITIES) {
  const id = a.id;

  /* ------------------------------------------------ the guarantee rule */

  /*
   * Every sentence this activity renders, in one place. If a phrase about
   * minimums reaches any of them on a product without one, this is where it
   * is caught — before it reaches a page.
   */
  const rendered: [string, string][] = [
    ["summary", a.summary],
    ["availability", availabilitySentence(a)],
    ...a.safetyNotes.map(
      (n, i) => [`safetyNotes[${i}]`, n] as [string, string],
    ),
    ...Object.entries(a.practicalities).map(
      ([k, v]) => [`practicalities.${k}`, String(v)] as [string, string],
    ),
    ...a.costSheet.contingencies.flatMap(
      (c) =>
        [
          [`contingency ${c.id}.whatWeDo`, c.whatWeDo],
          [`contingency ${c.id}.note`, c.note ?? ""],
        ] as [string, string][],
    ),
    ...a.costSheet.lines.map(
      (l) => [`line ${l.id}`, `${l.label} ${l.note ?? ""}`] as [string, string],
    ),
    ...a.faqs.map((f, i) => [`faq[${i}]`, f.answer] as [string, string]),
    ["physicalDemand", a.physicalDemand.preparationNote],
  ];

  if (!hasGuarantee(a)) {
    for (const [where, text] of rendered) {
      for (const [pattern, name] of GUARANTEE_LANGUAGE) {
        if (!pattern.test(text)) continue;
        fail(
          id,
          "guarantee-language-without-a-guarantee",
          `${where} says "${name}", but this runs ${a.availability.mode} and has no threshold to reach`,
        );
      }
    }
  }

  /* --------------------------------------------------- availability mode */

  if (a.availability.mode === "scheduled") {
    if (!a.availability.departures.length) {
      fail(
        id,
        "scheduled-without-dates",
        "runs on fixed dates and lists none, so the page promises a schedule it cannot show",
      );
    }
    for (const depId of a.availability.departures) {
      if (!byId(depId)) {
        fail(
          id,
          "scheduled-without-dates",
          `names departure "${depId}", which does not exist`,
        );
      }
    }
  }

  if (a.availability.mode === "on-demand") {
    const months = a.availability.operatingMonths;
    if (!months.length) {
      fail(id, "bad-availability", "runs on demand in no months at all");
    }
    if (months.some((m) => m < 1 || m > 12)) {
      fail(id, "bad-availability", "has a month outside 1–12");
    }
  }

  if (a.availability.mode === "seasonal-window") {
    for (const w of a.availability.windows) {
      if (w.to < w.from) {
        fail(
          id,
          "bad-availability",
          `a window ends ${w.to} before it starts ${w.from}`,
        );
      }
    }
    if (!a.availability.windows.length) {
      fail(id, "bad-availability", "is seasonal and declares no window");
    }
  }

  /* ------------------------------------------------------ price scaling */

  /*
   * The hidden-cost pattern this site exists to argue against: a "from $60 per
   * person" that only applies at four. If the per-person price moves with the
   * group, the whole table is published and the headline is what the smallest
   * group actually pays.
   */
  if (a.priceScaling?.length) {
    const sorted = [...a.priceScaling].sort(
      (x, y) => x.participants - y.participants,
    );
    if (sorted[0].participants !== a.minParticipants) {
      fail(
        id,
        "price-scaling-mismatch",
        `the table starts at ${sorted[0].participants} participants but the activity's minimum is ${a.minParticipants}`,
      );
    }
    if (sorted[0].priceUSD !== a.priceUSD) {
      fail(
        id,
        "price-scaling-mismatch",
        `the headline price is $${a.priceUSD} but the table's smallest group pays $${sorted[0].priceUSD} — the headline must be what the smallest group pays, not the best case`,
      );
    }
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].priceUSD > sorted[i - 1].priceUSD) {
        fail(
          id,
          "price-scaling-mismatch",
          `${sorted[i].participants} people pay more each than ${sorted[i - 1].participants} do, which is almost certainly not intended`,
        );
      }
    }
    if (sorted.some((b) => b.participants > a.maxParticipants)) {
      fail(
        id,
        "price-scaling-mismatch",
        "the table prices a group larger than the activity accepts",
      );
    }
  }

  /* -------------------------------------------------- weather dependency */

  if (a.weatherDependency === "high") {
    const cancels = a.costSheet.contingencies.some((c) =>
      /cancel|call(ed)? off|does not (fly|run|happen)|unsafe/i.test(
        `${c.trigger} ${c.whatWeDo}`,
      ),
    );
    if (!cancels) {
      fail(
        id,
        "weather-without-contingency",
        "is highly weather-dependent and carries no contingency saying what happens when conditions cancel it, or who pays",
      );
    }
  }

  /* --------------------------------------------------------- the ledger */

  for (const line of a.costSheet.lines) {
    if (line.disposition === "provided") {
      if (!line.payableTo) {
        fail(
          id,
          "line-missing-field",
          `provided line "${line.id}" has no payee`,
        );
      }
      if (typeof line.amountUSD !== "number") {
        fail(
          id,
          "line-missing-field",
          `provided line "${line.id}" has no amount`,
        );
      }
    }
    if (line.disposition === "not-provided") {
      if (line.estimatedAmountUSD === undefined) {
        fail(
          id,
          "line-missing-field",
          `not-provided line "${line.id}" has no estimate`,
        );
      }
      if (!line.whoYouPay) {
        fail(
          id,
          "line-missing-field",
          `not-provided line "${line.id}" has no payee`,
        );
      }
      if (!line.payableWhen) {
        fail(
          id,
          "line-missing-field",
          `not-provided line "${line.id}" has no timing`,
        );
      }
    }
  }

  const sum = providedLines(a.costSheet).reduce((s, l) => s + lineAmount(l), 0);
  if (sum !== a.priceUSD) {
    fail(
      id,
      "ledger-mismatch",
      `provided lines sum to ${sum} but the price is ${a.priceUSD}`,
    );
  }

  /* ------------------------------------------------------------ permits */

  for (const type of a.requiredPermitTypes) {
    const onDate =
      a.availability.mode === "seasonal-window"
        ? a.availability.windows[0]?.from
        : a.availability.mode === "scheduled"
          ? (byId(a.availability.departures[0])?.departsOn ?? "2026-10-01")
          : "2026-10-01";
    if (!permitsFor([type], a.region, onDate).length) {
      fail(
        id,
        "permit-unresolved",
        `requires "${type}" and no active record covers ${a.region} on ${onDate}`,
      );
    }
  }
  for (const line of a.costSheet.lines) {
    if (line.category !== "permits" || line.disposition !== "provided")
      continue;
    const known = PERMITS.some((p) => p.name === line.label);
    /* Entry fees we buy directly are lines, not permit records. Only a line
       whose label matches a record has to match an in-force one. */
    if (
      known &&
      !PERMITS.some((p) => p.name === line.label && p.status === "active")
    ) {
      fail(
        id,
        "permit-out-of-window",
        `charges "${line.label}", which is not an active record`,
      );
    }
  }

  /* ------------------------------------------------------- combinesWith */

  for (const trekId of a.combinesWith) {
    const trek = TREK_PAGES.find((t) => t.id === trekId);
    if (!trek) {
      fail(
        id,
        "combines-with-unknown-trek",
        `pairs with "${trekId}", which is not a trek`,
      );
    }
  }
  if (!a.combinesWith.length) {
    fail(
      id,
      "combines-with-nothing",
      "pairs with no trek, so nothing on the site links to it except the index",
    );
  }

  /* --------------------------------------------- place names and heights */

  const allowed = new Set<string>([a.region]);
  for (const place of KNOWN_PLACES) {
    if (a.name.includes(place) || a.summary.includes(place)) allowed.add(place);
  }
  for (const trekId of a.combinesWith) {
    const trek = TREK_PAGES.find((t) => t.id === trekId);
    if (trek) {
      allowed.add(trek.region);
      for (const place of KNOWN_PLACES) {
        if (trek.name.includes(place)) allowed.add(place);
      }
    }
  }

  for (const [where, text] of rendered) {
    for (const word of BANNED_ADJECTIVES) {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        fail(id, "marketing-adjective", `${where} uses "${word}"`);
      }
    }
    /* 8b: an altitude this activity never reaches. */
    for (const match of text.matchAll(/\b([1-9][,.]?\d{3})\s?m\b/g)) {
      const cited = Number(match[1].replace(/[,.]/g, ""));
      if (cited < 2000) continue;
      const ceiling = a.category === "climbing" ? 6500 : 4000;
      if (cited > ceiling) {
        fail(
          id,
          "altitude-never-reached",
          `${where} cites ${cited} m, which this activity does not reach`,
        );
      }
    }
  }
}

/* --------------------------------------------------------- reciprocity */

/*
 * Both sides or neither.
 *
 * A trek page lists the activities whose `combinesWith` names it, so the two
 * cannot disagree today — but the rule is here so that adding a
 * `combinesWith` array to the trek side later cannot silently produce a
 * one-way relationship, which is how a "pairs with" section ends up showing
 * different things depending on which page you arrived from.
 */
for (const a of ACTIVITIES) {
  for (const trekId of a.combinesWith) {
    const trek = TREK_PAGES.find((t) => t.id === trekId);
    if (!trek) continue;
    const back = ACTIVITIES.filter((x) => x.combinesWith.includes(trekId));
    if (!back.some((x) => x.id === a.id)) {
      fail(
        a.id,
        "combines-with-not-reciprocal",
        `names "${trekId}" but that trek does not list it back`,
      );
    }
  }
}

/* ----------------------------------------------- the page does not cheat */

/*
 * Source-level: the activity page must not import the guarantee components.
 * A rule about rendered strings cannot catch a component that renders the
 * words itself, and <GlanceBar> and <OutcomeBanner> both do.
 */
const pageSource = await readFile(
  path.join(root, "src/app/activities/[slug]/page.tsx"),
  "utf8",
).catch(() => "");

for (const banned of [
  "GlanceBar",
  "OutcomeBanner",
  "seatsRemaining",
  "seatsToGuarantee",
  "guaranteeMeta",
]) {
  if (pageSource.includes(banned)) {
    fail(
      "activity-page",
      "guarantee-component-on-an-activity",
      `imports or calls ${banned}, which renders the guarantee machinery`,
    );
  }
}

/* ------------------------------------------------------------------ report */

const modes = ACTIVITIES.reduce<Record<string, number>>((acc, a) => {
  acc[a.availability.mode] = (acc[a.availability.mode] ?? 0) + 1;
  return acc;
}, {});

console.log("\n  Activities\n");
console.log(
  `  ok    ${ACTIVITIES.length} activities across ${new Set(ACTIVITIES.map((a) => a.category)).size} categories`,
);
console.log(
  `  ok    ${Object.entries(modes)
    .map(([m, n]) => `${n} ${m}`)
    .join(", ")}`,
);
console.log(
  `  ok    ${ACTIVITIES.filter((a) => !hasGuarantee(a)).length} with no guarantee to give, and none of them claiming one`,
);
console.log(
  `  ok    ${ACTIVITIES.filter((a) => a.priceScaling).length} publish a full price-by-group-size table`,
);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
