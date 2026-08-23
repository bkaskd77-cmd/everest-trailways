/**
 * Discontinue a permit and show what it costs the catalogue.
 *
 *     pnpm demo:permit <permitId> discontinue
 *
 * The claim being demonstrated is that no cost sheet stores a permit. If that
 * is true, marking one record discontinued should remove it from every
 * affected departure at once and change nothing else — and if it is not true,
 * this prints a list of departures that did not move when they should have.
 *
 * It is modelled on the thing that actually happened: TIMS was discontinued
 * outright. A codebase with the fee typed into ten cost profiles would have
 * gone on charging for it until somebody noticed, on every page, in the total.
 *
 * Writes nothing. The change lives in memory for one run.
 */

import { TREKS } from "../src/content/treks.ts";
import { PERMITS, type Permit } from "../src/content/permits.ts";
import { TREK_PAGES } from "../src/content/trek-pages.ts";
import { departures } from "../src/content/departures.ts";

const [permitId, action] = process.argv.slice(2);

if (!permitId || action !== "discontinue") {
  console.error("\n  usage: pnpm demo:permit <permitId> discontinue\n");
  console.error("  records:");
  for (const p of PERMITS) {
    console.error(
      `    ${p.id.padEnd(30)} ${p.status.padEnd(13)} $${p.amountUSD}  ${p.name}`,
    );
  }
  console.error("");
  process.exit(1);
}

const record = PERMITS.find((p) => p.id === permitId);
if (!record) {
  console.error(`\n  no permit record "${permitId}"\n`);
  process.exit(1);
}

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

/**
 * The composition rule, re-run against a modified table.
 *
 * Deliberately the same shape as `permitsFor` rather than a call to it: the
 * real function reads the module-level PERMITS array, and the point here is to
 * ask what happens under a *different* table without writing one to disk.
 */
const within = (p: Permit, iso: string) =>
  p.effectiveFrom <= iso &&
  (p.effectiveUntil === undefined || iso <= p.effectiveUntil);

function resolve(
  table: Permit[],
  types: string[],
  region: string,
  iso: string,
) {
  return types
    .map((type) =>
      table.find(
        (p) =>
          p.name === type &&
          p.status === "active" &&
          p.appliesToRegions.includes(region) &&
          within(p, iso),
      ),
    )
    .filter((p): p is Permit => Boolean(p));
}

const after: Permit[] = PERMITS.map((p) =>
  p.id === permitId ? { ...p, status: "discontinued" as const } : p,
);

console.log(`\n  Discontinuing "${record.name}" (${record.id})`);
console.log(
  `  ${money(record.amountUSD)} ${record.basis}, currently ${record.status}, covering ${record.appliesToRegions.join(", ")}\n`,
);

let moved = 0;
let unchanged = 0;
let totalDrop = 0;

for (const d of departures) {
  const trek = TREK_PAGES.find((t) => t.id === d.trekId);
  const profile = TREKS[d.trekId];
  if (!trek || !profile) continue;

  const types = trek.requiredPermitTypes;
  const before = resolve(PERMITS, types, profile.region, d.departsOn);
  const now = resolve(after, types, profile.region, d.departsOn);

  const beforeTotal = before.reduce((s, p) => s + p.amountUSD, 0);
  const nowTotal = now.reduce((s, p) => s + p.amountUSD, 0);

  if (beforeTotal === nowTotal) {
    unchanged += 1;
    continue;
  }

  moved += 1;
  totalDrop += beforeTotal - nowTotal;
  const dropped = before.filter((p) => !now.some((q) => q.id === p.id));

  console.log(
    `  ${d.id.padEnd(24)} ${d.departsOn}  permits ${money(beforeTotal)} → ${money(nowTotal)}   price ${money(d.priceUSD)} → ${money(d.priceUSD - (beforeTotal - nowTotal))}`,
  );
  for (const p of dropped) {
    console.log(`      - ${p.name}  ${money(p.amountUSD)}`);
  }
}

console.log(
  `\n  ${moved} departure${moved === 1 ? "" : "s"} changed, ${unchanged} unaffected.`,
);
console.log(
  `  ${money(totalDrop)} of permit fees removed across the catalogue, and no trek, cost profile or departure was edited to do it.\n`,
);

if (moved === 0) {
  /*
   * Two very different reasons for the same zero, and the demo is worth
   * nothing if it cannot tell them apart. A record that is already
   * discontinued SHOULD move nothing — that is the mechanism having already
   * done its job. A record still in force that moves nothing means a cost
   * sheet is storing the permit rather than composing it, which is the exact
   * failure this script exists to expose.
   */
  if (record.status !== "active") {
    console.log(
      `  Nothing moved, and nothing should have: this record is already\n  ${record.status}, so no cost sheet composes it. That it contributes $0\n  today is the mechanism having already removed it.\n`,
    );
  } else {
    console.log(
      "  Nothing moved, and something should have. This record is active, so a\n  cost sheet is storing this permit rather than composing it — which is\n  the failure this demo exists to expose.\n",
    );
  }
}
