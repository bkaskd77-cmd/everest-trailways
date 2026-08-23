import Link from "next/link";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

import { isApproved, policyById } from "@/content/policies";

import {
  DocSectionBlock,
  DocumentPage,
} from "@/components/trust/document-page";
import {
  bookableDepartures,
  lineAmount,
  providedLines,
} from "@/content/departures";

/**
 * `noindex` while the policy is unapproved.
 *
 * Read from the registry rather than typed, so approving the document is one
 * edit in one file and the page follows. `follow` stays on: the links out of a
 * draft are still worth following, and nofollow would strand it rather than
 * de-list it.
 */
const policyIsApproved = (id: string) => {
  const p = policyById(id);
  return Boolean(p && isApproved(p));
};

export const metadata: Metadata = pageMetadata({
  title: "How we price",
  description:
    "What all-in means, what it excludes, why the same route costs different amounts on different dates, what the reserves fund, and what our fee is as a share of the price.",
  path: "/pricing",
  robots: policyIsApproved("pricing")
    ? { index: true, follow: true }
    : { index: false, follow: true },
});

/**
 * The methodology behind every cost sheet.
 *
 * The fee range is computed from the catalogue rather than stated, which is
 * the only version of this claim worth publishing: a typed "we take about
 * 12%" would be a number nobody could check and one that would drift the first
 * time a price moved. Everything here is read from the same ledgers the
 * departure pages render.
 */
