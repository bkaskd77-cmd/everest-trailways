import {
  departureStatus,
  departures,
  formatDate,
  formatDateRange,
  seatsToGuarantee,
  type Departure,
} from "../content/departures.ts";
import {
  MAX_MATCHES,
  type Beyond,
  type Match,
  type MatcherResult,
} from "./matcher-types.ts";

/**
 * The matcher that always works.
 *
 * Three things can go wrong with the assistant path: the API key is absent, the
 * API is down, or the model returns something that will not parse. In all three
 * the section must still do its job, because a broken panel on a page whose
 * entire argument is "we are the operator you can check" is worse than no panel
 * at all.
 *
 * So this is not a stub. It runs the same five questions, applies the same
 * refusals — it will not put someone who has flagged a heart condition on a
 * 5,400 m pass, and it will not take a booking — and it can only ever emit ids
 * that exist in the dataset, because it selects from the dataset. The guard
 * proves that last part by exercising it across every combination of answers.
 *
 * Imports are relative and carry their extensions so `pnpm check:matcher` can
 * run this file directly under Node's TypeScript stripping.
 */

export type Intent = "challenge" | "culture" | "wildlife" | "quiet";

/**
 * What each trek is actually for. Keyed by `trekId` rather than departure id so
 * a new date on an existing trek inherits it; the guard asserts every departure
 * in the dataset is covered and that no key here is stale.
 */
export const TREK_INTENT: Record<string, Intent[]> = {
  "everest-base-camp": ["challenge"],
  "annapurna-base-camp": ["challenge", "culture"],
  "annapurna-circuit": ["challenge", "culture"],
  "langtang-valley": ["quiet", "culture"],
  "upper-mustang": ["culture", "quiet"],
  "chitwan-safari": ["wildlife", "quiet"],
};

/**
 * Above this, altitude illness is a real risk for anyone and a serious one for
 * some. Used only to route people away from height when they have flagged a
 * condition — never to reassure anyone that a departure is safe for them.
 */
const MEDICAL_ALTITUDE_CEILING_M = 3000;

/**
 * How far behind the leader a departure may score and still be shown.
 *
 * Calibrated against the scores below: wrong month (-2 against +4) plus wrong
 * intent (0 against +3) is enough to drop a candidate, which is the case that
 * matters — someone who says October should not be shown a February trip
 * purely to round the list up to three.
 */
const SCORE_BAND = 5;

/**
 * How many near-misses to show under the matches.
 *
 * Two. This group exists so someone can see that the good option they half
 * expected was considered and ruled out, not so they can browse everything we
 * refused them — a long list of things that do not fit reads as a menu, which
 * is exactly the framing it must not have.
 */
const BEYOND_LIMIT = 2;

export type FallbackAnswers = {
  maxDays?: number;
  /** Zero-indexed months they can travel. */
  months?: number[];
  /** The highest they say they have been. */
  altitudeCeilingM?: number;
  fitness?: "light" | "full" | "trained";
  intent?: Intent;
  /** A trek they asked for by name. Matters most when we have to say no to it. */
  namedTrekId?: string;
  /** They have described a condition that makes altitude dangerous. */
  medicalConcern?: boolean;
  /** They have asked to book or to pay. We do neither here. */
  wantsToBook?: boolean;
  wantsCheapest?: boolean;
};

/* ------------------------------------------------------------ free text */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Conditions for which altitude is a documented risk. Deliberately broad and
 * deliberately blunt: a false positive costs a recommendation, a false negative
 * costs something we are not willing to spend.
 */
const MEDICAL_TERMS =
  /\b(heart|cardiac|cardio|angina|stent|bypass|pacemaker|arrhythmi|blood pressure|hypertens|lung|pulmonary|asthma|copd|emphysema|sickle|anaemi|anemi|pregnan|epilep|seizure|diabet|stroke|clot|embolis|apnoea|apnea)\w*/i;

const BOOKING_TERMS =
  /\b(book it|book me|just book|pay|payment|card details|credit card|deposit|charge me|checkout|reserve it)\b/i;

const CHEAPEST_TERMS = /\b(cheap(est)?|lowest price|least expensive|budget)\b/i;

