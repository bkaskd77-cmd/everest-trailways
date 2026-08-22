/**
 * Motion budget guard.
 *
 *     pnpm check:motion
 *
 * Restraint is the brand, and restraint is the first thing that erodes — one
 * more delay here, one more repeat there, and a year later the site fidgets.
 * So the rules are checked rather than remembered:
 *
 *   1. Nothing runs longer than MAX_DURATION. Past that a transition stops
 *      reading as a response and starts reading as a wait.
 *   2. The seat meter is four beats, not four events: each beat has to start
 *      before the one before it has finished, and the whole sequence has to fit
 *      the budget.
 *   3. Every animated element carries `data-motion`. That attribute is the only
 *      thing standing between a reduced-motion reader and the animation they
 *      asked not to see — the CSS in globals.css pins those elements to their
 *      resting state, and an untagged one silently opts out of it.
 *   4. Exactly one thing loops forever, and it is the scroll cue.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  COUNT,
  DURATION,
  LAYOUT,
  MAX_DURATION,
  METER,
  METER_TOTAL,
} from "../src/lib/motion.ts";

type Problem = { rule: string; detail: string };
const problems: Problem[] = [];
const fail = (rule: string, detail: string) => problems.push({ rule, detail });

const root = process.cwd();

/* ------------------------------------------------- 1. the duration ceiling */

const budgets: [string, number][] = [
  ["DURATION.slow", DURATION.slow],
  ["DURATION.base", DURATION.base],
  ["LAYOUT.duration", Number(LAYOUT.duration ?? 0)],
  ["METER total (four beats)", METER_TOTAL + METER.maxCardDelay],
  ["COUNT longest run", (COUNT.baseMs * (1 + COUNT.jitter)) / 1000],
  // Worst case is the longest figure in the trust strip; "100%" is four glyphs.
  ["COUNT glyph assembly", 3 * COUNT.glyphStep + COUNT.glyphMs / 1000],
];

for (const [name, seconds] of budgets) {
  if (seconds > MAX_DURATION) {
    fail(
      "over-budget",
      `${name} is ${seconds.toFixed(2)}s — the ceiling is ${MAX_DURATION}s`,
    );
  }
}

/* -------------------------------------------------- 2. the meter is a phrase */

const beats: [string, number, number][] = [
  ["track", METER.track.delay, METER.track.duration],
  ["fill", METER.fill.delay, METER.fill.duration],
  // A spring has no duration; it is timed by its own physics, so only its
  // ordering against the beat before it is checkable here.
  ["tick", METER.tick.delay, 0],
  ["label", METER.label.delay, METER.label.duration],
];

for (let i = 1; i < beats.length; i += 1) {
  const [name, delay] = beats[i];
  const [prevName, prevDelay, prevDuration] = beats[i - 1];
  if (delay <= prevDelay) {
    fail("meter-order", `${name} does not start after ${prevName}`);
  }
  if (prevDuration > 0 && delay >= prevDelay + prevDuration) {
    fail(
      "meter-gap",
      `${name} starts after ${prevName} has finished — the beats should overlap, or the meter reads as four separate events`,
    );
  }
}

/* ------------------------------------- 3. every animated element is taggable */

async function tsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await tsxFiles(full)));
    else if (entry.name.endsWith(".tsx")) found.push(full);
  }
  return found;
}

/** The opening tag's attribute text, brace-aware so `className={cn(...)}` is safe. */
function openingTag(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (ch === ">" && depth === 0) return source.slice(from, i);
  }
  return source.slice(from);
}

/**
 * `data-motion` is the general pin, but the hero has two elements that must not
 * carry it: forcing every slide and every progress fill visible is exactly the
 * wrong resting state. Those are handled by name in the reduced-motion block
 * instead — so the exception is not a list kept here, it is read back out of
 * the stylesheet. An element is covered if it is tagged, or if one of its
 * attributes is one the reduced-motion block actually targets.
 */
