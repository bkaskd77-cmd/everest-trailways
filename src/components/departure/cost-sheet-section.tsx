import Link from "next/link";
import { Download } from "lucide-react";

import { AskPanel } from "@/components/departures/ask-panel";
import { CostLedger } from "@/components/departure/cost-ledger";
import { SectionHead } from "@/components/departure/section-head";
import { Button } from "@/components/ui/button";
import {
  type Contingency,
  type Departure,
  estimableExtras,
  lineAmount,
  notProvidedLines,
  optionalLines,
  payableOnArrival,
  providedLines,
} from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The cost sheet.
 *
 * Hidden cost is the top complaint in Nepal trekking, and no operator publishes
 * what happens when a trip goes wrong. This section is the company's whole
 * argument in one place, so it is built as a document rather than as a page:
 * tables, figures, no illustration, and nothing that reads as persuasion.
 *
 * The order is deliberate. What you pay, then what you also pay, then what
 * happens when it goes wrong, then the insurance position, then tipping. The
 * awkward material is not at the bottom — the contingency block is the longest
 * thing here and sits in the middle, where it cannot be missed.
 */

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

const WHO_PAYS_LABEL: Record<Contingency["whoPays"], string> = {
  us: "We pay",
  you: "You pay",
  shared: "Shared",
};

const INSURANCE_LABEL: Record<Contingency["coveredByInsurance"], string> = {
  usually: "Usually covered by insurance",
  "usually not": "Usually not covered by insurance",
  depends: "Depends on your policy",
};

/**
 * The intro sentence, built from the lines that are actually there.
 *
 * It used to say the sheet ran "from the national park permit to the porters'
 * day rate" on every departure, including the ones with no porters. Copy that
 * names a line has to read the lines, or it is the same unchecked claim the
 * section exists to argue against — just about itself.
 */
function bookendLabels(lines: { category: string; label: string }[]): {
  first: string;
  last: string;
} {
  const first = lines[0];
  // The last line before the operating block: "our fee" is a true bookend but a
  // deflating one to point at, and the reader has not reached it yet.
  const beforeAdmin = lines.filter((l) => l.category !== "admin");
  const last = beforeAdmin[beforeAdmin.length - 1] ?? lines[lines.length - 1];

  // Verbatim, not lowercased. Forcing the first character down turned
  // "Sagarmatha National Park entry" into "sagarmatha National Park entry",
  // which is exactly the kind of small wrongness a reader notices on a page
  // asking to be trusted with arithmetic. The sentence is shaped around the
  // labels instead of the labels being reshaped to fit the sentence.
  return { first: first.label, last: last.label };
}

function costRange(value: Contingency["estimatedCostUSD"]): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return `${money(value[0])}–${money(value[1])}`;
  return money(value);
}

/**
 * One thing that goes wrong.
 *
 * Deliberately not a warning panel. No amber, no icon, no border that says
 * caution — this is a specification, and dressing it as an alert would make a
 * routine flight delay look like a hazard and make us look nervous about our
 * own disclosure. The only colour is on "We pay" versus "You pay", because that
 * is the line a reader is actually looking for.
 */
