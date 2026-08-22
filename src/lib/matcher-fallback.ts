import {
  departureStatus,
  departures,
  isBookable,
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
  "poon-hill": ["culture"],
  "mardi-himal": ["quiet", "challenge"],
  "chitwan-safari": ["wildlife", "quiet"],
  "bardia-wildlife": ["wildlife", "quiet"],
  "kathmandu-valley-rim": ["culture", "quiet"],
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
  /**
   * The highest they have actually trekked.
   *
   * This NEVER excludes a departure. Someone who has been to 3,000 m and wants
   * to go to 5,364 m is not making a mistake — acclimatisation days are what
   * the itinerary is for, and telling them they may not is not our call. All
   * this does is put the difference on the card so they can see it.
   */
  experienceM?: number;
  /**
   * How high they have said they are willing to go this time.
   *
   * This IS the ceiling, and it is hard. It is a decision they have made about
   * their own trip, and nothing above it belongs in a list of things that fit.
   * Undefined means no ceiling — either they said "as high as it takes" or they
   * were never asked.
   */
  willingnessM?: number;
  /** They asked us to advise rather than name a ceiling. No filter, more care. */
  altitudeAdvice?: boolean;
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

/** Phrases that turn a number into a limit rather than a fact about the past. */
const WILLINGNESS_TERMS =
  /\b(willing|prepared|want to go|happy to go|no higher|nothing above|not go above|max(imum)?|cap|ceiling|limit|stay (?:below|under))\b/i;

/** They would rather we advised than named a number. */
const ADVICE_TERMS =
  /\b(not sure|unsure|no idea|advise me|you tell me|what do you (?:recommend|think)|whatever you)\b/i;

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
    if (value >= 100 && value <= 9000) {
      // Which of the two a number means depends entirely on how it was framed.
      // "I do not want to go above 4,000 m" is a ceiling; "I have been to
      // 4,000 m" is not, and reading the second as the first would quietly
      // withhold the very trip they were asking about. Unframed, it is
      // experience — the reading that cannot exclude anything.
      if (WILLINGNESS_TERMS.test(t)) answers.willingnessM = value;
      else answers.experienceM = value;
    }
  }
  if (/\bnever been (?:to )?(?:any )?(?:altitude|high)/.test(t)) {
    answers.experienceM = answers.experienceM ?? 0;
  }
  if (ADVICE_TERMS.test(t)) answers.altitudeAdvice = true;

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
    id: "experienceM",
    text: "What is the highest you have trekked?",
    options: [
      { label: "Under 3,000 m", patch: { experienceM: 3000 } },
      { label: "3,000–4,500 m", patch: { experienceM: 4500 } },
      { label: "Above 4,500 m", patch: { experienceM: 5500 } },
    ],
  },
  {
    id: "willingnessM",
    // The one that decides what appears. Asked separately from experience
    // because they are different questions with different consequences: what
    // you have done shapes the caution, what you are willing to do sets the
    // ceiling.
    text: "How high are you willing to go this time?",
    options: [
      { label: "Under 3,000 m", patch: { willingnessM: 3000 } },
      { label: "Up to 4,500 m", patch: { willingnessM: 4500 } },
      { label: "As high as it takes", patch: { willingnessM: undefined } },
      {
        label: "Not sure, advise me",
        patch: { willingnessM: undefined, altitudeAdvice: true },
      },
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

/**
 * Said when someone answers "not sure, advise me" to the willingness question.
 *
 * They have not given us a ceiling, so we have not applied one — and that is a
 * fact about the list they are looking at, not a footnote. It belongs above the
 * results, once, in plain words.
 */
const NO_ALTITUDE_FILTER_LINE =
  "You asked us to advise rather than name a ceiling, so we have not filtered on altitude at all. Every height below is stated, with the difference from your own highest where there is one.";

const NO_BOOKING_LINE = "We cannot take a booking or any payment details here.";

function monthOf(d: Departure): number {
  return new Date(d.departsOn).getUTCMonth();
}

function bookable(d: Departure, now: Date): boolean {
  /*
   * The lifecycle, not the fill state.
   *
   * This used to ask whether the seats were gone, which is a different question
   * from whether the date still exists. A departure past its decision date and
   * short of its minimum has been cancelled and refunded, and the matcher was
   * still free to recommend it.
   */
  return isBookable(d, now);
}

/** One honest sentence that counts against the departure. Never empty. */
/**
 * How far above their stated previous high this departure goes, rounded to the
 * nearest hundred metres, or null when there is nothing to say.
 *
 * The band answers are stored at the top of the band, so "under 3,000 m" reads
 * as 3,000. That understates the gap for someone whose real high is much lower,
 * which is the direction to err in: it never overstates how far out of their
 * depth we think they are.
 */
export function altitudeGap(d: Departure, a: FallbackAnswers): number | null {
  if (typeof a.experienceM !== "number") return null;
  const over = d.maxAltitudeM - a.experienceM;
  return over > 0 ? Math.round(over / 100) * 100 : null;
}

function cautionFor(d: Departure, a: FallbackAnswers, now: Date): string {
  const status = departureStatus(d, now);

  // Experience cautions, it never filters. State the number and the fact once
  // and stop — a paragraph about what someone should conclude about their own
  // body is a lecture, and this is a trekking company, not their doctor.
  const gap = altitudeGap(d, a);
  if (gap !== null) {
    return `${d.maxAltitudeM.toLocaleString("en-GB")} m — about ${gap.toLocaleString("en-GB")} m above your previous high; the itinerary is built around acclimatisation days rather than speed.`;
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
  const ceiling = altitudeCeiling(answers);

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
/**
 * The only altitude number that filters anything.
 *
 * Willingness, and the medical ceiling when one applies — whichever is lower.
 * Experience is deliberately absent: it has no vote here.
 */
export function altitudeCeiling(a: FallbackAnswers): number | undefined {
  const medical = a.medicalConcern ? MEDICAL_ALTITUDE_CEILING_M : undefined;
  if (a.willingnessM !== undefined && medical !== undefined) {
    return Math.min(a.willingnessM, medical);
  }
  return a.willingnessM ?? medical;
}

export function hardBreach(
  d: Departure,
  answers: FallbackAnswers,
): string | null {
  const ceiling = altitudeCeiling(answers);

  if (ceiling !== undefined && d.maxAltitudeM > ceiling) {
    return answers.medicalConcern && ceiling === MEDICAL_ALTITUDE_CEILING_M
      ? `${d.maxAltitudeM.toLocaleString("en-GB")} m — above the ${MEDICAL_ALTITUDE_CEILING_M.toLocaleString("en-GB")} m we hold to when someone has told us about a condition.`
      : `${d.maxAltitudeM.toLocaleString("en-GB")} m — ${(d.maxAltitudeM - ceiling).toLocaleString("en-GB")} m above the height you said you were willing to go.`;
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
  if (answers.altitudeAdvice && !answers.medicalConcern) {
    prefix.push(NO_ALTITUDE_FILTER_LINE);
  }

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
  const ceiling = altitudeCeiling(answers);
  if (ceiling !== undefined) {
    clauses.push(`under ${ceiling.toLocaleString("en-GB")} m`);
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
          ceiling !== undefined && d.maxAltitudeM > ceiling ? "altitude" : null,
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