/**
 * Treks people name directly. Ordered so the more specific pattern wins —
 * "annapurna circuit" must not be read as "annapurna base camp".
 */
const NAMED_TREKS: [string, RegExp][] = [
  ["annapurna-circuit", /\bannapurna circuit\b|\bcircuit\b|\bthorong\b/i],
  ["annapurna-base-camp", /\bannapurna\b|\babc\b|\bsanctuary\b/i],
  ["everest-base-camp", /\beverest\b|\bebc\b|\bkhumbu\b|\bbase camp\b/i],
  ["langtang-valley", /\blangtang\b/i],
  ["upper-mustang", /\bmustang\b|\blo manthang\b/i],
  ["chitwan-safari", /\bchitwan\b|\bsafari\b|\bterai\b/i],
];

const INTENT_TERMS: [Intent, RegExp][] = [
  [
    "challenge",
    /\b(challeng|hard|tough|push myself|difficult|strenuous|pass)\w*/i,
  ],
  [
    "culture",
    /\b(cultur|monaster|village|people|histor|heritage|temple|buddhis)\w*/i,
  ],
  [
    "wildlife",
    /\b(wildlife|animal|tiger|rhino|bird|jungle|safari|elephant)\w*/i,
  ],
  [
    "quiet",
    /\b(quiet|solitude|crowd|peaceful|remote|alone|off the beaten)\w*/i,
  ],
];

/**
 * Read what someone typed. Never guesses at anything it would be dangerous to
 * guess at — the medical flag is set on any hit and cleared by nothing.
 */
export function parseFreeText(text: string): FallbackAnswers {
  const t = text.toLowerCase();
  const answers: FallbackAnswers = {};

  const days = /(\d{1,2})\s*(?:-|–|to)?\s*(\d{1,2})?\s*days?\b/.exec(t);
  if (days) {
    const upper = days[2] ? Number(days[2]) : Number(days[1]);
    if (upper > 0 && upper < 60) answers.maxDays = upper;
  }
  if (/\b(a|one)\s+week\b/.test(t)) answers.maxDays = 7;
  if (/\btwo\s+weeks?\b|\bfortnight\b/.test(t)) answers.maxDays = 14;

  const months = MONTHS.map((m, i) =>
    t.includes(m.slice(0, 3)) ? i : -1,
  ).filter((i) => i >= 0);
  if (months.length) answers.months = months;

  const altitude = /(\d{3,5})\s*(?:,\d{3})?\s*m(?:etre|eter)?s?\b/.exec(
    t.replace(/,/g, ""),
  );
  if (altitude) {
    const value = Number(altitude[1]);
    if (value >= 100 && value <= 9000) answers.altitudeCeilingM = value;
  }
  if (/\bnever been (?:to )?(?:any )?(?:altitude|high)/.test(t)) {
    answers.altitudeCeilingM = answers.altitudeCeilingM ?? 0;
  }

  if (MEDICAL_TERMS.test(t)) answers.medicalConcern = true;
  if (BOOKING_TERMS.test(t)) answers.wantsToBook = true;
  if (CHEAPEST_TERMS.test(t)) answers.wantsCheapest = true;

  for (const [trekId, pattern] of NAMED_TREKS) {
    if (pattern.test(t)) {
      answers.namedTrekId = trekId;
      break;
    }
  }

  for (const [intent, pattern] of INTENT_TERMS) {
    if (pattern.test(t)) {
      answers.intent = intent;
      break;
    }
  }

  return answers;
}

/* -------------------------------------------------------------- the ladder */

export type FallbackQuestion = {
  id: keyof FallbackAnswers | "month";
  text: string;
  options: { label: string; patch: FallbackAnswers }[];
};