function ContingencyEntry({ item }: { item: Contingency }) {
  const cost = costRange(item.estimatedCostUSD);

  return (
    <li className="border-t border-border py-6 first:border-t-0 first:pt-0">
      {/*
        The verdict box sits in a column next to the text, not pinned to the
        page edge. At 1,440px the old `1fr 15rem` split left a corridor of empty
        band between a 62ch paragraph and a box hard against the right margin,
        so the two halves of one entry read as unrelated. Capping the prose
        column and keeping the gap tight pulls them back together.
      */}
      <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,46rem)_16rem] lg:justify-start">
        <div>
          <h4 className="max-w-[62ch] text-base font-medium">{item.trigger}</h4>
          <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
            <span className="text-foreground">How often:</span>{" "}
            {item.likelihood}
          </p>
          <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
            <span className="text-foreground">What we do:</span> {item.whatWeDo}
          </p>
          {item.note && (
            <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
              {item.note}
            </p>
          )}
        </div>

        <dl className="grid content-start gap-3 self-start rounded-md bg-muted/50 p-4 text-sm">
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Who pays
            </dt>
            <dd
              className={cn(
                "mt-1 font-medium",
                item.whoPays === "us" && "text-verified",
              )}
            >
              {WHO_PAYS_LABEL[item.whoPays]}
            </dd>
          </div>
          {cost && (
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Estimated cost
              </dt>
              <dd className="mt-1 tabular">{cost}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Insurance
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {INSURANCE_LABEL[item.coveredByInsurance]}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export function CostSheetSection({ departure }: { departure: Departure }) {
  const { costSheet } = departure;
  const included = providedLines(costSheet);
  const excluded = notProvidedLines(costSheet);

  /*
   * "There is nothing to pay on arrival" is a strong claim, so it is composed
   * from line state and never stored.
   *
   * It used to key on a single line id, which meant the claim was true only
   * for the one exception somebody had thought of. Move any line to
   * not-provided with `payableWhen: "on arrival"` — a park fee collected at
   * the gate, transfers we have stopped running — and the sentence became
   * false with nothing to catch it. It now reads every not-provided line, so
   * the claim cannot outlive the thing that made it true.
   */
  const onArrival = payableOnArrival(costSheet);
  const onArrivalTotal = onArrival.reduce((sum, l) => sum + lineAmount(l), 0);
  const extrasFigure = estimableExtras(costSheet);
  const excludedTotal = extrasFigure.total;

  const ins = costSheet.insuranceRequirement;
  const [tipLow, tipHigh] = costSheet.tipping.typicalRangeUSD;
  const bookends = bookendLabels(included);
  const divided = included.filter((l) => l.dividedBy !== undefined);
  /* Read from the lines, so a line moved to `optional` appears here. */
  const extras = optionalLines(costSheet);

  return (
    <section
      id="cost-sheet"
      aria-labelledby="cost-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="shell py-16 lg:py-20">
        <SectionHead
          eyebrow="Cost sheet"
          title="Where every dollar goes."
          id="cost-heading"
        >
          The {money(departure.priceUSD)} on this page is itemised below and the
          lines add up to it exactly. There are {included.length}, starting at{" "}
          {bookends.first} and ending at {bookends.last}.
        </SectionHead>

        {/* 1 — THE LEDGER */}
        <div className="mt-12 lg:mt-16">
          <CostLedger
            className="max-w-4xl"
            lines={included}
            priceUSD={departure.priceUSD}
            caption={`Itemised cost for ${departure.trekName}, departing ${departure.departsOn}. Included lines only, totalling ${money(departure.priceUSD)} per person.`}
          />

          {divided.length > 0 && (
            <p className="mt-6 max-w-[68ch] text-sm text-muted-foreground">
              {costSheet.sharedCostPolicy === "we-absorb" ? (
                <>
                  Shared costs above are divided at the group cap. If fewer
                  people book, we absorb the difference — your price does not
                  change.
                </>
              ) : (
                <>
                  Shared costs above are divided at the group cap. If fewer
                  people book, the per-person share rises and your price is
                  recalculated before you are asked to pay.
                </>
              )}
            </p>
          )}

          <p className="mt-4 max-w-[62ch] text-sm">
            {onArrival.length === 0 ? (
              <>This is the full price. There is nothing to pay on arrival.</>
            ) : (
              <>
                This is the full price of what we provide. What you pay for
                yourself on arrival in Nepal:{" "}
                {onArrival.map((l) => l.label).join(", ")}
                {onArrivalTotal > 0 ? (
                  <>, roughly {money(onArrivalTotal)}</>
                ) : null}
                . {onArrival.length > 1 ? "Those go" : "That goes"} to{" "}
                {[...new Set(onArrival.map((l) => l.whoYouPay))].join(" and ")}
                {" — "}not to us, so we cannot prepay{" "}
                {onArrival.length > 1 ? "them" : "it"}.
              </>
            )}
          </p>
        </div>

        {/* 1b — OPTIONAL EXTRAS */}
        {extras.length > 0 && (
          <div className="mt-16 lg:mt-20">
            <SectionHead level="h3" title="Optional, and not in the price.">
              Things you can add. None of them is required, none is assumed, and
              none is in the total above.
            </SectionHead>

            <table className="mt-8 w-full max-w-4xl border-collapse text-left">
              <caption className="sr-only">
                Optional extras for {departure.trekName}, not included in the{" "}
                {money(departure.priceUSD)} total.
              </caption>
              <tbody className="border-t-2 border-foreground/15">
                {extras.map((extra) => (
                  <tr key={extra.id} className="border-t border-border/60">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left align-top font-normal"
                    >
                      <span className="block text-sm">{extra.label}</span>
                      {extra.note && (
                        <span className="mt-1 block max-w-[62ch] text-xs text-muted-foreground">
                          {extra.note}
                        </span>
                      )}
                    </th>
                    <td className="py-3 text-right align-top tabular text-sm whitespace-nowrap">
                      {money(lineAmount(extra))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2 — NOT INCLUDED */}
        <div className="mt-16 lg:mt-20">
          <SectionHead level="h3" title="Not included.">
            Estimates, not charges — you pay these to other people, not to us.
            They are here with figures because an exclusion without a number is
            a way of disclosing a cost while leaving you unable to budget for
            it.
          </SectionHead>

          <div className="mt-8">
            <CostLedger
              className="max-w-4xl"
              lines={excluded}
              caption={`Costs not included in the price for ${departure.trekName}. Estimates.`}
              collapsible={false}
            />
            <p className="mt-6 tabular text-sm text-muted-foreground">
              Roughly {money(excludedTotal)} of estimable extras, excluding
              international flights and personal gear.
            </p>
          </div>
        </div>

        {/* 3 — WHEN THINGS GO WRONG */}
        <div className="mt-16 lg:mt-20">
          {/*
            No place name in shared prose.
            This paragraph named Ramechhap on every departure, including the
            ones that go nowhere near it — Ramechhap serves Lukla, and an
            Annapurna trek starts from Pokhara. The sentence makes the same
            point without borrowing somebody else's road.
          */}
          <SectionHead level="h3" title="When things go wrong.">
            We publish this because most operators do not, and because the
            alternative is finding out at one in the morning, at the roadside,
            on the day it happens. Each of these has happened. For each one,
            here is what we do and who pays.
          </SectionHead>

          <ul className="mt-10">
            {costSheet.contingencies.map((item) => (
              <ContingencyEntry key={item.id} item={item} />
            ))}
          </ul>
        </div>

        {/* 4 — INSURANCE */}
        <div className="mt-16 border-t border-border pt-12 lg:mt-20">
          <SectionHead level="h3" title="Insurance you must have.">
            Three numbers, and one thing travellers routinely get wrong. Check
            the policy wording against them before you buy it.
          </SectionHead>

          <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Minimum medical cover
              </dt>
              <dd className="mt-2 font-display tabular text-2xl tracking-tight">
                {money(ins.minimumMedicalCoverUSD)}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Helicopter evacuation
              </dt>
              <dd className="mt-2 font-display text-2xl tracking-tight">
                {ins.mustCoverHelicopterEvacuation
                  ? "Required"
                  : "Not required"}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Must cover you to
              </dt>
              <dd className="mt-2 font-display tabular text-2xl tracking-tight">
                {ins.mustCoverAltitudeM.toLocaleString("en-GB")} m
              </dd>
            </div>
          </dl>

          <p className="mt-8 max-w-[68ch] text-base">{ins.weatherDelayNote}</p>
          <p className="mt-4 max-w-[68ch] text-sm text-muted-foreground">
            We do not recommend an insurer and we take no commission from one.
            Check the policy wording against the three numbers above before you
            buy it — many policies sold for trekking cap altitude below what
            this trip reaches.
          </p>
        </div>

        {/* 5 — TIPPING */}
        <div className="mt-16 border-t border-border pt-12 lg:mt-20">
          <SectionHead level="h3" title="Tipping.">
            {costSheet.tipping.guidance}
          </SectionHead>
          <p className="mt-6 tabular text-base">
            Typical for this trip: {money(tipLow)}–{money(tipHigh)} per person,
            across the whole group of staff.{" "}
            <span className="text-muted-foreground">
              Not included in the price, and not compulsory.
            </span>
          </p>
        </div>

        {/* 6 — THE PENDING CLAIM */}
        <div className="mt-16 border-t border-border pt-12 lg:mt-20">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h3 className="font-display text-2xl tracking-tight">
              Commission on helicopter evacuations.
            </h3>
            {/*
              Written in the trust strip's pending style rather than asserted.
              The claim is that we take none, which would be a strong one — and
              an unverified strong claim on the page that argues we are
              checkable would undo the section it appears in.
            */}
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Pending verification
            </span>
          </div>
          <p className="mt-4 max-w-[68ch] text-base text-muted-foreground">
            Some operators take a margin on evacuation flights, which puts a
            financial interest on one side of a medical decision. We intend to
            state plainly that we take none. That statement is not on this page
            yet because it has not been verified in the way everything else here
            has, and we would rather leave a gap than fill it with a promise.
          </p>
        </div>

        {/* DOWNLOAD + ASK */}
        <div className="mt-16 flex flex-wrap items-center gap-6 border-t border-border pt-10 lg:mt-20">
          <Button asChild variant="outline">
            {/*
              A plain link to a prerendered file, not a client-side generator.
              This is the artefact someone forwards to whoever is paying, so it
              has to exist as a URL they can send rather than as a button that
              only works in the tab it was clicked in.
            */}
            <Link href={departure.costSheetPdfHref} prefetch={false}>
              <Download aria-hidden className="size-4" />
              Download this cost sheet (PDF)
            </Link>
          </Button>
          <div className="min-w-0">
            <AskPanel departure={departure} />
          </div>
        </div>
      </div>
    </section>
  );
}