const css = await readFile(path.join(root, "src/styles/globals.css"), "utf8");
const reducedBlockStart = css.indexOf(
  "@media (prefers-reduced-motion: reduce)",
);
const reducedBlock =
  reducedBlockStart < 0
    ? ""
    : css.slice(reducedBlockStart, css.indexOf("\n}\n", reducedBlockStart));
const pinnedByName = new Set(
  [...reducedBlock.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]),
);

if (pinnedByName.size === 0) {
  fail(
    "reduced-motion",
    "the reduced-motion block in globals.css targets nothing — every animation is unpinned",
  );
}

const files = await tsxFiles(path.join(root, "src"));
let tagged = 0;
let pinned = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");

  for (const match of source.matchAll(/<m\.[a-zA-Z]+/g)) {
    const attrs = openingTag(source, match.index + match[0].length);
    // A component that only forwards variants from a parent still animates.
    if (/\bdata-motion\b/.test(attrs)) {
      tagged += 1;
    } else if ([...pinnedByName].some((attr) => attrs.includes(attr))) {
      pinned += 1;
    } else {
      const line = source.slice(0, match.index).split("\n").length;
      fail(
        "untagged-motion",
        `${rel}:${line} ${match[0]} is neither tagged data-motion nor named in the reduced-motion block, so nothing pins it`,
      );
    }
  }

  /* ------------------------------------------------ 4. one infinite loop */

  for (const match of source.matchAll(/repeat:\s*Infinity/g)) {
    if (!rel.endsWith("hero/scroll-cue.tsx")) {
      const line = source.slice(0, match.index).split("\n").length;
      fail(
        "infinite-loop",
        `${rel}:${line} loops forever — only the scroll cue may`,
      );
    }
  }

  /*
   * A timer that advances something is a loop too.
   *
   * The rule above only sees Motion's own `repeat: Infinity`, so an
   * autoplaying carousel driven by `setInterval` walked straight past a guard
   * whose stated principle is that exactly one thing loops forever. Content
   * that moves without being asked is the thing the principle is about, not the
   * API that happens to move it.
   *
   * So a timer loop is allowed, and it has to carry all four of the conditions
   * that make one acceptable. Each is a distinct mechanism: hover is not a
   * substitute for a button on a touchscreen, and a button is not a substitute
   * for honouring reduced motion.
   */
  for (const match of source.matchAll(/setInterval\(/g)) {
    const line = source.slice(0, match.index).split("\n").length;
    const required: [string, RegExp][] = [
      ["honour prefers-reduced-motion", /prefers-reduced-motion/],
      ["pause on hover or focus", /onMouseEnter|onFocusCapture/],
      ["pause when off screen", /IntersectionObserver|visibilitychange/],
      ["offer a visible pause control", /aria-pressed/],
    ];
    for (const [what, pattern] of required) {
      if (!pattern.test(source)) {
        fail(
          "unpausable-loop",
          `${rel}:${line} advances on a timer but does not ${what}`,
        );
      }
    }
  }
}

if (tagged === 0) {
  fail(
    "untagged-motion",
    "found no tagged motion elements at all — the scan is broken",
  );
}

/* ------------------------------------------------------------------ report */

console.log("\n  Motion budget\n");
for (const [name, seconds] of budgets) {
  const flag = seconds > MAX_DURATION ? "FAIL" : "ok";
  console.log(`  ${flag.padEnd(5)} ${name.padEnd(26)} ${seconds.toFixed(2)}s`);
}
console.log(
  `\n  ok    seat meter: ${beats.length} beats, overlapping, ${METER_TOTAL.toFixed(2)}s + up to ${METER.maxCardDelay}s of per-card offset`,
);
console.log(`  ok    ${tagged} animated elements carry data-motion`);
console.log(
  `  ok    ${pinned} more are pinned by name in the reduced-motion block (${[...pinnedByName].join(", ")})`,
);
console.log(
  "  ok    one infinite loop, and it is the scroll cue; every timer loop pauses four ways",
);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