/** The five questions the section promises, in the order they earn their keep. */
export const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  {
    id: "maxDays",
    text: "How many days do you have on the ground in Nepal?",
    options: [
      { label: "Up to a week", patch: { maxDays: 7 } },
      { label: "Eight to twelve days", patch: { maxDays: 12 } },
      { label: "Two weeks or more", patch: { maxDays: 21 } },
    ],
  },
  {
    id: "month",
    text: "When are you thinking of travelling?",
    options: [
      { label: "October or November", patch: { months: [9, 10] } },
      { label: "February to April", patch: { months: [1, 2, 3] } },
      { label: "I am flexible", patch: { months: undefined } },
    ],
  },
  {
    id: "altitudeCeilingM",
    text: "What is the highest you have been?",
    options: [
      { label: "Never above 3,000 m", patch: { altitudeCeilingM: 3000 } },
      { label: "Somewhere around 4,000 m", patch: { altitudeCeilingM: 4000 } },
      { label: "Above 5,000 m", patch: { altitudeCeilingM: 5500 } },
    ],
  },
  {
    id: "fitness",
    text: "What does a hard day of walking look like for you?",
    options: [
      { label: "A few hours is plenty", patch: { fitness: "light" } },
      { label: "Full days, back to back", patch: { fitness: "full" } },
      { label: "I train for this", patch: { fitness: "trained" } },
    ],
  },
  {
    id: "intent",
    text: "What do you actually want out of it?",
    options: [
      { label: "A real challenge", patch: { intent: "challenge" } },
      { label: "Culture and villages", patch: { intent: "culture" } },
      { label: "Wildlife and quiet trails", patch: { intent: "wildlife" } },
    ],
  },
];

/* ------------------------------------------------------------- the matching */

const MEDICAL_DISCLAIMER =
  "This is general information, not medical advice — whether altitude is safe for you is a question for your doctor, and we would also want a licensed guide's assessment before you committed.";

const NO_BOOKING_LINE = "We cannot take a booking or any payment details here.";

function monthOf(d: Departure): number {
  return new Date(d.departsOn).getUTCMonth();
}

function bookable(d: Departure, now: Date): boolean {
  const status = departureStatus(d, now);
  return status !== "full" && status !== "closed";
}

/** One honest sentence that counts against the departure. Never empty. */
function cautionFor(d: Departure, a: FallbackAnswers, now: Date): string {
  const status = departureStatus(d, now);
  const ceiling = a.altitudeCeilingM;

  if (typeof ceiling === "number" && d.maxAltitudeM > ceiling + 800) {
    return `Its high point of ${d.maxAltitudeM.toLocaleString("en-GB")} m is ${(d.maxAltitudeM - ceiling).toLocaleString("en-GB")} m above anything you have done — the itinerary is built around acclimatisation days rather than speed, but that is the thing to weigh.`;
  }
  if (status === "needs-n") {
    return `It is not guaranteed yet: ${d.seatsBooked} of ${d.minimumToRun} needed, ${seatsToGuarantee(d)} more by ${formatDate(d.decisionDate)}, and you are refunded in full if it does not reach that.`;
  }
  if (status === "filling") {
    return `Only ${d.seatsTotal - d.seatsBooked} of ${d.seatsTotal} seats are left, so the date may not still be open when you decide.`;
  }
  if (d.singleSupplementUSD > 0) {
    return `There is a $${d.singleSupplementUSD.toLocaleString("en-GB")} single supplement on this one, on top of the $${d.priceUSD.toLocaleString("en-GB")}.`;
  }
  if (d.difficulty === "strenuous") {
    return `It is rated strenuous over ${d.days} days, which is a real commitment rather than a walking holiday.`;
  }
  return `Read the cost sheet before committing — ${d.priceExcludes[0].toLowerCase()} is not included.`;
}

function reasonFor(d: Departure, a: FallbackAnswers, now: Date): string {
  const status = departureStatus(d, now);
  const guaranteed = status === "guaranteed" || status === "filling";
  const fit = a.maxDays
    ? `${d.days} days against your ${a.maxDays}`
    : `${d.days} days`;
  return `${fit}, topping out at ${d.maxAltitudeM.toLocaleString("en-GB")} m at a ${d.guideRatio} guide ratio, and it ${guaranteed ? "has already passed its minimum so it runs regardless" : `runs once it reaches ${d.minimumToRun} bookings`}.`;
}

/**
 * How badly a departure misses, for ordering the beyond group.
 *
 * The point of that group is "the good option you were half expecting was
 * considered, and here is why it is not on the list" — so it has to show the
 * departures that come closest, not the ones that would have scored best if
 * the constraints did not exist. A trip that is one month out of the window is
 * far more useful to see than one that is 2,364 m over the ceiling.
 *
 * Lower is nearer. Counts how many of the three it breaks, then by how much.
 */
