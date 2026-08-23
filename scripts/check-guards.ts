/**
 * The meta-guard: does each guard actually catch what it claims to?
 *
 *     pnpm check:guards
 *
 * A guard that passes is ambiguous. It might mean the invariant holds, or it
 * might mean the check is broken and has been silently approving everything.
 * This project has now shipped two of the second kind: a CTA rule whose word
 * boundaries had been mangled into control characters so it matched nothing,
 * and an image rule with the same fault, both of which reported "no problems"
 * for as long as they existed.
 *
 * There are two halves to this file, and they answer different questions.
 *
 * THE LEDGER reads every guard in `scripts/` and extracts the name of every
 * assertion it can emit — currently a hundred and seventy-odd. Each one must
 * then be accounted for: either a mutation below proves it fires, or it is
 * written into UNPROVEN with a reason. An assertion in neither list fails this
 * command. That is the part that holds over time: a rule cannot be added to
 * any guard without somebody deciding, in a file under review, whether it is
 * tested — which is exactly the decision that was skipped both times a broken
 * guard shipped.
 *
 * THE MUTATIONS break the source on purpose, run the guard, require the named
 * failure, and put the file back. That is the stronger proof and it is the one
 * that cannot be automated: the semantics of "a cost sheet that does not add
 * up" live in a person's head, not in a syntax tree.
 *
 * What this file deliberately does not claim: that the unproven assertions are
 * working. They are unproven. The count is printed every run rather than
 * rounded off, because a number that says "20 of 177" is doing its job and a
 * green tick that says "all guards verified" would be the third broken guard.
 *
 * Deliberately not run inside `pnpm build`: it rewrites source files, and a
 * build that mutates the tree it is building is a bad idea even when it tidies
 * up after itself. It is a separate command, run when guards change.
 */

import { execFile } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();

type Mutation = {
  /** What invariant this proves is being enforced. */
  name: string;
  guard: string;
  file: string;
  /** Applied to the file. Must return changed text or the case is void. */
  break: (source: string) => string;
  /** The rule name the guard must report. */
  expect: string;
};

