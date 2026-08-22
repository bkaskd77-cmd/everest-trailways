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
import { PLACES } from "../src/content/places.ts";
import { TREK_NAMED_PLACES } from "../src/content/cost-sheets.ts";
import { costSheetPdf, pdfLedgerTotal } from "../src/lib/cost-sheet-pdf.ts";
import { departureJsonLd } from "../src/lib/departures-feed.ts";
import {
  RETURN_POINTS,
  bookableDepartures,
  departures,
  isBookable,
  isIndexable,
  lifecycle,
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

  const margin = included.find((l) => l.id === "fee");
  if (!margin) {
    fail(id, "no-fee", "the company fee is not published as its own line");
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

  /* ------------------------------------------------ basis and arithmetic */

  /*
   * The basis and the amount have to agree, and the arithmetic has to be
   * reproducible.
   *
   * The accommodation line said "$114" and "per day" beside each other when
   * $114 was three nights at $38. Nobody was misled about the total, but a
   * reader auditing us hit an internal contradiction on the second row, which
   * is worse than a wrong number — it tells them the sheet was not read by
   * anyone who cared.
   */
  for (const line of costSheet.lines) {
    const hasUnits =
      line.unitAmountUSD !== undefined && line.unitCount !== undefined;

    if (line.basis === "per-day" && !hasUnits) {
      fail(
        id,
        "basis-mismatch",
        `"${line.label}" is billed per day but carries no unit rate or count, so its amount cannot be checked`,
      );
    }
    if (line.basis === "per-group" && line.dividedBy === undefined) {
      fail(
        id,
        "basis-mismatch",
        `"${line.label}" is a divided group cost but does not say what it is divided by`,
      );
    }
    if (hasUnits && !line.unitLabel) {
      fail(
        id,
        "basis-mismatch",
        `"${line.label}" has a unit count but no unit`,
      );
    }

    // Re-derive it. Rounding is to the dollar, so allow exactly that much.
    if (hasUnits) {
      const gross = line.unitAmountUSD! * line.unitCount!;
      const expected = Math.round(gross / (line.dividedBy ?? 1));
      if (Math.abs(expected - line.amountUSD) > 1) {
        fail(
          id,
          "arithmetic",
          `"${line.label}" states ${line.unitAmountUSD} x ${line.unitCount}${line.dividedBy ? ` / ${line.dividedBy}` : ""} = $${expected}, but the amount is $${line.amountUSD}`,
        );
      }
    }
  }

  /* ------------------------------------------------- the Ramechhap claim */

  /*
   * A departure that charges for a Ramechhap transfer says on the page that
   * peak season applies to it. That was asserted rather than checked, and it
   * was wrong: the March Everest date fell outside the months the note named.
   * A cost sheet that contradicts its own dataset is the exact failure this
   * section exists to argue against, so the claim is now derived from the
   * departure date.
   *
   * Ramechhap operations run roughly mid-March to May and October to November.
   */
  const RAMECHHAP_MONTHS = [2, 3, 4, 9, 10];
  const ramechhap = costSheet.lines.find((l) => /Ramechhap/i.test(l.label));
  if (ramechhap) {
    const month = new Date(d.departsOn).getUTCMonth();
    if (!RAMECHHAP_MONTHS.includes(month)) {
      fail(
        id,
        "ramechhap-claim",
        `charges for a Ramechhap transfer but departs ${d.departsOn}, outside the season the note claims`,
      );
    }
  }

  /* -------------------------------------------------- shared cost policy */

  const divided = costSheet.lines.filter((l) => l.dividedBy !== undefined);
  if (divided.length > 0 && !costSheet.sharedCostPolicy) {
    fail(
      id,
      "no-shared-policy",
      "shared costs are divided at the group cap and nothing says what happens when the group is smaller",
    );
  }

  /* ------------------------------------------------------ optional extras */

  if (d.singleSupplementUSD > 0) {
    const match = costSheet.optionalExtras.find(
      (e) => e.amountUSD === d.singleSupplementUSD,
    );
    if (!match) {
      fail(
        id,
        "supplement-missing",
        `the card advertises a $${d.singleSupplementUSD} single supplement and no optional extra matches it`,
      );
    }
  }
  for (const extra of costSheet.optionalExtras) {
    if (!Number.isInteger(extra.amountUSD) || extra.amountUSD <= 0) {
      fail(id, "bad-extra", `"${extra.label}" is $${extra.amountUSD}`);
    }
  }

  /* --------------------------------------------- the admin split is honest */

  /*
   * "Margin" bundled three genuine costs with the profit and then gave the
   * total the least flattering name available. Each of these has to exist
   * separately so the fee can be small and honest rather than large and vague.
   */
  for (const required of [
    "reserve",
    "guarantee-reserve",
    "licences",
    "office",
    "fee",
  ]) {
    if (!costSheet.lines.some((l) => l.id === required && l.included)) {
      fail(
        id,
        "admin-not-split",
        `the operating block has no "${required}" line — it must not be one bundled figure`,
      );
    }
  }

  const feeLine = costSheet.lines.find((l) => l.id === "fee");
  if (feeLine && /margin/i.test(feeLine.label)) {
    fail(
      id,
      "admin-not-split",
      "the fee line is called margin again, which is a word that means several things",
    );
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

  /* ------------------------------------------------ the intro names real lines */

  /*
   * The section's opening sentence says the sheet runs "from X to Y", naming
   * two lines. It used to name the porters' day rate on every departure,
   * including the ones with no porters. Copy that cites a line has to be built
   * from the lines.
   */
  const introSource = costSheet.lines.filter((l) => l.included);
  if (introSource.length < 2) {
    fail(id, "intro-unsupported", "too few lines to describe the sheet");
  } else {
    const beforeAdmin = introSource.filter((l) => l.category !== "admin");
    if (!beforeAdmin.length) {
      fail(
        id,
        "intro-unsupported",
        "every line is an operating line, so the intro has nothing real to point at",
      );
    }
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

/* ------------------------------------------------- gallery, detail and faq */

/*
 * The sections that answer what a first-timer is actually asking.
 *
 * Each rule here exists because the obvious version of the section fails in a
 * specific way: a gallery of six summits, practicalities with the awkward field
 * left blank, an FAQ of easy questions, or answers that quote a price the cost
 * sheet on the same page contradicts.
 */
const PRACTICALITY_FIELDS = [
  "accommodation",
  "roomSharing",
  "toilets",
  "showers",
  "food",
  "dietary",
  "water",
  "electricity",
  "signal",
  "luggage",
  "laundry",
] as const;

for (const d of departures) {
  const { id } = d;

  /* ------------------------------------------------------------ gallery */

  if (d.gallery.length < 6) {
    fail(id, "thin-gallery", `${d.gallery.length} images, fewer than 6`);
  }
  // The whole argument of the gallery. Operators publish summits; the two
  // questions people are too embarrassed to ask are what the room is like and
  // what is on the plate.
  for (const required of ["accommodation", "food"] as const) {
    if (!d.gallery.some((image) => image.category === required)) {
      fail(
        id,
        "gallery-missing-basics",
        `no "${required}" image — a gallery of scenery answers the question nobody asked`,
      );
    }
  }
  /*
   * A photograph needs alt text. A pending slot does not — it renders as a
   * captioned panel whose accessible name is the caption, so alt would be a
   * second copy of it.
   *
   * The pending count is reported rather than failed. Eight of the nineteen
   * images this site was built with turned out to show something other than
   * their caption, including a house cat filed as a teahouse room, and the
   * honest state until real photography exists is a visible gap. What must
   * never happen is the gap being filled with something approximate, which is
   * why there is no rule here that could be satisfied by doing that.
   */
  for (const image of d.gallery) {
    if (image.src && !image.alt.trim()) {
      fail(id, "gallery-no-alt", `${image.src} has no alt`);
    }
    if (!image.src && image.alt.trim()) {
      fail(
        id,
        "gallery-stray-alt",
        `"${image.caption.slice(0, 40)}" has alt text but no photograph`,
      );
    }
    if (image.caption.trim().length < 20) {
      fail(id, "gallery-thin-caption", `"${image.caption}" is not a caption`);
    }
  }

  /* ------------------------------------------------------------- coords */

  for (const day of d.itinerary) {
    if (!day.coords) {
      fail(
        id,
        "no-coords",
        `day ${day.day} sleeps at "${day.toPlace}", which has no entry in PLACES, so the route map cannot draw it`,
      );
      continue;
    }
    const [lat, lon] = day.coords;
    // Nepal, generously bounded. Catches a transposed pair immediately.
    if (lat < 26 || lat > 31 || lon < 80 || lon > 89) {
      fail(
        id,
        "bad-coords",
        `day ${day.day} at "${day.toPlace}" is at ${lat}, ${lon}, which is not in Nepal`,
      );
    }
  }

  /* ---------------------------------------------------- practicalities */

  if (!d.practicalities) {
    fail(id, "no-practicalities", "nothing published about what it is like");
  } else {
    for (const field of PRACTICALITY_FIELDS) {
      const value = d.practicalities[field];
      if (!value?.trim()) {
        fail(id, "practicalities-gap", `"${field}" is empty`);
      } else if (value.trim().length < 40) {
        fail(
          id,
          "practicalities-thin",
          `"${field}" is ${value.trim().length} characters — too short to be an honest answer`,
        );
      }
    }
    const prose = Object.values(d.practicalities).join(" ").toLowerCase();
    for (const word of BANNED_ADJECTIVES) {
      if (prose.includes(word.toLowerCase())) {
        fail(
          id,
          "marketing-adjective",
          `practicalities use "${word}" — the point of this section is that it does not`,
        );
      }
    }
  }

  /* ---------------------------------------------------------------- faq */

  if (d.faqs.length < 8) {
    fail(id, "thin-faq", `${d.faqs.length} questions, fewer than 8`);
  }

  const faqQuestions = new Set<string>();
  for (const faq of d.faqs) {
    if (faqQuestions.has(faq.question)) {
      fail(id, "duplicate-faq", `"${faq.question}" appears twice`);
    }
    faqQuestions.add(faq.question);
    if (!faq.question.trim().endsWith("?")) {
      fail(id, "bad-faq", `"${faq.question}" is not a question`);
    }
    if (faq.answer.trim().length < 60) {
      fail(id, "thin-answer", `the answer to "${faq.question}" is too short`);
    }
  }

  // The uncomfortable ones, which are the reason the section is worth having.
  const asked = [...faqQuestions].join(" ").toLowerCase();
  for (const [topic, needle] of [
    ["keeping up", "keep up"],
    ["altitude sickness", "altitude sickness"],
    ["the group", "group"],
    ["leaving early", "leave early"],
    ["the guide's licence", "licence"],
    ["a single room", "single room"],
    ["cancellation", "cancel"],
  ] as const) {
    if (!asked.includes(needle)) {
      fail(
        id,
        "faq-avoids-the-question",
        `nothing about ${topic} — an FAQ that only answers the comfortable ones is marketing`,
      );
    }
  }

  /*
   * The answers quote this date's numbers, so they can contradict the page.
   *
   * Every dollar figure in an answer is pulled back out and checked against the
   * departure. An FAQ saying the price is $1,890 on a page whose cost sheet
   * says $1,990 is worse than no FAQ: it is the same broken promise, in the
   * voice of somebody answering a worry.
   */
  const allowedFigures = new Set<number>([
    d.priceUSD,
    d.singleSupplementUSD,
    d.minimumToRun,
    d.maxAltitudeM,
    d.groupSizeMax,
    d.days,
    d.assistantGuideAbove ?? -1,
    d.costSheet.tipping.typicalRangeUSD[0],
    d.costSheet.tipping.typicalRangeUSD[1],
    ...d.costSheet.optionalExtras.map((e) => e.amountUSD),
  ]);

  for (const faq of d.faqs) {
    for (const match of faq.answer.matchAll(/\$([\d,]+)/g)) {
      const figure = Number(match[1].replace(/,/g, ""));
      if (!allowedFigures.has(figure)) {
        fail(
          id,
          "faq-contradiction",
          `an answer quotes $${figure}, which is not this departure's price, supplement, tipping range or any optional extra`,
        );
      }
    }
    if (
      faq.answer.includes(d.decisionDate) === false &&
      /decision date/i.test(faq.answer)
    ) {
      fail(
        id,
        "faq-contradiction",
        "an answer refers to a decision date it does not state",
      );
    }
  }
}

/* ---------------------------------------------------------- lifecycle */

/*
 * A date that cannot be bought must not look like one that can.
 *
 * One departure passed its decision date three bookings short, everybody was
 * refunded, and its page stayed live: indexed, priced, with a full cost sheet
 * and an in-stock offer. That is worse than an ordinary stale page. The whole
 * argument of this site is that a published minimum is a real threshold, and a
 * cancelled date still advertising itself makes the threshold look decorative.
 *
 * The page stays reachable — deleting it would be the dishonest fix, and a date
 * that did not fill is the best evidence the guarantee is real. It just stops
 * pretending to be for sale.
 */
for (const d of departures) {
  const state = lifecycle(d, now);
  const jsonLd = departureJsonLd(d, "https://everest-trailways.vercel.app");
  const offer = (jsonLd as { offers?: { availability?: string } }).offers;

  if (state === "cancelled" && offer) {
    fail(
      d.id,
      "cancelled-offer",
      "a cancelled departure still emits an Offer — there is no price at which it can be bought",
    );
  }
  if (state !== "open" && offer?.availability?.includes("InStock")) {
    fail(
      d.id,
      "stale-instock",
      `lifecycle is "${state}" but the structured data says InStock`,
    );
  }
  if (
    !isIndexable(d, now) &&
    !["cancelled", "departed", "completed"].includes(state)
  ) {
    fail(
      d.id,
      "lifecycle",
      `"${state}" is neither indexable nor accounted for`,
    );
  }
  if (isBookable(d, now) !== (state === "open")) {
    fail(d.id, "lifecycle", "isBookable disagrees with the lifecycle");
  }
}

/*
 * And nothing that lists departures for sale may include one that is not.
 *
 * Checked against the module the pages actually use rather than against the
 * pages, so a new grid built on `bookableDepartures` inherits the rule and a
 * new grid built on `departures` fails the moment a date lapses.
 */
for (const d of bookableDepartures(now)) {
  if (lifecycle(d, now) !== "open") {
    fail(
      d.id,
      "bookable-listing",
      "appears in the bookable set but is not open",
    );
  }
}

const listings = [
  "src/components/departures/featured-departures.tsx",
  "src/components/departure/departure-index.tsx",
  // The index page's structured data is a listing too: it tells a machine what
  // is on the page, and it was describing nineteen trips on a page showing
  // seventeen.
  "src/app/departures/page.tsx",
];
for (const listing of listings) {
  const source = await readFile(path.join(process.cwd(), listing), "utf8");
  /*
   * Imports do not count.
   *
   * This looked for the name anywhere in the file, which an unused import
   * satisfies — deleting the filter and leaving the import behind passed the
   * check. The mutation test caught it. Import lines are stripped before the
   * file is searched, so the name has to be used.
   */
  const body = source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];$/gm, "");
  if (!/bookableDepartures\(|isBookable\(/.test(body)) {
    fail(
      "section",
      "bookable-listing",
      `${listing} lists departures without filtering to the bookable ones`,
    );
  }
}

/* ------------------------------------------------- regional boilerplate */

/*
 * No sentence may name a place that is not this departure's.
 *
 * Three Everest strings were rendering on an Annapurna page: charging priced
 * "above Namche", a contingency intro about "the road to Ramechhap", and an
 * insurance note calling a cancelled Lukla flight not a medical event. None of
 * those places is on that trek. Each had been written once for Everest and
 * reused as shared prose, which is the same fault as the Ramechhap season claim
 * caught in step 7a — and shared prose that names a location will always leak,
 * because the sharing is the point and the naming is incompatible with it.
 *
 * So: gather every place name the site knows, gather what this departure may
 * legitimately name, and fail on the difference. A shared sentence can then
 * only survive by not naming anywhere.
 */
const KNOWN_PLACES = [
  ...Object.keys(PLACES),
  // Regions, ranges and gateways that are not overnight stops but do get named.
  "Lukla",
  "Ramechhap",
  "Manthali",
  "Khumbu",
  "Sagarmatha",
  "Everest",
  "Salleri",
  "Jiri",
  "Kala Patthar",
  "Annapurna",
  "Machhapuchhre",
  "Deurali",
  "Thorong",
  "Mardi",
  "Poon Hill",
  "Mustang",
  "Kali Gandaki",
  "Langtang",
  "Dhunche",
  "Beni",
  "Kande",
  "Nepalgunj",
  "Mugling",
  "Sundarijal",
  "Chitwan",
  "Bardia",
  "Karnali",
  "Rapti",
  "Terai",
  "Shivapuri",
  "Nagarjun",
  "Bhaktapur",
  "Changu Narayan",
  "Thamel",
  "Tharu",
  "Namche",
  "Gorakshep",
];

for (const d of departures) {
  const { id } = d;

  /* What this departure is allowed to say. */
  const allowed = new Set<string>();
  const allow = (text: string) => {
    for (const place of KNOWN_PLACES) {
      if (text.includes(place)) allowed.add(place);
    }
  };

  allow(d.region);
  allow(d.trekName);
  for (const day of d.itinerary) {
    allow(day.toPlace);
    allow(day.fromPlace ?? "");
    allow(day.title);
  }
  for (const place of TREK_NAMED_PLACES[d.trekId] ?? []) allowed.add(place);

  /*
   * Everything the page renders, in one bag.
   *
   * Cost-line labels and notes are included because that is where the transport
   * legs are described, and they are the most place-dense prose on the page.
   */
  const rendered: [string, string][] = [
    ["summary", d.summary],
    ...Object.entries(d.practicalities).map(
      ([field, value]) =>
        [`practicalities.${field}`, value] as [string, string],
    ),
    ...d.faqs.map(
      (faq, i) =>
        [`faq[${i}]`, `${faq.question} ${faq.answer}`] as [string, string],
    ),
    ...d.costSheet.contingencies.map(
      (c) =>
        [
          `contingency ${c.id}`,
          `${c.trigger} ${c.likelihood} ${c.whatWeDo} ${c.note ?? ""}`,
        ] as [string, string],
    ),
    ...d.costSheet.lines.map(
      (line, i) =>
        [
          `cost line ${line.id || i}`,
          `${line.label} ${line.note ?? ""} ${line.payableTo ?? ""}`,
        ] as [string, string],
    ),
    ...d.costSheet.optionalExtras.map(
      (extra) =>
        [`extra ${extra.id}`, `${extra.label} ${extra.note ?? ""}`] as [
          string,
          string,
        ],
    ),
    ...d.gallery.map(
      (image, i) => [`gallery[${i}]`, image.caption] as [string, string],
    ),
    ["tipping", d.costSheet.tipping.guidance],
    ["insurance", d.costSheet.insuranceRequirement.weatherDelayNote],
  ];

  for (const [where, text] of rendered) {
    for (const place of KNOWN_PLACES) {
      if (!text.includes(place)) continue;
      if (allowed.has(place)) continue;
      fail(
        id,
        "foreign-place",
        `${where} names "${place}", which is not on this trek — shared prose must not name a location`,
      );
    }
  }

  /* -------------------------------------------- altitudes never reached */

  /*
   * A sentence may not cite a height this departure does not go to.
   *
   * Poon Hill sleeps no higher than 2,874 m and tops out at 3,210 m, and its
   * page explained what happens to showers above 4,000 m, priced charging
   * "above about 3,000 m", and said lodge wifi exists "higher up". All three
   * were shared prose carrying a threshold from a bigger trek — the same fault
   * as the place names caught in 8a, wearing a number instead of a village.
   *
   * The rule is the same shape: a threshold may only be mentioned by a
   * departure that crosses it. A little headroom is allowed, because "common
   * above 3,000 m" is a fact about altitude illness rather than a claim about
   * this route, and refusing it would push a genuine safety sentence off the
   * page.
   */
  const CONTEXT_ALLOWANCE_M = 300;
  const altitudeClaim = /\b([1-9][,.]?\d{3})\s?m\b/g;

  for (const [where, text] of rendered) {
    for (const match of text.matchAll(altitudeClaim)) {
      const cited = Number(match[1].replace(/[,.]/g, ""));
      // Below 2,000 m is a distance or a village height, not a threshold.
      if (cited < 2000) continue;
      if (cited <= d.maxAltitudeM + CONTEXT_ALLOWANCE_M) continue;
      fail(
        id,
        "altitude-never-reached",
        `${where} cites ${cited} m, and this trek never goes above ${d.maxAltitudeM} m`,
      );
    }
  }

  /* ------------------------------------------------ staff who are not paid */

  /*
   * A page may not promise a role the cost sheet does not fund.
   *
   * Two FAQ answers promised an assistant guide on every departure — "the
   * assistant guide walks with you", "an assistant guide goes down with you so
   * the group continues" — including departures whose staff lines are a guide,
   * porters and insurance and nothing else. Promising staff that nobody is paid
   * for is the same error as quoting a price the ledger does not reach, made in
   * the section where somebody is asking what happens if they cannot cope.
   */
  const STAFF_ROLES: [string, RegExp, string][] = [
    ["assistant guide", /assistant guide/i, "staff-assistant"],
    ["porter", /\bporters?\b/i, "staff-porter"],
  ];

  for (const [role, mention, lineId] of STAFF_ROLES) {
    const funded = d.costSheet.lines.some(
      (line) => line.included && line.id === lineId,
    );
    if (funded) continue;
    for (const [where, text] of rendered) {
      // A sentence saying there is no such person is not a promise of one.
      if (!mention.test(text)) continue;
      if (
        /no (?:second guide|assistant|porters?)|one guide on this trip|there are no porters/i.test(
          text,
        )
      ) {
        continue;
      }
      fail(
        id,
        "unfunded-staff",
        `${where} mentions a ${role}, and no ${lineId} line pays for one`,
      );
    }
  }

  /* ------------------------------------------------ sleeping vs maximum */

  /*
   * The two altitudes are different numbers and the page must not swap them.
   * A contingency said "this trek sleeps as high as 4,500 m" on a trek whose
   * highest night is 3,580 m; 4,500 m is a viewpoint you walk up to and come
   * back down from. That is the exact confusion the altitude profile exists to
   * prevent, printed in the section that exists to answer it.
   */
  const highestSleep = Math.max(
    ...d.itinerary.map((day) => day.sleepAltitudeM),
  );
  const sleepClaim = /sleeps? (?:as high as|no higher than|at) ([\d,]+) ?m/gi;

  for (const [where, text] of rendered) {
    for (const match of text.matchAll(sleepClaim)) {
      const claimed = Number(match[1].replace(/,/g, ""));
      if (claimed !== highestSleep) {
        fail(
          id,
          "altitude-confusion",
          `${where} says the trek sleeps at ${claimed} m; the highest night is ${highestSleep} m${claimed === d.maxAltitudeM ? " — that is the day maximum, not a sleeping altitude" : ""}`,
        );
      }
    }
  }

  /* ------------------------------------------------------- single rooms */

  /*
   * One fact, three sentences. Practicalities, the optional extras table and
   * the FAQ all described the single room and disagreed: an option that did not
   * exist, no extra listed, and a room said to be included in the price.
   */
  const hasSingle = d.singleSupplementUSD > 0;
  const singleExtra = d.costSheet.optionalExtras.find(
    (e) => e.id === "single-room",
  );
  const roomText = d.practicalities.roomSharing;
  const singleFaq = d.faqs.find((f) => /single room/i.test(f.question));

  if (hasSingle && !singleExtra) {
    fail(
      id,
      "single-room-contradiction",
      "there is a single supplement but no single-room optional extra",
    );
  }
  if (!hasSingle && singleExtra) {
    fail(
      id,
      "single-room-contradiction",
      "a single-room extra is listed but singleSupplementUSD is 0",
    );
  }
  if (!hasSingle && /unless you take the single room option/i.test(roomText)) {
    fail(
      id,
      "single-room-contradiction",
      "practicalities offer a single-room option on a departure that has none",
    );
  }
  if (hasSingle && /no single supplement/i.test(roomText)) {
    fail(
      id,
      "single-room-contradiction",
      `practicalities say there is no single supplement, but it is $${d.singleSupplementUSD}`,
    );
  }
  if (singleFaq) {
    const saysIncluded = /is included in the/i.test(singleFaq.answer);
    if (hasSingle && saysIncluded) {
      fail(
        id,
        "single-room-contradiction",
        "the FAQ says a single room is included when it costs extra",
      );
    }
    if (
      !hasSingle &&
      !saysIncluded &&
      !/no single supplement/i.test(singleFaq.answer)
    ) {
      fail(
        id,
        "single-room-contradiction",
        "the FAQ does not say the single room is included on a departure with no supplement",
      );
    }
  }

  /* ------------------------------------------------ punctuation and units */

  for (const [where, text] of rendered) {
    if (/[.!?]\s*[.!?]/.test(text)) {
      fail(
        id,
        "double-punctuation",
        `${where} has doubled punctuation — a stored sentence was concatenated with a template that added its own stop`,
      );
    }
    // "walking 4-7 a day" — the unit went missing between the field and the
    // sentence that used it.
    if (/\d\s*[-–]\s*\d\s+a day/.test(text)) {
      fail(
        id,
        "missing-unit",
        `${where} states a range "a day" with no unit — hours, kilometres, something`,
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
    `\n  ${departures.length} departures · ${departures.reduce((n, d) => n + d.costSheet.lines.length, 0)} cost lines, every ledger balances to the dollar · ${departures.reduce((n, d) => n + d.costSheet.contingencies.length, 0)} contingencies published · ${new Set(departures.flatMap((d) => d.gallery.filter((i) => !i.src).map((i) => i.caption))).size} gallery slots awaiting real photography · feed shape ok · no problems\n`,
  );
}