function breachSeverity(d: Departure, answers: FallbackAnswers): number {
  const stated = answers.altitudeCeilingM;
  const medical = answers.medicalConcern
    ? MEDICAL_ALTITUDE_CEILING_M
    : undefined;
  const ceiling =
    stated !== undefined && medical !== undefined
      ? Math.min(stated, medical)
      : (stated ?? medical);

  let broken = 0;
  let magnitude = 0;

  if (ceiling !== undefined && d.maxAltitudeM > ceiling) {
    broken += 1;
    // Metres over, scaled so a thousand of them weighs about as much as a
    // fortnight of overrun.
    magnitude += (d.maxAltitudeM - ceiling) / 1000;
  }
  if (answers.maxDays !== undefined && d.days > answers.maxDays) {
    broken += 1;
    magnitude += (d.days - answers.maxDays) / 14;
  }
  if (answers.months !== undefined && !answers.months.includes(monthOf(d))) {
    broken += 1;
    magnitude += 0.5;
  }

  return broken * 100 + magnitude;
}

/**
 * Score, do not filter, wherever a soft preference is involved — the honest
 * answer to "I want wildlife in October" is sometimes "the wildlife trip is in
 * February", and that is worth saying rather than returning nothing.
 */
/**
 * The hard constraints.
 *
 * Altitude experience is not a taste. Someone who tells us they have never been
 * above 3,000 m and is then shown a 4,984 m pass — with a note underneath
 * admitting it is 1,984 m above anything they have done — has been sold to, not
 * matched. The same goes for the days they actually have and the window they
 * can actually travel in: those are facts about their trip, not preferences to
 * be weighed against a good score.
 *
 * So these three are filters, and nothing that fails one can appear as a match.
 * What a failing departure gets instead is a sentence naming the breach and its
 * size, in a separate group the person can read and dismiss.
 *
 * Returns null when the departure breaks nothing.
 */
export function hardBreach(
  d: Departure,
  answers: FallbackAnswers,
): string | null {
  const stated = answers.altitudeCeilingM;
  const medical = answers.medicalConcern
    ? MEDICAL_ALTITUDE_CEILING_M
    : undefined;
  const ceiling =
    stated !== undefined && medical !== undefined
      ? Math.min(stated, medical)
      : (stated ?? medical);

  if (ceiling !== undefined && d.maxAltitudeM > ceiling) {
    return `${d.maxAltitudeM.toLocaleString("en-GB")} m — ${(d.maxAltitudeM - ceiling).toLocaleString("en-GB")} m above the ceiling you gave us.`;
  }
  if (answers.maxDays !== undefined && d.days > answers.maxDays) {
    return `${d.days} days — ${d.days - answers.maxDays} more than the ${answers.maxDays} you have.`;
  }
  if (answers.months !== undefined && !answers.months.includes(monthOf(d))) {
    return `departs ${formatDate(d.departsOn)} — outside ${listMonths(answers.months)}.`;
  }
  return null;
}

/**
 * Score, do not filter, wherever a soft preference is involved — the honest
 * answer to "I want wildlife in October" is sometimes "the wildlife trip is in
 * February", and that is worth saying rather than returning nothing. Hard
 * constraints are handled above, before any of this runs.
 */