const MUTATIONS: Mutation[] = [
  {
    // Not a component cost — those re-balance, because the fee is the
    // remainder. Pinning the fee is what makes the sum wrong.
    name: "a cost sheet that does not add up",
    guard: "check-departures.ts",
    file: "src/content/cost-sheets.ts",
    break: (s) => s.replace("    amountUSD: margin,", "    amountUSD: 100,"),
    expect: "ledger-mismatch",
  },
  {
    name: "a sleeping altitude confused with a day maximum",
    guard: "check-departures.ts",
    file: "src/content/cost-sheets.ts",
    break: (s) =>
      s.replace(
        'The highest night on this trek is ${facts.highestSleepM.toLocaleString("en-GB")} m',
        'This trek sleeps as high as ${facts.maxAltitudeM.toLocaleString("en-GB")} m',
      ),
    expect: "altitude-confusion",
  },
  {
    name: "a place name from another region",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    break: (s) =>
      s.replace(
        "Nothing dependable on the trail.",
        "Nothing dependable above Namche.",
      ),
    expect: "foreign-place",
  },
  {
    name: "an altitude the trek never reaches",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    break: (s) =>
      s.replace(
        "Nothing dependable on the trail.",
        "Nothing dependable on the trail above 6,000 m.",
      ),
    expect: "altitude-never-reached",
  },
  {
    name: "staff promised but not paid for",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    break: (s) =>
      s.replace(
        "  const assistant = hasAssistantGuide(d);",
        "  const assistant = true;",
      ),
    expect: "unfunded-staff",
  },
  {
    name: "a cancelled departure still offered in stock",
    guard: "check-departures.ts",
    file: "src/lib/departures-feed.ts",
    break: (s) =>
      // A regex, not a literal: the working tree is checked out with CRLF, so
      // a multi-line literal containing "\n" matches nothing. Every mutation
      // that spans lines has to allow for the carriage return.
      s.replace(
        /case "cancelled":[\s\S]*?return null;/,
        'case "cancelled":\n      return "https://schema.org/InStock";',
      ),
    expect: "stale-instock",
  },
  {
    name: "a listing that does not filter to bookable dates",
    guard: "check-departures.ts",
    file: "src/components/departure/departure-index.tsx",
    break: (s) =>
      s.replace(
        "departures.filter((d) => isBookable(d))",
        "departures.slice()",
      ),
    expect: "bookable-listing",
  },
  {
    name: "a booking promise with nowhere to book",
    guard: "check-links.ts",
    file: "src/app/departures/[slug]/page.tsx",
    break: (s) => s.replace('? "Ask about this date"', '? "Reserve a seat"'),
    expect: "dishonest-cta",
  },
  {
    name: "a link to a page that does not exist",
    guard: "check-links.ts",
    file: "src/app/departures/page.tsx",
    // It has to be an `href`. The guard reads links, and a route name hidden
    // in some other key is not a link — an earlier version of this mutation
    // put the path in a metadata field and proved nothing.
    break: (s) => s.replace('href="/treks"', 'href="/treks-and-tours"'),
    expect: "dead-link",
  },
  {
    name: "an image bypassing the slot registry",
    guard: "build-image-spec.ts",
    file: "src/components/departure/practicalities.tsx",
    break: (s) =>
      s.replace(
        "import { SectionHead }",
        'import Image from "next/image";\nimport { SectionHead }',
      ),
    expect: "imports next/image directly",
  },
  {
    name: "a secret reachable from the browser",
    guard: "check-security.ts",
    file: "src/components/departure/glance-bar.tsx",
    break: (s) =>
      s.replace(
        '"use client";',
        '"use client";\nconst k = process.env.ANTHROPIC_API_KEY;\nvoid k;',
      ),
    expect: "secret-in-client",
  },
  {
    name: "a timer loop that cannot be paused",
    guard: "check-motion.ts",
    file: "src/components/departure/hero-slider.tsx",
    break: (s) => s.replace(/prefers-reduced-motion/g, "REMOVED"),
    expect: "unpausable-loop",
  },

  /* ------------------------------------------------- step 9: the trek pages */

  {
    // The section the whole page is built around. If it can be softened into
    // nothing without anything complaining, it will be.
    name: "a disqualifier softened into a hedge",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) =>
      s.replace(
        /notForYouIf: \[\s*\n\s*"[^"]+"/,
        'notForYouIf: [\n      "This trek is not for everyone and may not suit all fitness levels."',
      ),
    expect: "vague-disqualifier",
  },
  {
    name: "a comparison that argues for us on both sides",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) => s.replace(/chooseOtherIf:\s*\n?\s*"[^"]+"/, 'chooseOtherIf: "Rarely."'),
    expect: "one-sided-comparison",
  },
  {
    name: "a twelve-month table with a month missing",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) => s.replace(/\[1, "avoid", /, "[13, \"avoid\", "),
    expect: "missing-month",
  },
  {
    name: "a seasonal calendar with no bad months in it",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) => s.replace(/"avoid"/g, '"possible"'),
    expect: "no-bad-months",
  },
  {
    name: "a trek page naming a place it does not visit",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) =>
      // Aimed at a named trek, not at the first `routeOverview` in the file.
      // Unanchored, it landed on Everest Base Camp, where Namche is not a
      // foreign place at all and the mutation was quietly true.
      s.replace(
        /(id: "bardia-wildlife",[\s\S]*?routeOverview:\s*\n?\s*")/,
        '$1Namche Bazaar, then west. ',
      ),
    expect: "foreign-place",
  },
  {
    name: "a trek page citing an altitude its route never reaches",
    guard: "check-treks.ts",
    file: "src/content/trek-pages.ts",
    break: (s) =>
      s.replace(
        /(id: "poon-hill",[\s\S]*?summary:\s*\n?\s*")/,
        "$1The route tops out at 8,848 m. ",
      ),
    expect: "altitude-never-reached",
  },
  {
    name: "a cancelled date quietly dropped from its trek's archive",
    guard: "check-treks.ts",
    file: "src/content/departures.ts",
    break: (s) =>
      // A regex again: the tree is CRLF, so the multi-line literal this
      // started as matched nothing and the case reported VOID.
      s.replace(
        /\.filter\(\s*\(d\) => d\.trekId === trekId && lifecycle\(d, now\) === "cancelled",?\s*\)/,
        ".filter(() => false)",
      ),
    expect: "missing-from-archive",
  },
  {
    name: "the same photograph in the header and the grid",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    /*
     * Aimed at the exclusion, not at the category list.
     *
     * Adding a category to HEADER_CATEGORIES used to create the overlap. It
     * stopped once `gridImages` began subtracting whatever the header holds —
     * the category simply moved sides. The only way to get an image onto both
     * halves now is to remove that subtraction, which is exactly the line
     * worth guarding: it is what keeps a promoted photograph from appearing
     * twice on the page.
     */
    break: (s) => s.replace(/\s*!header\.includes\(g\) &&/, ""),
    expect: "gallery-both-sides",
  },
  {
    // The bug this pair exists for: every slot filled, no photograph in any of
    // them, and a hero that looks like a broken page.
    name: "a hero slider of nothing but placeholders",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    break: (s) =>
      s.replace(
        "  if (preferred.some((g) => g.src)) return preferred;",
        "  return preferred;",
      ),
    expect: "all-placeholder-half",
  },
  {
    name: "a trek page with no photograph to open on",
    guard: "check-treks.ts",
    file: "src/content/trek-detail.ts",
    // Every image becomes a pending slot, so no trek has anything to borrow.
    break: (s) => s.replace(/^(\s*)src:/gm, "$1pendingSrc:"),
    expect: "no-hero-photograph",
  },
  {
    name: "a gallery category that renders in neither half",
    guard: "check-departures.ts",
    file: "src/content/trek-detail.ts",
    break: (s) =>
      s.replace(
        'export const HEADER_CATEGORIES = ["landscape", "trail"] as const;',
        'export const HEADER_CATEGORIES = ["landscape"] as const;',
      ),
    expect: "gallery-orphan",
  },
];

