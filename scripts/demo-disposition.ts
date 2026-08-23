/**
 * Move one cost line and show everything that moves with it.
 *
 *     pnpm demo:disposition <departureId> <lineId> <newDisposition>
 *
 * This exists because the claim "the whole page recomposes from line state"
 * is easy to make and easy to be wrong about. The failure it guards against is
 * not a crash — it is a page where the total drops by $40 and a sentence three
 * sections down still says the price covers everything.
 *
 * So this flips a line, rebuilds the departure from the same functions the
 * site renders from, and prints a diff of every derived thing: the price, all
 * three tables with their category subtotals, the estimable-extras figure, and
 * every composed sentence whose text changed. Nothing here re-implements the
 * arithmetic — if the demo shows a number moving, it moved because the site's
 * own selector said so.
 *
 * It writes nothing. The change lives in memory for one run.
 */

import {
  type CostLine,
  type CostSheet,
  type Departure,
  type Disposition,
  departures,
  estimableExtras,
  lineAmount,
  lineVaries,
  notProvidedLines,
  optionalLines,
  payableOnArrival,
  providedLines,
  sheetPrice,
} from "../src/content/departures.ts";
import { buildFaqs } from "../src/content/trek-detail.ts";

const [departureId, lineId, next] = process.argv.slice(2);

if (!departureId || !lineId || !next) {
  console.error(
    "\n  usage: pnpm demo:disposition <departureId> <lineId> <provided|not-provided|optional|retired>\n",
  );
  process.exit(1);
}

const DISPOSITIONS = ["provided", "not-provided", "optional", "retired"];
if (!DISPOSITIONS.includes(next)) {
  console.error(
    `\n  "${next}" is not a disposition. One of: ${DISPOSITIONS.join(", ")}\n`,
  );
  process.exit(1);
}

const found = departures.find((d) => d.id === departureId);
if (!found) {
  console.error(`\n  no departure "${departureId}"\n`);
  process.exit(1);
}
/* Re-bound so the narrowing survives into the closures below. */
const before: Departure = found;
const beforeSheet: CostSheet = found.costSheet;

const target = before.costSheet.lines.find((l) => l.id === lineId);
if (!target) {
  console.error(
    `\n  no line "${lineId}" on ${departureId}. Lines:\n${before.costSheet.lines
      .map(
        (l) => `    ${l.id.padEnd(22)} ${l.disposition.padEnd(13)} ${l.label}`,
      )
      .join("\n")}\n`,
  );
  process.exit(1);
}

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

/**
 * What a line becomes when it changes state.
 *
 * A disposition change is not a flag flip: a provided line carries an amount
 * and a payee, and the same line as not-provided carries an estimate, who you
 * now pay, and when. Admin will fill those in; here they are derived from what
 * the line already knew, which is what makes the demo honest — the estimate
 * shown is the cost we were charging, not a number invented for the diff.
 */
function moved(line: CostLine, disposition: Disposition): CostLine {
  const amount = lineAmount(line);
  const base = { ...line, disposition, dispositionChangedOn: "2026-08-23" };

  if (disposition === "not-provided") {
    return {
      ...base,
      amountUSD: undefined,
      basis: undefined,
      payableTo: undefined,
      estimatedAmountUSD: amount || "varies",
      whoYouPay: line.payableTo ?? "The operator providing it",
      payableWhen: "on arrival",
    };
  }
  if (disposition === "provided" || disposition === "optional") {
    return {
      ...base,
      amountUSD: amount,
      basis: line.basis ?? "per-person",
      payableTo: line.payableTo ?? line.whoYouPay ?? "Everest Trailways",
      estimatedAmountUSD: undefined,
      whoYouPay: undefined,
      payableWhen: undefined,
    };
  }
  return base;
}

const afterSheet: CostSheet = {
  ...before.costSheet,
  lines: before.costSheet.lines.map((l) =>
    l.id === lineId ? moved(l, next as Disposition) : l,
  ),
};

const afterPrice = sheetPrice(afterSheet);
const after: Departure = {
  ...before,
  priceUSD: afterPrice,
  costSheet: afterSheet,
  faqs: [],
};
after.faqs = buildFaqs(after);

/* ------------------------------------------------------------------ output */

const rule = (s: string) => `\n  ${s}\n  ${"-".repeat(s.length)}`;