export function fallbackMatch(
  answers: FallbackAnswers,
  now: Date = new Date(),
): MatcherResult {
  const prefix: string[] = [];
  if (answers.wantsToBook) prefix.push(NO_BOOKING_LINE);
  if (answers.medicalConcern) prefix.push(MEDICAL_DISCLAIMER);

  const open = departures.filter((d) => bookable(d, now));

  const breached = new Map<string, string>();
  for (const d of open) {
    const breach = hardBreach(d, answers);
    if (breach) breached.set(d.id, breach);
  }

  let pool = open.filter((d) => !breached.has(d.id));

  // Fitness is a preference rather than a stated fact about the trip, so it
  // narrows the pool but never sends anything to the beyond group.
  if (answers.fitness === "light") {
    pool = pool.filter((d) => d.difficulty !== "strenuous");
  }

  const beyondPool = open
    .filter((d) => breached.has(d.id))
    .sort(
      (a, b) =>
        breachSeverity(a, answers) - breachSeverity(b, answers) ||
        softScore(b, answers, now) - softScore(a, answers, now),
    );

  const beyond: Beyond[] = beyondPool.slice(0, BEYOND_LIMIT).map((d) => ({
    id: d.id,
    exceeds: breached.get(d.id)!,
  }));

  // If they asked for something by name and it did not survive, say so first
  // and say why. Quietly returning three other treks is the answer that loses
  // someone's trust — they asked a direct question.
  const named = answers.namedTrekId
    ? open.filter((d) => d.trekId === answers.namedTrekId)
    : [];
  if (named.length > 0 && !named.some((d) => pool.includes(d))) {
    prefix.push(declineNamed(named[0], answers));
  }

  if (pool.length === 0) {
    return {
      message: [...prefix, explainNothingFits(answers, open)].join(" "),
      done: true,
      question: null,
      matches: [],
      beyond,
      source: "fallback",
    };
  }

  const scored = pool
    .map((d) => ({ d, score: softScore(d, answers, now) }))
    .sort((a, b) => b.score - a.score || a.d.priceUSD - b.d.priceUSD);

  // Two or three, or however many genuinely fit. Padding the list out to three
  // with something that does not fit is the failure mode this whole section
  // exists to avoid — so a candidate has to be in the same league as the best
  // one to earn its place, not merely be the next row down.
  const best = scored[0].score;
  const strong = scored.filter((s) => s.score >= best - SCORE_BAND);
  const shortlist = strong.length >= 2 ? strong : scored.slice(0, 2);
  const matches: Match[] = shortlist.slice(0, MAX_MATCHES).map(({ d }) => ({
    id: d.id,
    reason: reasonFor(d, answers, now),
    caution: cautionFor(d, answers, now),
  }));

  const lead = answers.wantsCheapest
    ? `The lowest all-in price we currently have open is ${matches[0] ? nameOf(matches[0].id) : "below"}.`
    : `Here is what actually fits, and what to weigh against each.`;

  return {
    message: [...prefix, lead].filter(Boolean).join(" "),
    done: true,
    question: null,
    matches,
    // Only worth showing when the matches did not already fill the list.
    beyond: matches.length >= MAX_MATCHES ? [] : beyond,
    source: "fallback",
  };
}

/** Everything that is a preference rather than a stated fact about the trip. */
function softScore(d: Departure, answers: FallbackAnswers, now: Date): number {
  let score = 0;
  if (answers.months?.includes(monthOf(d))) score += 4;

  const intents = TREK_INTENT[d.trekId] ?? [];
  if (answers.intent && intents.includes(answers.intent)) score += 3;

  if (typeof answers.altitudeCeilingM === "number") {
    const headroom = answers.altitudeCeilingM - d.maxAltitudeM;
    if (headroom >= 0) score += 2;
  }

  if (answers.fitness === "trained" && d.difficulty !== "moderate") score += 1;
  if (answers.fitness === "light" && d.difficulty === "moderate") score += 1;

  const status = departureStatus(d, now);
  if (status === "guaranteed") score += 2;
  if (status === "filling") score += 1;

  if (answers.wantsCheapest) score += (3000 - d.priceUSD) / 1000;

  return score;
}

/**
 * The honest no.
 *
 * Names the binding constraint rather than hedging, and never offers a
 * compressed version of the itinerary — the days someone would have to cut to
 * make Everest Base Camp fit a short trip are the acclimatisation days, and
 * selling that is how people get hurt.
 */
function declineNamed(d: Departure, a: FallbackAnswers): string {
  if (a.medicalConcern && d.maxAltitudeM > MEDICAL_ALTITUDE_CEILING_M) {
    // The disclaimer is already in the prefix whenever medicalConcern is set;
    // repeating it here reads as a script rather than an answer.
    return `${d.trekName} reaches ${d.maxAltitudeM.toLocaleString("en-GB")} m, and we are not going to tell you that is fine for you on the strength of a chat.`;
  }
  if (a.maxDays !== undefined && d.days > a.maxDays) {
    return `${d.trekName} does not fit ${a.maxDays} days. The itinerary we run is ${d.days} days, and we do not sell a compressed version of it — the days you would have to cut are the acclimatisation days, which is the part that keeps it safe. If you can find ${d.days}, it is ${formatDateRange(d.departsOn, d.returnsOn)}.`;
  }
  if (a.fitness === "light" && d.difficulty === "strenuous") {
    return `${d.trekName} is rated strenuous over ${d.days} days, which is more than the walking you described, so we are not going to put it in front of you.`;
  }
  return `${d.trekName} is not open on the dates you gave.`;
}

