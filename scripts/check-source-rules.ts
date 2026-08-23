/**
 * The source readers, tested against declaration-only fixtures.
 *
 *     pnpm check:source-rules
 *
 * Twice a guard passed on something that never runs: an unused import, and a
 * helper's own declaration. Both were the same mistake — asking whether a NAME
 * appears, when the question is whether the code DOES something. Every guard
 * that reads source now goes through `scripts/lib/source.ts`, and this proves
 * the readers themselves behave.
 *
 * Fixtures rather than mutations: a mutation proves one guard catches one
 * defect on the real codebase, and what needs proving here is a property of
 * the reader across shapes the codebase does not currently contain. If someone
 * writes `const x = () => checkLimit` tomorrow, this is where it is caught.
 */

import {
  callsFunction,
  executable,
  rendersComponent,
  usesIdentifier,
} from "./lib/source.ts";

type Case = {
  what: string;
  source: string;
  /** What the reader must answer. */
  expect: boolean;
  run: (source: string) => boolean;
};

const CASES: Case[] = [
  /* ------------------------------- callsFunction: must be a real call */
  {
    what: "an unused import does not count as calling it",
    source: `import { checkLimit } from "@/lib/rate-limit";\nexport async function POST() { return new Response("ok"); }`,
    expect: false,
    run: (s) => callsFunction(s, "checkLimit"),
  },
  {
    what: "the function's own declaration does not count as calling it",
    source: `export function policyIsApproved(id: string) { return true; }\nexport const metadata = { robots: { index: true } };`,
    expect: false,
    run: (s) => callsFunction(s, "policyIsApproved"),
  },
  {
    what: "an arrow declaration does not count as calling it",
    source: `const originAllowed = (req: Request) => true;\nexport async function POST() { return new Response("ok"); }`,
    expect: false,
    run: (s) => callsFunction(s, "originAllowed"),
  },
  {
    what: "a commented-out call does not count",
    source: `export async function POST() {\n  // checkLimit("match:ip", ip, LIMIT);\n  return new Response("ok");\n}`,
    expect: false,
    run: (s) => callsFunction(s, "checkLimit"),
  },
  {
    what: "a call inside a block comment does not count",
    source: `/* we used to call buildCsp(nonce) here */\nexport function proxy() {}`,
    expect: false,
    run: (s) => callsFunction(s, "buildCsp"),
  },
  {
    what: "a name inside a re-export does not count",
    source: `export { checkLimit } from "@/lib/rate-limit";\nexport async function POST() { return new Response("ok"); }`,
    expect: false,
    run: (s) => callsFunction(s, "checkLimit"),
  },
  {
    what: "a property access on another object does not count",
    source: `export async function POST() { return other.checkLimit(1); }`,
    expect: false,
    run: (s) => callsFunction(s, "checkLimit"),
  },
  {
    what: "an actual call counts",
    source: `import { checkLimit } from "@/lib/rate-limit";\nexport async function POST() {\n  await checkLimit("match:ip", ip, LIMIT);\n  return new Response("ok");\n}`,
    expect: true,
    run: (s) => callsFunction(s, "checkLimit"),
  },
  {
    /*
     * The regression this file caught while being written. A blanket
     * "not preceded by a dot" rejected a spread, so the strengthened rule
     * failed on a file that was calling the function on the line it read.
     */
    what: "a call inside a spread counts",
    source: `const shown = [...bookableDepartures()].slice(0, 6);`,
    expect: true,
    run: (s) => callsFunction(s, "bookableDepartures"),
  },

  /* ------------------------- usesIdentifier: constants, not functions */
  {
    what: "an unused import of a constant does not count as using it",
    source: `import { MAX_BODY_BYTES } from "@/lib/limits";\nexport async function POST() { return new Response("ok"); }`,
    expect: false,
    run: (s) => usesIdentifier(s, "MAX_BODY_BYTES"),
  },
  {
    what: "a constant's own declaration does not count as using it",
    source: `const STATIC_SECURITY_HEADERS = [];\nexport default {};`,
    expect: false,
    run: (s) => usesIdentifier(s, "STATIC_SECURITY_HEADERS"),
  },
  {
    what: "an actual reference counts",
    source: `import { MAX_BODY_BYTES } from "@/lib/limits";\nexport async function POST(r: Request) {\n  if (r.headers.get("content-length") > MAX_BODY_BYTES) return;\n}`,
    expect: true,
    run: (s) => usesIdentifier(s, "MAX_BODY_BYTES"),
  },

  /* --------------------------- rendersComponent: in the tree, not imported */
  {
    what: "an unused component import does not count as rendering it",
    source: `import { DocumentPage } from "@/components/trust/document-page";\nexport default function Page() { return <main>hi</main>; }`,
    expect: false,
    run: (s) => rendersComponent(s, "DocumentPage"),
  },
  {
    what: "a component named only in a comment does not count",
    source: `/* GlanceBar is deliberately not used here — see the note. */\nexport default function Page() { return <main>hi</main>; }`,
    expect: false,
    run: (s) => rendersComponent(s, "GlanceBar"),
  },
  {
    what: "a rendered component counts",
    source: `import { DocumentPage } from "@/components/trust/document-page";\nexport default function Page() { return <DocumentPage title="x" />; }`,
    expect: true,
    run: (s) => rendersComponent(s, "DocumentPage"),
  },

  /* -------------------------------------------------- executable itself */
  {
    what: "a type alias naming a function is stripped",
    source: `type Handler = typeof checkLimit;\nexport async function POST() { return new Response("ok"); }`,
    expect: false,
    run: (s) => usesIdentifier(s, "checkLimit"),
  },
  {
    what: "a URL in a string is not mistaken for a comment",
    source: `const url = "https://example.com/x";\nexport function go() { return buildCsp(url); }`,
    expect: true,
    run: (s) => callsFunction(s, "buildCsp"),
  },
];

const problems: string[] = [];

console.log("\n  Source readers, against declaration-only fixtures\n");

for (const c of CASES) {
  const got = c.run(c.source);
  const ok = got === c.expect;
  console.log(`  ${ok ? "ok    " : "FAIL  "} ${c.what}`);
  if (!ok) {
    problems.push(
      `${c.what}: expected ${c.expect}, got ${got}\n      executable text: ${JSON.stringify(
        executable(c.source).replace(/\s+/g, " ").trim().slice(0, 120),
      )}`,
    );
  }
}

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    ${p}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${CASES.length} fixtures. No reader is satisfied by a declaration, an import, a comment or a type.\n`,
  );
}
