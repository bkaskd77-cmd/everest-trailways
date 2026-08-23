/**
 * The four documents, and the pages that must not contradict them.
 *
 *     pnpm check:documents
 *
 * /licences, /safety, /pricing and /cancellation are the pages a reader
 * consults when deciding whether to believe the rest of the site. Two things
 * can go wrong with them and neither shows up as a broken build:
 *
 *   a credential is published that nobody has verified — a plausible
 *   registration number is four digits and a hyphen, and it would sit there
 *   unchallenged on the page arguing that everything here is checkable;
 *
 *   a departure page states a staffing, certification or refund term that the
 *   document says something different about. Nineteen departures and four
 *   documents is more pairs than anybody re-reads.
 *
 * Both are arithmetic over data, so both are checkable here.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CANCELLATION_TERMS,
  refundPercentFor,
} from "../src/content/cancellation.ts";
import { CERTIFICATION_TIERS } from "../src/content/certification.ts";
import { CREDENTIALS } from "../src/content/credentials.ts";
import {
  RATIO_BANDS,
  WHAT_WE_DO_NOT_DO,
  bandFor,
} from "../src/content/safety.ts";
import { departures } from "../src/content/departures.ts";

const root = process.cwd();

type Problem = { id: string; rule: string; detail: string };
const problems: Problem[] = [];
const fail = (id: string, rule: string, detail: string) =>
  problems.push({ id, rule, detail });

/* ------------------------------------------------------------ credentials */

for (const c of CREDENTIALS) {
  /*
   * The rule this whole file exists for.
   *
   * A number on the page is a claim that we have checked it. Publishing one
   * with status "pending" is the single worst thing this site could do,
   * because it is invisible: nobody audits a registration number, and the page
   * it sits on is the one arguing that everything we say can be audited.
   */
  if (c.number !== "—" && c.status !== "verified") {
    fail(
      c.id,
      "unverified-credential",
      `publishes "${c.number}" with status "${c.status}" — a number on the page claims we hold the document`,
    );
  }
  if (c.status === "verified" && c.number === "—") {
    fail(
      c.id,
      "verified-without-number",
      "is marked verified but has no number, so the status claims more than the record shows",
    );
  }
  if (!c.whatItDoesNotMean.trim()) {
    fail(
      c.id,
      "missing-limitation",
      "does not say what it fails to establish — a licence proves registration, not competence, and a page that omits that invites the reader to assume otherwise",
    );
  }
  if (!c.howToVerify.trim()) {
    fail(
      c.id,
      "missing-verification-route",
      "does not say how to check it independently",
    );
  }
}

/* ----------------------------------------------- safety versus departures */

for (const d of departures) {
  const band = bandFor(d.maxAltitudeM);

  /* A departure may not promise a thinner ratio than its band requires. */
  const promised = Number(d.guideRatio.split(":")[1]);
  const required = Number(band.guideRatio.split(":")[1]);
  if (
    Number.isFinite(promised) &&
    Number.isFinite(required) &&
    promised > required
  ) {
    fail(
      d.id,
      "ratio-contradicts-safety",
      `runs ${d.guideRatio} at ${d.maxAltitudeM} m, where /safety states ${band.guideRatio}`,
    );
  }

  /* And its derived certification must clear the band's floor. */
  const tier = CERTIFICATION_TIERS.find(
    (t) => t.level === d.guideRequirement.certificationLevel,
  );
  if (!tier) {
    fail(
      d.id,
      "certification-contradicts-safety",
      `requires "${d.guideRequirement.certificationLevel}", which /safety does not list`,
    );
  } else if (tier.maxAltitudeM < band.requiresTierAtLeastM) {
    fail(
      d.id,
      "certification-contradicts-safety",
      `holds a tier valid to ${tier.maxAltitudeM} m where /safety requires ${band.requiresTierAtLeastM} m for this band`,
    );
  }
}

if (!WHAT_WE_DO_NOT_DO.length) {
  fail(
    "safety",
    "missing-limits",
    "the 'what we do not do' section is empty — a safety page listing only what a company does reads as a guarantee",
  );
}

/* ----------------------------------------- cancellation versus departures */

/*
 * A refund percentage stated anywhere else must be one this policy produces.
 *
 * The failure mode is a departure FAQ that summarises the policy and then
 * drifts from it. The FAQ is deliberately written not to restate the numbers,
 * and this is what keeps it that way.
 */
const policyPercents = new Set<number>(
  CANCELLATION_TERMS.slidingScale.map((b) => b.refundPercent),
);
policyPercents.add(CANCELLATION_TERMS.weCancelRefundPercent);

for (const d of departures) {
  for (const faq of d.faqs) {
    for (const match of faq.answer.matchAll(/(\d{1,3})\s?%/g)) {
      const stated = Number(match[1]);
      /* Only refund talk. A percentage about anything else is not this rule. */
      if (!/refund|cancel|back/i.test(faq.answer)) continue;
      if (policyPercents.has(stated)) continue;
      fail(
        d.id,
        "refund-term-contradicts-policy",
        `an answer about cancelling states ${stated}%, which is not a band on /cancellation`,
      );
    }
  }
}

/* Sanity on the scale itself. */
const sorted = [...CANCELLATION_TERMS.slidingScale].sort(
  (a, b) => a.fromDaysBefore - b.fromDaysBefore,
);
for (let i = 1; i < sorted.length; i += 1) {
  if (sorted[i].refundPercent < sorted[i - 1].refundPercent) {
    fail(
      "cancellation",
      "scale-not-monotonic",
      `${sorted[i].fromDaysBefore} days gives ${sorted[i].refundPercent}% but ${sorted[i - 1].fromDaysBefore} days gives ${sorted[i - 1].refundPercent}% — more notice must never return less`,
    );
  }
}
if (refundPercentFor(9999) !== 100) {
  fail(
    "cancellation",
    "scale-incomplete",
    "cancelling a year out does not return 100%, which is almost certainly not intended",
  );
}

/* ------------------------------------------------------- the pages exist */

const REQUIRED_PAGES = [
  "src/app/licences/page.tsx",
  "src/app/safety/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/cancellation/page.tsx",
];

for (const file of REQUIRED_PAGES) {
  const source = await readFile(path.join(root, file), "utf8").catch(() => "");
  if (!source) {
    fail(file, "missing-document", "does not exist");
    continue;
  }
  if (!source.includes("DocumentPage")) {
    fail(
      file,
      "not-a-document",
      "does not use the shared document template, so it has no visible review date, no contents and no print stylesheet",
    );
  }
  if (!/lastReviewed/.test(source)) {
    fail(
      file,
      "no-review-date",
      "carries no lastReviewed date — a trust document that will not say when it was last checked is asking to be believed about that too",
    );
  }
}

/* ------------------------------------------------------------------ report */

console.log("\n  Trust documents\n");
console.log(
  `  ok    ${CREDENTIALS.length} credentials, ${CREDENTIALS.filter((c) => c.status === "verified").length} verified, ${CREDENTIALS.filter((c) => c.number !== "—").length} numbers published`,
);
console.log(
  `  ok    ${RATIO_BANDS.length} altitude bands and ${CERTIFICATION_TIERS.length} certification tiers, checked against ${departures.length} departures`,
);
console.log(
  `  ok    ${CANCELLATION_TERMS.slidingScale.length} refund bands, ${WHAT_WE_DO_NOT_DO.length} stated limits`,
);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
