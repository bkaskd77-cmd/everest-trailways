/**
 * Trek matcher guard.
 *
 *     pnpm check:matcher
 *
 * Three things this section cannot be allowed to ship without, checked before
 * every build:
 *
 *   1. The fallback matcher can only ever name a departure that exists. It is
 *      exercised across every combination of answers the UI can produce, and
 *      every id it emits is looked up in the dataset. A recommendation the site
 *      cannot link to is a broken promise, not a rough edge.
 *   2. Every hard constraint is still present, verbatim, in matcher-prompt.ts.
 *      These are the rules that stop the model inventing a price or talking
 *      someone with a heart condition up a mountain. Softening one of them
 *      should take a deliberate act, not a careless edit.
 *   3. The route enforces a rate limit. A public endpoint that calls a paid API
 *      without one is a bill waiting to happen.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { departures } from "../src/content/departures.ts";
import {
  FALLBACK_QUESTIONS,
  TREK_INTENT,
  fallbackMatch,
  parseFreeText,
  type FallbackAnswers,
  type Intent,
} from "../src/lib/matcher-fallback.ts";
import { MAX_MATCHES } from "../src/lib/matcher-types.ts";
import {
  MATCH_RATE_LIMIT,
  rateLimit,
  resetRateLimits,
} from "../src/lib/rate-limit.ts";

type Problem = { rule: string; detail: string };
const problems: Problem[] = [];
const fail = (rule: string, detail: string) => problems.push({ rule, detail });

const root = process.cwd();
const VALID_IDS = new Set(departures.map((d) => d.id));

/* ------------------------------------------- 1. the fallback cannot invent */

const DAY_OPTIONS = [undefined, 5, 7, 12, 21];
const MONTH_OPTIONS: (number[] | undefined)[] = [
  undefined,
  [9, 10],
  [1, 2, 3],
  [6],
];
const ALTITUDE_OPTIONS = [undefined, 0, 3000, 4000, 5500];
const FITNESS_OPTIONS: (FallbackAnswers["fitness"] | undefined)[] = [
  undefined,
  "light",
  "full",
  "trained",
];
const INTENT_OPTIONS: (Intent | undefined)[] = [
  undefined,
  "challenge",
  "culture",
  "wildlife",
  "quiet",
];
const FLAG_OPTIONS = [
  {},
  { medicalConcern: true },
  { wantsToBook: true },
  { wantsCheapest: true },
  { medicalConcern: true, wantsToBook: true, wantsCheapest: true },
];

let combinations = 0;
let emptyResults = 0;
const emittedIds = new Set<string>();

for (const maxDays of DAY_OPTIONS) {
  for (const months of MONTH_OPTIONS) {
    for (const altitudeCeilingM of ALTITUDE_OPTIONS) {
      for (const fitness of FITNESS_OPTIONS) {
        for (const intent of INTENT_OPTIONS) {
          for (const flags of FLAG_OPTIONS) {
            combinations += 1;
            const answers: FallbackAnswers = {
              maxDays,
              months,
              altitudeCeilingM,
              fitness,
              intent,
              ...flags,
            };
            const result = fallbackMatch(answers);

            if (!result.message.trim()) {
              fail(
                "empty-message",
                `fallbackMatch returned no message for ${JSON.stringify(answers)}`,
              );
            }
            if (result.matches.length > MAX_MATCHES) {
              fail(
                "too-many-matches",
                `${result.matches.length} matches for ${JSON.stringify(answers)} — the cap is ${MAX_MATCHES}`,
              );
            }
            if (result.matches.length === 0) emptyResults += 1;

            for (const match of result.matches) {
              emittedIds.add(match.id);
              if (!VALID_IDS.has(match.id)) {
                fail(
                  "unknown-id",
                  `fallbackMatch emitted "${match.id}", which is not in the dataset`,
                );
              }
              if (!match.reason.trim()) {
                fail(
                  "empty-reason",
                  `${match.id} was matched without a reason`,
                );
              }
              if (!match.caution.trim()) {
                fail(
                  "empty-caution",
                  `${match.id} was matched without a caution — every match must carry one`,
                );
              }
            }

            // The refusal that matters most: a flagged condition must never be
            // answered with a high-altitude departure.
            if (flags.medicalConcern) {
              for (const match of result.matches) {
                const departure = departures.find((d) => d.id === match.id);
                if (departure && departure.maxAltitudeM > 3000) {
                  fail(
                    "altitude-refusal",
                    `a declared medical concern was matched to ${match.id} at ${departure.maxAltitudeM} m`,
                  );
                }
              }
            }

            // Never a booking.
            if (
              flags.wantsToBook &&
              !/cannot take a booking/i.test(result.message)
            ) {
              fail(
                "booking-refusal",
                `a request to book was not declined for ${JSON.stringify(answers)}`,
              );
            }
          }
        }
      }
    }
  }
}

/* --------------------------------------------------- the ladder and intents */

for (const departure of departures) {
  if (!TREK_INTENT[departure.trekId]) {
    fail(
      "untagged-trek",
      `${departure.trekId} has no entry in TREK_INTENT, so it can never be matched on intent`,
    );
  }
}
for (const trekId of Object.keys(TREK_INTENT)) {
  if (!departures.some((d) => d.trekId === trekId)) {
    fail(
      "stale-intent",
      `TREK_INTENT has "${trekId}", which no departure uses`,
    );
  }
}
if (FALLBACK_QUESTIONS.length > 5) {
  fail(
    "too-many-questions",
    `${FALLBACK_QUESTIONS.length} questions in the ladder — the section promises at most 5`,
  );
}
for (const question of FALLBACK_QUESTIONS) {
  if (question.options.length !== 3) {
    fail(
      "bad-options",
      `"${question.text}" offers ${question.options.length} options — the section promises three`,
    );
  }
}