/** "October", or "February, March or April". */
function listMonths(months: number[]): string {
  const names = months.map(
    (i) => MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1),
  );
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

function nameOf(id: string): string {
  const d = departures.find((x) => x.id === id);
  return d ? `${d.trekName} at $${d.priceUSD.toLocaleString("en-GB")}` : id;
}

/**
 * Say what would fit rather than stretching something to fill the gap. The
 * binding constraint is named explicitly, because "nothing matches" on its own
 * is a dead end for the person reading it.
 */
function explainNothingFits(
  answers: FallbackAnswers,
  open: Departure[],
): string {
  if (answers.medicalConcern) {
    return "Everything we currently have open goes above 3,000 m, so we are not going to recommend any of it to you on the strength of a chat. Speak to your doctor first; if they clear you for altitude, tell us what they said and we will go through the itineraries with a guide.";
  }

  // Name the constraints back, in their own words, rather than saying "no
  // results". The person needs to know which of the three to loosen.
  const clauses: string[] = [];
  if (answers.altitudeCeilingM !== undefined) {
    clauses.push(`under ${answers.altitudeCeilingM.toLocaleString("en-GB")} m`);
  }
  if (answers.months !== undefined) {
    clauses.push(`departing in ${listMonths(answers.months)}`);
  }
  if (answers.maxDays !== undefined) {
    clauses.push(`inside ${answers.maxDays} days`);
  }

  if (clauses.length > 0) {
    const stated = `Nothing we have open is ${clauses.join(", ")}.`;
    // Which single constraint is doing the excluding is the useful part: if
    // relaxing one of them opens something up, say which one.
    const openable = open
      .map((d) => ({
        d,
        breaks: [
          answers.altitudeCeilingM !== undefined &&
          d.maxAltitudeM > answers.altitudeCeilingM
            ? "altitude"
            : null,
          answers.maxDays !== undefined && d.days > answers.maxDays
            ? "length"
            : null,
          answers.months !== undefined && !answers.months.includes(monthOf(d))
            ? "dates"
            : null,
        ].filter(Boolean) as string[],
      }))
      .filter((row) => row.breaks.length === 1)
      .sort((a, b) => a.d.days - b.d.days)[0];

    return openable
      ? `${stated} ${openable.d.trekName} clears everything except the ${openable.breaks[0]} — ${openable.d.days} days, ${openable.d.maxAltitudeM.toLocaleString("en-GB")} m, departing ${formatDate(openable.d.departsOn)}. If that one constraint has any give, tell us and we will look again.`
      : `${stated} Every departure we have open breaks more than one of those, so there is no near miss worth showing you. Tell us which of the three has any give.`;
  }

  if (answers.fitness === "light") {
    const gentlest = [...open]
      .filter((d) => d.difficulty === "moderate")
      .sort((a, b) => a.maxAltitudeM - b.maxAltitudeM)[0];
    if (gentlest) {
      return `Nothing open fits those constraints together. ${gentlest.trekName} is the gentlest thing we run — ${gentlest.days} days, ${gentlest.maxAltitudeM.toLocaleString("en-GB")} m, rated moderate — if you can move on the dates.`;
    }
  }

  const anything = open[0];
  return anything
    ? `Nothing currently open fits that combination. The nearest is ${anything.trekName}, ${anything.days} days at ${anything.maxAltitudeM.toLocaleString("en-GB")} m, departing ${formatDate(anything.departsOn)} — tell us which of your constraints has any give and we will look again.`
    : "There is nothing open that fits, and nothing close enough to suggest instead. Tell us your dates and we will tell you what we are putting on sale next.";
}

/** Every id this matcher can ever emit. The guard checks these against the dataset. */
export const FALLBACK_EMITTABLE_IDS: readonly string[] = departures.map(
  (d) => d.id,
);
