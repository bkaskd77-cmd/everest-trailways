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
 * So every rule worth relying on gets a mutation here. The file is edited, the
 * guard is run, the expected failure is required, and the file is put back. A
 * guard that does not fail its own mutation is a guard that is not working, and
 * that is a build failure like any other.
 *
 * Deliberately not run inside `pnpm build`: it rewrites source files, and a
 * build that mutates the tree it is building is a bad idea even when it tidies
 * up after itself. It is a separate command, run when guards change.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
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
];

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

if (problems.length) {
  console.log("\n  Problems:");
  for (const problem of problems) console.log(`    ${problem}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${MUTATIONS.length} guards proven to fail when they should\n`,
  );
}