console.log(`\n  ${before.trekName} — ${before.id}`);
console.log(
  `  moving "${target.label}" (${lineId}) from ${target.disposition} to ${next}`,
);

console.log(rule("PRICE"));
console.log(`    before  ${money(before.priceUSD)}`);
console.log(
  `    after   ${money(afterPrice)}   ${
    afterPrice === before.priceUSD
      ? "(unchanged)"
      : `(${afterPrice > before.priceUSD ? "+" : ""}${money(afterPrice - before.priceUSD)})`
  }`,
);

function table(name: string, get: (s: CostSheet) => CostLine[]) {
  const b = get(beforeSheet);
  const a = get(afterSheet);
  const bTotal = b.reduce((sum, l) => sum + lineAmount(l), 0);
  const aTotal = a.reduce((sum, l) => sum + lineAmount(l), 0);

  console.log(rule(name.toUpperCase()));
  console.log(
    `    lines   ${b.length} → ${a.length}      total ${money(bTotal)} → ${money(aTotal)}`,
  );

  /* Category subtotals, because those move too and nobody watches them. */
  const cats = [...new Set([...b, ...a].map((l) => l.category))].sort();
  for (const cat of cats) {
    const bc = b
      .filter((l) => l.category === cat)
      .reduce((s, l) => s + lineAmount(l), 0);
    const ac = a
      .filter((l) => l.category === cat)
      .reduce((s, l) => s + lineAmount(l), 0);
    if (bc === ac) continue;
    console.log(`      ${cat.padEnd(15)} ${money(bc)} → ${money(ac)}`);
  }

  const gone = b.filter((l) => !a.some((x) => x.id === l.id));
  const came = a.filter((l) => !b.some((x) => x.id === l.id));
  for (const l of gone) console.log(`      - ${l.label}`);
  for (const l of came) {
    console.log(
      `      + ${l.label}   ${lineVaries(l) ? "varies" : money(lineAmount(l))}${
        l.whoYouPay ? `, paid to ${l.whoYouPay} ${l.payableWhen}` : ""
      }`,
    );
  }
}

table("Provided — in the price", providedLines);
table("Not included — estimates", notProvidedLines);
table("Optional — not in the price", optionalLines);

console.log(rule("ESTIMABLE EXTRAS"));
const be = estimableExtras(before.costSheet);
const ae = estimableExtras(afterSheet);
console.log(
  `    before  roughly ${money(be.total)} across ${be.counted} lines${be.varies ? `, ${be.varies} unpriced` : ""}`,
);
console.log(
  `    after   roughly ${money(ae.total)} across ${ae.counted} lines${ae.varies ? `, ${ae.varies} unpriced` : ""}`,
);

/* --------------------------------------------------- the composed sentences */

const arrivalSentence = (d: Departure) => {
  const arrival = payableOnArrival(d.costSheet);
  const total = arrival.reduce((sum, l) => sum + lineAmount(l), 0);
  return arrival.length === 0
    ? "This is the full price. There is nothing to pay on arrival."
    : `This is the full price of what we provide. What you pay for yourself on arrival in Nepal: ${arrival
        .map((l) => l.label)
        .join(", ")}${total > 0 ? `, roughly ${money(total)}` : ""}.`;
};

const sentences: [string, string, string][] = [
  [
    "cost sheet, on-arrival claim",
    arrivalSentence(before),
    arrivalSentence(after),
  ],
  [
    "cost sheet intro",
    `There are ${before.costSheet.lines.filter((l) => l.disposition !== "retired").length} lines.`,
    `There are ${afterSheet.lines.filter((l) => l.disposition !== "retired").length} lines.`,
  ],
  ...before.faqs.map((f, i): [string, string, string] => [
    `FAQ — ${f.question}`,
    f.answer,
    after.faqs[i]?.answer ?? "(gone)",
  ]),
];

console.log(rule("SENTENCES THAT CHANGED"));
let changed = 0;
for (const [where, b, a] of sentences) {
  if (b === a) continue;
  changed += 1;
  console.log(`\n    ${where}`);
  console.log(`      before  ${b}`);
  console.log(`      after   ${a}`);
}
if (changed === 0) console.log("    none");

console.log(
  `\n  ${changed} sentence${changed === 1 ? "" : "s"} recomposed. No file was written.\n`,
);