export default function PricingPage() {
  const open = bookableDepartures();

  const shares = open
    .map((d) => {
      const fee = providedLines(d.costSheet).find((l) => l.id === "fee");
      return {
        departure: d,
        share: fee ? lineAmount(fee) / d.priceUSD : 0,
      };
    })
    .filter((s) => s.share > 0)
    .sort((a, b) => a.share - b.share);

  const lowest = shares[0];
  const highest = shares[shares.length - 1];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  /* A real date to link to, never a mock. */
  const example = open.reduce((a, b) => (b.days > a.days ? b : a));

  return (
    <DocumentPage
      eyebrow="Pricing"
      title="How the number on every page is arrived at."
      policyId="pricing"
      sections={[
        { id: "all-in", title: "What all-in means" },
        { id: "sums", title: "The lines must sum exactly" },
        { id: "surcharge", title: "No card surcharge" },
        { id: "currency", title: "Currency" },
        { id: "by-date", title: "Why the same route differs by date" },
        { id: "reserves", title: "What the reserves fund" },
        { id: "fee", title: "Our fee, across the catalogue" },
        { id: "example", title: "A real cost sheet" },
      ]}
      intro={
        <p>
          Every departure publishes its full ledger, including what we keep.
          This page is the method behind those ledgers — what is in the price,
          what is deliberately not, and why two dates on the same route are not
          the same number.
        </p>
      }
    >
      <DocSectionBlock
        id="all-in"
        title="What “all-in” means, and what it excludes"
        lead={
          <p>
            All-in means every cost we incur to run the trip from your arrival
            in Nepal to the end of the trip: permits, transport, accommodation,
            meals on the trail, staff wages and their insurance, group
            equipment, the two reserves below, and our fee. It is the number you
            pay us and there is no second invoice.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          It excludes what we do not control or do not provide: international
          flights, your visa, your travel insurance, personal gear, and what you
          spend on the trail on drinks, showers and charging. Every one of those
          is a line on the cost sheet with an estimate, who you pay, and when —
          an exclusion without a number discloses a cost while leaving you
          unable to budget for it, which is not disclosure.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="sums"
        title="The lines must sum exactly, and the build fails if they do not"
        lead={
          <p>
            The published price is not a figure somebody typed. It is the sum of
            the provided lines, our fee among them. If those two ever disagree
            the build fails with the two numbers printed, and nothing ships.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          This used to work the other way round: the price was declared and our
          fee was whatever was left over, which made the total exact by
          construction and made it impossible for a cost to leave the price. If
          we stopped providing airport transfers under that arrangement, the
          price did not fall by the cost of the transfers — our fee silently
          grew by the same amount. The direction was reversed so that a line
          leaving the price takes its money with it.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="surcharge"
        title="No card surcharge"
        lead={
          <p>
            The price is the price whichever way you pay it. We do not add a
            percentage for cards, and the cost of accepting payment is inside
            our fee rather than added at the last screen.
          </p>
        }
      />

      <DocSectionBlock
        id="currency"
        title="Currency"
        lead={
          <p>
            Every price on this site is in US dollars, which is the currency
            trekking in Nepal is quoted in. Your card issuer converts at their
            rate on the day, and that rate is theirs rather than ours — we
            cannot quote it and we do not take a margin on it.
          </p>
        }
      />

      <DocSectionBlock
        id="by-date"
        title="Why the same route costs different amounts on different dates"
        lead={
          <p>
            Three reasons, all of them visible in the ledgers: permit fees
            change and a departure is costed against the records in force on its
            own date; lodge and transport rates move between peak and shoulder
            season; and the trip length differs where a route has a longer and a
            shorter version.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          The permit case is the clearest. A levy at one figure until the end of
          2026 and a different figure from January 2027 means two departures on
          the same trail carry different permit lines, and neither the trek nor
          the itinerary was edited to make that happen.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="reserves"
        title="What the contingency and guarantee reserves fund"
        lead={
          <p>
            Two lines on every cost sheet that most operators do not have, and
            neither is profit.
          </p>
        }
      >
        <dl className="grid gap-5 rounded-lg border border-border bg-card p-6 text-sm lg:grid-cols-[14rem_1fr] lg:gap-x-10">
          <dt className="text-muted-foreground">Contingency reserve</dt>
          <dd>
            Pays for the delays, reroutes and extra nights on a trip that does
            run — a closed road, a flight that does not fly, a night somewhere
            the itinerary did not plan. Held against your departure rather than
            pooled, so it does not depend on how the rest of the season goes.
            Each departure lists what it expects to go wrong, how often, and who
            pays.
          </dd>

          <dt className="text-muted-foreground">Guarantee reserve</dt>
          <dd>
            Held to refund you in full if the departure does not reach its
            minimum by the published decision date. Also held against your
            departure and not pooled — the refund does not depend on next
            month’s bookings. It is a share of what the trip costs to run, which
            is the money actually at risk.
          </dd>
        </dl>
      </DocSectionBlock>

      <DocSectionBlock
        id="fee"
        title="Our fee, as a share of the price"
        lead={
          <p>
            Across the {open.length} departures on sale, our fee runs from{" "}
            <strong className="tabular">{pct(lowest.share)}</strong> to{" "}
            <strong className="tabular">{pct(highest.share)}</strong> of the
            price. Both figures are computed from the ledgers on this site
            rather than stated, so they move when the prices do.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          The short trips carry the higher percentage and it is worth saying why
          rather than hoping nobody asks. A four-day trip and a fourteen-day
          trip need almost the same amount of office work: the same permits
          filed, the same beds held, the same phone answered at two in the
          morning. That work is a much larger share of a{" "}
          <span className="tabular">
            ${lowest.departure.priceUSD.toLocaleString("en-GB")}
          </span>{" "}
          trip than of a{" "}
          <span className="tabular">
            ${highest.departure.priceUSD.toLocaleString("en-GB")}
          </span>{" "}
          one. It is not that we mark short trips up harder; it is that the
          fixed cost does not shrink with the trip.
        </p>

        <ul className="mt-6 grid gap-2 text-sm">
          {shares.map(({ departure, share }) => (
            <li key={departure.id} className="tabular text-muted-foreground">
              {pct(share)} —{" "}
              <Link
                href={`/departures/${departure.slug}#cost-sheet`}
                className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {departure.trekName}
              </Link>
              , {departure.days} days, $
              {departure.priceUSD.toLocaleString("en-GB")}
            </li>
          ))}
        </ul>
      </DocSectionBlock>

      <DocSectionBlock
        id="example"
        title="A real cost sheet"
        lead={
          <p>
            Not a worked example and not a mock — the longest trip currently on
            sale, with its actual ledger.
          </p>
        }
      >
        <Link
          href={`/departures/${example.slug}#cost-sheet`}
          className="inline-block rounded-lg border border-border bg-card p-6 text-sm transition-colors hover:border-foreground/25"
        >
          <p className="font-display text-xl tracking-tight">
            {example.trekName}
          </p>
          <p className="mt-2 tabular text-muted-foreground">
            {example.days} days · ${example.priceUSD.toLocaleString("en-GB")} ·{" "}
            {providedLines(example.costSheet).length} lines in the price
          </p>
        </Link>
      </DocSectionBlock>
    </DocumentPage>
  );
}