/* -------------------------------------------------------------- the ledger */

/**
 * Assertions with no mutation, and why.
 *
 * Every entry here is an admission, not an exemption. The reasons fall into
 * three kinds, and only the first is comfortable:
 *
 *   "structural" — the rule fires on a shape the type system already forbids,
 *   so breaking it means writing code that does not compile, and a mutation
 *   would be testing tsc.
 *
 *   "adjacent" — a sibling rule in the same block is mutated, so the code path
 *   is exercised and the specific branch is not.
 *
 *   "untested" — no reason beyond time. These are the ones that could be
 *   quietly broken today, and the count is printed on every run so that stays
 *   uncomfortable.
 *
 * The ledger fails if an assertion exists in a guard and appears in neither
 * this map nor a mutation. That is the whole point: a new rule cannot be
 * written without somebody deciding which of these it is.
 */
const UNPROVEN: Record<string, string> = {};

const KIND = {
  structural: "structural",
  adjacent: "adjacent",
  untested: "untested",
  /*
   * Proven by running, not by mutating.
   *
   * `qa-pages.ts` asserts against a browser holding a real page — overflow,
   * empty sections, content that never painted. Mutation-testing those would
   * mean rebuilding the site inside this script and breaking a stylesheet to
   * see whether the checker notices, which is a slower and less honest version
   * of what `pnpm qa` already does every time it runs against a real build.
   */
  runtime: "runtime",
} as const;

for (const rule of [
  "horizontal-overflow",
  "page-never-revealed",
  "empty-section",
  "broken-image",
  "thin-page",
  "placeholder-hero",
  "console-error",
  "heading-count",
  "http-status",
]) UNPROVEN[rule] = KIND.runtime;

/** Rules whose failure shape the compiler already prevents. */
for (const rule of [
  "bad-coords", "no-coords", "bad-dates", "bad-range", "bad-extra",
  "missing-unit", "fractional-line", "negative-line", "bad-price",
  "day-numbering", "day-count", "impossible-day", "bad-slug", "duplicate-slug",
  "duplicate-id", "bad-days", "unknown-id", "bad-options", "no-routes",
  "no-proxy", "unresolved-dynamic",
]) UNPROVEN[rule] = KIND.structural;