// The free-text reader must catch a stated condition. This is the path someone
// takes when they type rather than tap, and it must not be the weaker one.
for (const phrase of [
  "I have a heart condition, is Everest fine?",
  "my asthma is quite bad",
  "I am pregnant, can I still trek",
]) {
  if (!parseFreeText(phrase).medicalConcern) {
    fail("missed-medical", `parseFreeText did not flag "${phrase}"`);
  }
}
for (const phrase of ["just book it for me", "take my card details"]) {
  if (!parseFreeText(phrase).wantsToBook) {
    fail("missed-booking", `parseFreeText did not flag "${phrase}"`);
  }
}

// Asking for a named trek that does not fit must be answered with a no that
// names it, not quietly substituted with three others.
{
  const asked = parseFreeText(
    "I want Everest Base Camp but I only have 5 days",
  );
  if (asked.namedTrekId !== "everest-base-camp") {
    fail(
      "missed-trek-name",
      "parseFreeText did not recognise Everest Base Camp",
    );
  }
  if (asked.maxDays !== 5) {
    fail("missed-days", "parseFreeText did not read 5 days");
  }
  const declined = fallbackMatch(asked);
  if (!/Everest Base Camp does not fit/i.test(declined.message)) {
    fail(
      "no-honest-decline",
      "a named trek that cannot fit was not declined by name",
    );
  }
}

/* ---------------------------------------- 2. the hard constraints, verbatim */

const promptSource = await readFile(
  path.join(root, "src/lib/matcher-prompt.ts"),
  "utf8",
);

const REQUIRED_CONSTRAINTS = [
  "Only ever recommend departures whose id exists in the supplied dataset.",
  "Never invent prices, dates, altitudes, seat counts or inclusions — quote only supplied values.",
  "Never claim a departure is guaranteed unless the data says so.",
  "If asked about altitude sickness, injury or medical fitness: give general information, state clearly it is not medical advice, and recommend a doctor and a licensed guide's assessment. Never assess an individual's fitness to trek at altitude.",
  "If the user describes a condition that makes high altitude dangerous, do not steer them to a high-altitude departure to make a sale — recommend lower-altitude options and say why.",
  "Never take payment details, passport numbers or personal data.",
  "Never promise availability.",
];

for (const constraint of REQUIRED_CONSTRAINTS) {
  if (!promptSource.includes(constraint)) {
    fail(
      "missing-constraint",
      `matcher-prompt.ts no longer contains: "${constraint.slice(0, 60)}…"`,
    );
  }
}

/* ------------------------------------------------- 3. the route is limited */

const routeSource = await readFile(
  path.join(root, "src/app/api/match/route.ts"),
  "utf8",
);

if (!/from "@\/lib\/rate-limit"/.test(routeSource)) {
  fail("no-rate-limit", "the route does not import the rate limiter");
}
if (!/rateLimit\(\s*clientKey\(/.test(routeSource)) {
  fail("no-rate-limit", "the route does not call rateLimit(clientKey(...))");
}
if (!/status:\s*429/.test(routeSource)) {
  fail("no-rate-limit", "the route never returns 429");
}
if (!/max_tokens:\s*MAX_OUTPUT_TOKENS/.test(routeSource)) {
  fail("uncapped-tokens", "the route does not cap the model's output tokens");
}
if (!/coerceResult\(/.test(routeSource)) {
  fail(
    "untrusted-output",
    "the route does not run the model's output through coerceResult",
  );
}
if (!/fallbackFor\(/.test(routeSource)) {
  fail(
    "no-fallback",
    "the route has no path to the deterministic matcher — it can fail visibly",
  );
}

// And the limiter itself actually limits.
resetRateLimits();
const key = "guard-probe";
let allowed = 0;
for (let i = 0; i < MATCH_RATE_LIMIT.requests + 3; i += 1) {
  if (rateLimit(key).ok) allowed += 1;
}
if (allowed !== MATCH_RATE_LIMIT.requests) {
  fail(
    "limiter-broken",
    `rateLimit allowed ${allowed} of ${MATCH_RATE_LIMIT.requests + 3} attempts — the window is not holding`,
  );
}
if (rateLimit(key).retryAfterSeconds <= 0) {
  fail("limiter-broken", "a blocked request came back without a retry-after");
}
resetRateLimits();

/* ------------------------------------------------------------------ report */

console.log("\n  Trek matcher\n");
console.log(`  ok    ${combinations} answer combinations exercised`);
console.log(
  `  ok    ${emittedIds.size} of ${departures.length} departure ids emitted, all real`,
);
console.log(
  `  ok    ${emptyResults} combinations honestly returned no match rather than forcing one`,
);
console.log(
  `  ok    ${REQUIRED_CONSTRAINTS.length} hard constraints present verbatim`,
);
console.log(
  `  ok    rate limit ${MATCH_RATE_LIMIT.requests} req / ${MATCH_RATE_LIMIT.windowMs / 60000} min enforced by the route`,
);

if (problems.length) {
  console.log("\n  Problems:");
  const seen = new Set<string>();
  for (const p of problems) {
    const line = `    [${p.rule}] ${p.detail}`;
    if (seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
  console.log(`\n  ${problems.length} problem(s)\n`);
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
