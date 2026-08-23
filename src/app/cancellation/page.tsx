import type { Metadata } from "next";

import { isApproved, policyById } from "@/content/policies";

import {
  DocSectionBlock,
  DocumentPage,
} from "@/components/trust/document-page";
import { CANCELLATION_TERMS } from "@/content/cancellation";

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

export const metadata: Metadata = {
  title: "Cancellation and refunds",
  description:
    "What happens if we cancel, what happens if you cancel, what is non-refundable and why, transfers, refund method and timeline, force majeure, and leaving mid-trek.",
  robots: policyIsApproved("cancellation")
    ? { index: true, follow: true }
    : { index: false, follow: true },
  alternates: { canonical: "/cancellation" },
};

/**
 * The one page on this site that binds the company.
 *
 * What is built here is the structure and the mechanics — a sliding scale as
 * data rather than prose, so a departure FAQ can quote the policy instead of
 * restating it, and so `check:trust` can fail the build when a departure page
 * states a refund term this page would not produce.
 *
 * The commercial figures are invented and every one of them lives in a single
 * block in `content/cancellation.ts`. Nothing here has been drafted or
 * reviewed by a lawyer, and "force majeure" is a term whose meaning varies by
 * jurisdiction — the wording below is a placeholder for wording somebody
 * qualified writes.
 */
export default function CancellationPage() {
  const t = CANCELLATION_TERMS;
  const scale = [...t.slidingScale].sort(
    (a, b) => b.fromDaysBefore - a.fromDaysBefore,
  );

  return (
    <DocumentPage
      eyebrow="Cancellation"
      title="If we cancel, and if you do."
      policyId="cancellation"
      sections={[
        { id: "we-cancel", title: "If we cancel" },
        { id: "you-cancel", title: "If you cancel" },
        { id: "non-refundable", title: "What is not refundable" },
        { id: "transfers", title: "Transfers" },
        { id: "method", title: "Refund method and timeline" },
        { id: "force-majeure", title: "Force majeure" },
        { id: "mid-trek", title: "Leaving mid-trek" },
      ]}
      intro={
        <p>
          Every departure publishes a minimum number of travellers and the date
          by which we decide. This page is what happens either side of that
          date, and it is the document that governs — no departure page
          summarises it in a way that could differ from it.
        </p>
      }
      pending={
        <p>
          <strong>Placeholder terms. Not yet legally reviewed.</strong> The
          structure below is real and the mechanics work, but every percentage,
          day count and deposit figure is invented and collected in one block in
          the data file so they can be replaced in a single edit. These terms
          bind the company and require legal review before launch — do not treat
          anything on this page as an offer.
        </p>
      }
    >
      <DocSectionBlock
        id="we-cancel"
        title="If we cancel"
        lead={
          <p>
            You get{" "}
            <strong className="tabular">{t.weCancelRefundPercent}%</strong> of
            what you paid us back. The whole amount, not a credit note, and not
            conditional on you rebooking with us. You can instead move to
            another date at the same price if you would rather.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          The commonest reason we cancel is that a departure has not reached its
          published minimum by its published decision date. That date is on
          every departure page before you book, and the money for the refund is
          a line in that departure’s own cost sheet — held against your trip
          rather than pooled, so the refund does not depend on how the rest of
          the season sells.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="you-cancel"
        title="If you cancel"
        lead={
          <p>
            What you get back depends on how close to departure you are, because
            permits, flights and beds are bought in advance and are not
            refundable to us either.
          </p>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Refund by number of days before departure. Placeholder figures.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Notice given
                </th>
                <th
                  scope="col"
                  className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  You get back
                </th>
                <th
                  scope="col"
                  className="py-3 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {scale.map((band) => (
                <tr
                  key={band.fromDaysBefore}
                  className="border-b border-border/60"
                >
                  <th
                    scope="row"
                    className="py-4 pr-4 align-top tabular font-normal whitespace-nowrap"
                  >
                    {band.fromDaysBefore === 0
                      ? "Under 14 days, or no notice"
                      : `${band.fromDaysBefore} days or more`}
                  </th>
                  <td className="py-4 pr-4 align-top tabular">
                    {band.refundPercent}%
                  </td>
                  <td className="py-4 align-top text-xs tracking-[0.06em] text-prayer-deep uppercase">
                    {band.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[68ch] text-sm text-muted-foreground">
          A deposit of <span className="tabular">{t.depositPercent}%</span> is
          taken at booking (placeholder). Where the scale returns less than the
          full amount, the difference covers costs already committed and not
          recoverable — itemised in the next section rather than described as
          “administration”.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="non-refundable"
        title="What is not refundable, and why"
        lead={
          <p>
            A cancellation policy that says “non-refundable” without saying what
            and why is asking to be trusted about the one thing the reader
            cannot check.
          </p>
        }
      >
        <ul className="grid gap-3">
          {t.nonRefundable.map((n) => (
            <li
              key={n.item}
              className="rounded-lg border border-border bg-card p-5 text-sm"
            >
              <p className="font-medium">{n.item}</p>
              <p className="mt-1 text-muted-foreground">{n.why}</p>
            </li>
          ))}
        </ul>
      </DocSectionBlock>

      <DocSectionBlock
        id="transfers"
        title="Transfers"
        lead={
          <p>
            You can move to another date up to{" "}
            <strong className="tabular">
              {t.transfersAllowedUntilDaysBefore} days
            </strong>{" "}
            before departure, for a fee of{" "}
            <strong className="tabular">
              {t.transferFeeUSD === 0 ? "nothing" : `$${t.transferFeeUSD}`}
            </strong>{" "}
            (placeholder). If the new date costs more you pay the difference; if
            it costs less we refund it.
          </p>
        }
      />

      <DocSectionBlock
        id="method"
        title="Refund method and timeline"
        lead={
          <p>
            Refunds go back by the method you paid, to the account you paid
            from, within{" "}
            <strong className="tabular">{t.refundWithinDays} days</strong> of
            the cancellation being confirmed (placeholder). We do not issue
            credit notes in place of a refund and we do not deduct a card fee
            from it.
          </p>
        }
      />

      <DocSectionBlock
        id="force-majeure"
        title="Force majeure"
        lead={
          <p>
            <strong>
              PLACEHOLDER — this clause requires legal drafting and is not
              written here.
            </strong>{" "}
            “Force majeure” has a specific legal meaning that varies by
            jurisdiction, and a clause invented by us would be both
            unenforceable and unfair. What it will cover: events outside
            anybody’s control that make the trip impossible rather than merely
            difficult — and what happens to your money in each case, stated as
            plainly as the table above.
          </p>
        }
      />

      <DocSectionBlock
        id="mid-trek"
        title="Leaving mid-trek"
        lead={
          <p>
            If you leave a trip once it has started — because you decide to,
            because you are unwell, or because the guide has decided you should
            descend — the unused portion is not refundable, because the permits,
            beds and staff for those days are already committed.
          </p>
        }
      >
        <p className="max-w-[68ch] text-base text-muted-foreground">
          What is not conditional is the descent itself. Nobody on our staff is
          permitted to weigh the cost of a lost trip against a decision to send
          somebody down, and no refund question is put to a traveller who is
          being told to descend. The money is settled afterwards and never used
          as an argument at altitude.
        </p>
      </DocSectionBlock>
    </DocumentPage>
  );
}