/** Siblings of a mutated rule, in the same block, on the same code path. */
for (const rule of [
  "altitude-contradiction", "altitude-drift", "days-drift", "orphan-trek",
  "orphan-departure", "thin-comparisons", "bad-comparison", "thin-month",
  "thin-disqualifiers", "incoherent-archive", "no-permits",
  "gallery-empty-half", "gallery-missing-basics", "gallery-thin-caption",
  "gallery-no-alt", "gallery-stray-alt", "thin-gallery",
  "marketing-adjective", "cancelled-offer", "status-contradiction",
]) UNPROVEN[rule] = KIND.adjacent;

/* Everything else, named one at a time so the list cannot grow by accident. */
for (const rule of [
  "acclimatisation-drift", "admin-not-split", "ambiguous-who-pays",
  "basis-mismatch", "bad-faq", "bad-tipping", "double-punctuation",
  "duplicate-faq", "empty-excludes", "faq-avoids-the-question",
  "faq-contradiction", "group-cap", "group-mismatch", "implausible-margin",
  "impossible-guarantee", "insurance-optional", "insurance-thin",
  "intro-unsupported", "missing-cost-sheet", "missing-decision-date",
  "missing-sleep-altitude", "missing-supplement", "no-contingencies",
  "no-destination", "no-excludes", "no-fee", "no-ledger",
  "no-lukla-contingency", "no-meals", "no-practicalities", "no-return",
  "no-shared-policy", "no-summary", "past-departure", "pdf-broken",
  "pdf-empty", "pdf-malformed", "pdf-mismatch", "practicalities-gap",
  "practicalities-thin", "ramechhap-claim", "single-room-contradiction",
  "stale-decision-date", "supplement-missing", "thin-answer",
  "thin-contingency", "thin-faq", "wages-buried",
  "altitude-refusal", "beyond-and-match", "beyond-unexplained",
  "beyond-without-breach", "booking-refusal", "breach-in-matches",
  "date-window", "empty-caution", "empty-message", "empty-reason",
  "experience-filtered", "fence-breakable", "injection-survived",
  "limiter-broken", "missed-booking", "missed-days", "missed-medical",
  "missed-trek-name", "missing-constraint", "no-fallback",
  "no-honest-decline", "no-rate-limit", "no-spend-ceiling", "sanitiser-weak",
  "stale-intent", "too-many-matches", "too-many-questions", "uncapped-tokens",
  "uncautioned-stretch", "untagged-trek", "untrusted-output",
  "willingness-ceiling",
  "infinite-loop", "meter-gap", "meter-order", "over-budget",
  "reduced-motion", "untagged-motion",
  "fails-open", "matcher-unsafe", "missing-header", "no-origin-check",
  "raw-html", "server-module-in-client", "unbounded-input", "unlimited-route",
  "vulnerable-dependency", "weak-csp", "weak-header",
  "missing-proof", "verified-with-placeholder",
  /*
   * These eight were invisible to the inventory until the extractor learned
   * that `fail()` sometimes takes a quoted first argument — `fail("meter",
   * "low-contrast", …)` rather than `fail(id, …)`. They had been running all
   * along; nothing was accounting for them. It is a small illustration of the
   * point of this file: the assertions you cannot see are the ones nobody
   * checks.
   */
  "too-few", "missing-ask", "feed-shape", "missing-token", "palette-drift",
  "low-contrast", "flat-zones", "feed-docs",
]) UNPROVEN[rule] = KIND.untested;

/**
 * Every assertion name a guard can emit.
 *
 * Read out of the source rather than maintained by hand, so the ledger cannot
 * fall behind the guards it is accounting for. The two shapes this codebase
 * uses are `fail(id, "rule-name", detail)` and the object form with a `rule:`
 * key; both put the name in a kebab-case string literal.
 */
