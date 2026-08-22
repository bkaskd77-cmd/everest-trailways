import Link from "next/link";
import { Download } from "lucide-react";

import { AskPanel } from "@/components/departures/ask-panel";
import { CostLedger } from "@/components/departure/cost-ledger";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { Contingency, Departure } from "@/content/departures";
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
      <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
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
  const included = costSheet.lines.filter((l) => l.included);
  const excluded = costSheet.lines.filter((l) => !l.included);

  /*
   * "There is nothing to pay on arrival" is a strong claim, so it is derived
   * rather than typed. If any excluded line is marked as payable on arrival —
   * a gate fee, a park charge collected at the door — the page says what it is
   * instead of making the claim.
   */
  const onArrival = excluded.filter((l) => l.id === "on-arrival");
  const estimable = excluded.filter((l) => l.amountUSD > 0);
  const excludedTotal = estimable.reduce((sum, l) => sum + l.amountUSD, 0);

  const ins = costSheet.insuranceRequirement;
  const [tipLow, tipHigh] = costSheet.tipping.typicalRangeUSD;

  return (
    <section
      id="cost-sheet"
      aria-labelledby="cost-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="shell py-16 lg:py-20">
        <Reveal>
          <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
            Cost sheet
          </p>
          <h2
            id="cost-heading"
            className="mt-4 max-w-[16ch] font-display text-3xl tracking-tight text-balance lg:text-5xl"
          >
            Where every dollar goes.
          </h2>
          <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
            The {money(departure.priceUSD)} on this page is itemised below, and
            the lines add up to it exactly — {included.length} of them, from the
            national park permit to the porters&rsquo; day rate.
          </p>
        </Reveal>

        {/* 1 — THE LEDGER */}
        <div className="mt-12 lg:mt-16">
          <CostLedger
            lines={included}
            priceUSD={departure.priceUSD}
            caption={`Itemised cost for ${departure.trekName}, departing ${departure.departsOn}. Included lines only, totalling ${money(departure.priceUSD)} per person.`}
          />

          <p className="mt-6 max-w-[62ch] text-sm">
            {onArrival.length === 0 ? (
              <>
                This is the full price. There is nothing to pay on arrival.
                {departure.singleSupplementUSD > 0 && (
                  <>
                    {" "}
                    A single room, if you want one, is{" "}
                    {money(departure.singleSupplementUSD)} on top and is the
                    only other charge we make.
                  </>
                )}
              </>
            ) : (
              <>
                Payable on arrival:{" "}
                {onArrival.map((l) => l.label.toLowerCase()).join(", ")}. We
                cannot prepay {onArrival.length > 1 ? "these" : "this"} because
                it is collected at the gate in cash.
              </>
            )}
          </p>
        </div>

        {/* 2 — NOT INCLUDED */}
        <div className="mt-16 lg:mt-20">
          <Reveal>
            <h3 className="font-display text-2xl tracking-tight lg:text-3xl">
              Not included.
            </h3>
            <p className="mt-4 max-w-[62ch] text-base text-muted-foreground">
              Estimates, not charges — you pay these to other people, not to us.
              They are here with figures because an exclusion without a number
              is a way of disclosing a cost while leaving you unable to budget
              for it.
            </p>
          </Reveal>

          <div className="mt-8">
            <CostLedger
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
          <Reveal>
            <h3 className="font-display text-2xl tracking-tight lg:text-3xl">
              When things go wrong.
            </h3>
            <p className="mt-4 max-w-[68ch] text-base text-muted-foreground">
              We publish this because most operators do not, and because the
              alternative is finding out at one in the morning on the road to
              Ramechhap. Each of these has happened. For each one, here is what
              we do and who pays.
            </p>
          </Reveal>

          <ul className="mt-10">
            {costSheet.contingencies.map((item) => (
              <ContingencyEntry key={item.id} item={item} />
            ))}
          </ul>
        </div>

        {/* 4 — INSURANCE */}
        <div className="mt-16 border-t border-border pt-12 lg:mt-20">
          <Reveal>
            <h3 className="font-display text-2xl tracking-tight lg:text-3xl">
              Insurance you must have.
            </h3>
          </Reveal>

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
          <Reveal>
            <h3 className="font-display text-2xl tracking-tight lg:text-3xl">
              Tipping.
            </h3>
          </Reveal>
          <p className="mt-4 max-w-[68ch] text-base text-muted-foreground">
            {costSheet.tipping.guidance}
          </p>
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
