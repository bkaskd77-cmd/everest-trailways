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

import { readFile, readdir } from "node:fs/promises";

import { callsFunction, executable, rendersComponent } from "./lib/source.ts";
import path from "node:path";

import {
  CANCELLATION_TERMS,
  refundPercentFor,
} from "../src/content/cancellation.ts";
import { CERTIFICATION_TIERS } from "../src/content/certification.ts";
import { CREDENTIALS } from "../src/content/credentials.ts";
import { POLICIES } from "../src/content/policies.ts";
import {
  RATIO_BANDS,
  WHAT_WE_DO_NOT_DO,
  bandFor,
  bandReality,
  perGuide,
} from "../src/content/safety.ts";
import { GUIDES, rosterSummary } from "../src/content/guides.ts";
import { departures } from "../src/content/departures.ts";

const root = process.cwd();

/** Every file under a directory. Same helper the other guards use. */
async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

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

  /* A departure may not run looser than the band's published commitment. */
  const promised = perGuide(d.guideRatio);
  const committed = perGuide(band.commitment);
  if (promised > committed) {
    fail(
      d.id,
      "ratio-contradicts-safety",
      `runs ${d.guideRatio} at ${d.maxAltitudeM} m, where /safety commits to ${band.commitment}`,
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

/*
 * A commitment nothing can breach is not a commitment.
 *
 * The band above 4,500 m published 1:8 while all four of its departures ran
 * 1:4. Nothing could ever fail that rule, which is precisely why it passed —
 * a standard set at the weakest value it could take is a sentence written to
 * be unfalsifiable, and the previous guard could not tell the difference
 * between that and a standard being met.
 *
 * So the commitment has to bind at least the loosest thing we actually run in
 * the band. If everything is stricter, the commitment is slack and says so.
 */
for (const band of RATIO_BANDS) {
  const reality = bandReality(band, departures);
  if (!reality.count) continue;

  if (perGuide(band.commitment) > perGuide(reality.loosest)) {
    fail(
      band.aboveM === 0 ? "below-3000" : `above-${band.aboveM}`,
      "unfalsifiable-standard",
      `commits to ${band.commitment} while the loosest departure in the band runs ${reality.loosest} — a ceiling nobody uses is not a standard, it is a sentence written so that nothing can breach it`,
    );
  }

  /*
   * And the row must not contradict itself. A note describing a second guide
   * beside a ratio that assumes one is the fault the above-4,500 row had:
   * two claims about the same staffing, on the same row, disagreeing.
   */
  /*
   * Widened after the row above 4,500 m was read against its own data. The
   * rule only failed when NO departure carried a second guide, and three of
   * four did — so a sentence claiming it of the band passed while Langtang
   * ran one guide at 4,984 m. "Some" written as "all" is the same fault as
   * the ratio this step started with, and the guard could not see it.
   */
  const claimsSecondGuide = /second guide (joins|accompanies|is added)/i.test(
    band.note,
  );
  if (claimsSecondGuide && reality.withSecondGuide < reality.count) {
    fail(
      `above-${band.aboveM}`,
      "band-note-contradicts-staffing",
      `the note has a second guide joining, and ${reality.count - reality.withSecondGuide} of ${reality.count} departures in the band carry none — state the count with secondGuideSentence() rather than promising it of the band`,
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

/* --------------------------------------- no ratio claim may be typed */

/*
 * A ratio written into a page is a ratio that will outlive the fact.
 *
 * The trust strip carried "1:4" as a literal for ten steps while eight
 * departures ran looser than that. Nothing caught it because nothing was
 * looking for the shape of the mistake — a number in source that also exists
 * in the data, with no expression connecting them.
 *
 * So: any `1:N` appearing in a rendered page's source is a finding, unless the
 * file is one of the two that legitimately declare ratios (the departure seeds
 * and the band commitments). Everywhere else it must be an expression.
 */
const RATIO_LITERAL = /["'`>\s](1:\d+)["'`<\s]/g;

const MAY_DECLARE_RATIOS = new Set([
  /* Departures declare their own ratio; it is the source of truth. */
  "src/content/departures.ts",
  /* The bands declare a commitment, which is a promise rather than a reading. */
  "src/content/safety.ts",
]);

const pageFiles = (await walk(path.join(root, "src/app"))).concat(
  await walk(path.join(root, "src/components")),
);

for (const file of pageFiles) {
  if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (MAY_DECLARE_RATIOS.has(rel)) continue;

  const source = executable(await readFile(file, "utf8"));
  for (const match of source.matchAll(RATIO_LITERAL)) {
    fail(
      rel,
      "typed-ratio-claim",
      `contains the literal "${match[1]}" — a ratio on a page must be read from the departures, not written beside them`,
    );
  }
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
  /*
   * Rendered, not imported. `import { DocumentPage }` left behind after the
   * page stopped using it satisfied the old check, which would have passed a
   * trust document with no review date, no contents and no print styles.
   */
  if (!rendersComponent(source, "DocumentPage")) {
    fail(
      file,
      "not-a-document",
      "does not use the shared document template, so it has no visible review date, no contents and no print stylesheet",
    );
  }
  /*
   * The review date moved into the policy registry in step 11, so the page no
   * longer carries it — it names a policy and the template reads the date.
   * The rule follows: the page must name a policy, and that policy must have a
   * date. Left as it was, this would have failed every document for not
   * containing a string that is correctly no longer there.
   */
  const named = source.match(/policyId="([a-z-]+)"/);
  if (!named) {
    fail(
      file,
      "no-review-date",
      "names no policy, so the template has no review state or date to render",
    );
  } else if (!POLICIES.find((p) => p.id === named[1])?.lastReviewed) {
    fail(
      file,
      "no-review-date",
      `names policy "${named[1]}", which has no lastReviewed date — a trust document that will not say when it was last checked is asking to be believed about that too`,
    );
  }
}

/* --------------------------------------- a page's canonical and its og:url */

/*
 * The two must be the same path, and the only safe way to do that is one
 * expression.
 *
 * Every page set `alternates.canonical` and none of the dynamic routes set
 * `openGraph.url`, so they inherited the root layout's — the homepage. Next
 * merges metadata rather than replacing it, which means the fault is
 * invisible from inside the site: the page is correct, the canonical is
 * correct, and every share of a departure previewed as the front page. It
 * only appears in somebody else's chat window, on the one link that was
 * supposed to be checkable.
 *
 * `pageMetadata` derives both from a single `path`, so a page that uses it
 * cannot disagree with itself. A page that hand-writes its metadata has to
 * prove the two paths match.
 */
const metadataPages = pageFiles.filter(
  (f) => f.endsWith("page.tsx") || f.endsWith("layout.tsx"),
);

const normalisePath = (expression: string) =>
  expression
    .trim()
    .replace(/^[`"']|[`"'],?$/g, "")
    .replace(/\$\{siteConfig\.url\}/g, "")
    .trim();

for (const file of metadataPages) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const code = executable(await readFile(file, "utf8"));

  const canonical = code.match(
    /canonical:\s*(`[^`]*`|\"[^\"]*\"|'[^']*'|[A-Za-z_$][\w$.]*)/,
  );
  if (!canonical) continue;

  /* Derived from one path: the two cannot drift, so there is nothing to check. */
  if (callsFunction(code, "pageMetadata")) continue;

  const ogUrl = code.match(
    /openGraph:[\s\S]{0,800}?\burl:\s*(`[^`]*`|\"[^\"]*\"|'[^']*'|[A-Za-z_$][\w$.]*)/,
  );
  if (!ogUrl) {
    fail(
      rel,
      "canonical-without-og-url",
      "sets a canonical and no openGraph.url, so it inherits the layout's — every share of this page previews as the homepage",
    );
    continue;
  }

  const wanted = normalisePath(canonical[1]);
  const got = normalisePath(ogUrl[1]);
  if (wanted !== got) {
    fail(
      rel,
      "canonical-disagrees-with-og-url",
      `is canonical at "${wanted}" and shares as "${got}"`,
    );
  }
}

/* ------------------------------------------ the team page's own figures */

/*
 * A count typed beside a roster is a count that will be wrong by Tuesday.
 *
 * "Four guides, three at the top tier" is the sentence somebody writes once
 * and nobody revisits, and the roster it describes changes every time a
 * licence copy arrives. The page composes from `rosterSummary()` today; this
 * is what stops the next edit from typing over it.
 *
 * Two halves, both falsifiable: the helper must actually be called, and no
 * number the reader sees may match a roster figure without an expression
 * behind it.
 */
const teamSource = await readFile(
  path.join(root, "src/app/team/page.tsx"),
  "utf8",
).catch(() => "");

if (!teamSource) {
  fail("team", "missing-page", "there is no /team page");
} else {
  const summary = rosterSummary();
  const code = executable(teamSource);

  if (!callsFunction(code, "rosterSummary")) {
    fail(
      "team",
      "team-figures-not-derived",
      "does not call rosterSummary(), so whatever figures it shows were written by hand",
    );
  }

  /*
   * Numbers in the text a reader sees, rather than inside an expression.
   *
   * The first version of this only matched a digit alone between two tags —
   * `<dd>4</dd>` — and the negative test walked straight through it, because
   * the way anybody actually types a figure is in a sentence: "0 of 4". Runs
   * carrying braces or operators are code rather than prose and are skipped.
   */
  const rosterFigures = new Set<number>([
    summary.total,
    summary.verified,
    summary.pending,
    summary.withCurrentFirstAid,
    summary.withoutFirstAid,
    summary.withLicenceNumber,
    ...summary.byTier.map((t) => t.guides.length),
  ]);

  for (const run of code.matchAll(/>([^<>{}]{1,200})</g)) {
    const text = run[1];
    if (/[=&|;]/.test(text)) continue;
    for (const number of text.matchAll(/\b(\d{1,4})\b/g)) {
      const typed = Number(number[1]);
      if (!rosterFigures.has(typed)) continue;
      fail(
        "team",
        "team-figures-not-derived",
        `renders "${text.trim().slice(0, 40)}" as text, and ${typed} is a roster figure — a count beside a roster must be read from it`,
      );
    }
  }

  /* And the composed summary must agree with the records it claims to read. */
  const verified = GUIDES.filter((g) => g.status === "verified").length;
  if (summary.total !== GUIDES.length || summary.verified !== verified) {
    fail(
      "team",
      "team-summary-contradicts-records",
      `rosterSummary reports ${summary.total} guides and ${summary.verified} verified; the roster holds ${GUIDES.length} and ${verified}`,
    );
  }
  const tiered = summary.byTier.reduce((n, t) => n + t.guides.length, 0);
  if (tiered !== GUIDES.length) {
    fail(
      "team",
      "team-summary-contradicts-records",
      `the tier breakdown accounts for ${tiered} of ${GUIDES.length} guides, so someone holds a tier the page does not list`,
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
console.log(
  `  ok    /team composes ${GUIDES.length} guide records, ${rosterSummary().verified} verified, none typed`,
);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