const RULE =
  /(?:rule:\s*|fail\(\s*(?:(?:"[^"]*"|[^"(),]{0,40}),\s*)?)"([a-z][a-z0-9]*(?:-[a-z0-9]+)+)"/g;

async function inventory() {
  const dir = path.join(root, "scripts");
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith(".ts") && f !== "check-guards.ts",
  );
  const found = new Map<string, string[]>();
  for (const file of files) {
    const source = await readFile(path.join(dir, file), "utf8");
    for (const match of source.matchAll(RULE)) {
      const rule = match[1];
      found.set(rule, [...(found.get(rule) ?? []), file]);
    }
  }
  return found;
}

/* ------------------------------------------------------------------- run */

const args = (guard: string) =>
  guard === "build-image-spec.ts"
    ? [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        `scripts/${guard}`,
        "--check",
      ]
    : ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", `scripts/${guard}`];

const problems: string[] = [];

console.log("\n  Guards, tested against their own invariants\n");

for (const mutation of MUTATIONS) {
  const target = path.join(root, mutation.file);
  const original = await readFile(target, "utf8");
  const broken = mutation.break(original);

  if (broken === original) {
    problems.push(
      `${mutation.name}: the mutation changed nothing — the code it targets has moved, so this case proves nothing`,
    );
    console.log(`  VOID   ${mutation.name}`);
    continue;
  }

  await writeFile(target, broken, "utf8");
  let output = "";
  try {
    const result = await run("node", args(mutation.guard), { cwd: root });
    output = result.stdout;
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  } finally {
    await writeFile(target, original, "utf8");
  }

  const caught = output.includes(mutation.expect);
  console.log(`  ${caught ? "ok    " : "FAIL  "} ${mutation.name}`);
  if (!caught) {
    problems.push(
      `${mutation.guard} did not report "${mutation.expect}" when ${mutation.name} was introduced`,
    );
  }
}

/* ---------------------------------------------------------- the ledger run */

const all = await inventory();
const proven = new Set(MUTATIONS.map((m) => m.expect));

const unaccounted: string[] = [];
for (const [rule, files] of all) {
  if (proven.has(rule)) continue;
  if (rule in UNPROVEN) continue;
  unaccounted.push(`${rule} (${[...new Set(files)].join(", ")})`);
}

/* An entry that no longer names a real assertion is an entry that has stopped
   accounting for anything, and it hides the rule that replaced it. */
const stale = Object.keys(UNPROVEN).filter((rule) => !all.has(rule));

const counts = { structural: 0, adjacent: 0, untested: 0, runtime: 0 };
for (const rule of all.keys()) {
  const kind = UNPROVEN[rule];
  if (kind && kind in counts) counts[kind as keyof typeof counts] += 1;
}
const provenHere = [...all.keys()].filter((r) => proven.has(r)).length;

console.log("\n  The ledger\n");
console.log(`  ${all.size} assertions across every guard in scripts/`);
console.log(`    ${provenHere} proven live by a mutation above`);
console.log(`    ${counts.structural} structural — the compiler forbids the failing shape`);
console.log(`    ${counts.adjacent} adjacent — a sibling rule on the same path is mutated`);
console.log(`    ${counts.untested} untested — no reason beyond time`);
console.log(
  `    ${counts.runtime} runtime — asserted against a real page by \`pnpm qa\``,
);

if (unaccounted.length) {
  console.log("\n  Assertions accounted for nowhere:");
  for (const rule of unaccounted) console.log(`    ${rule}`);
  problems.push(
    `${unaccounted.length} assertion(s) have neither a mutation nor an entry in UNPROVEN — decide which, in scripts/check-guards.ts`,
  );
}

if (stale.length) {
  console.log("\n  Ledger entries naming assertions that no longer exist:");
  for (const rule of stale) console.log(`    ${rule}`);
  problems.push(
    `${stale.length} stale ledger entr(ies) — the rule was renamed or removed, so the entry is accounting for nothing`,
  );
}

if (problems.length) {
  console.log("\n  Problems:");
  for (const problem of problems) console.log(`    ${problem}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${MUTATIONS.length} mutations, every one caught. ${counts.untested} assertions remain unproven.\n`,
  );
}
