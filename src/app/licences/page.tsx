import type { Metadata } from "next";

import {
  DocSectionBlock,
  DocumentPage,
} from "@/components/trust/document-page";
import { CREDENTIALS, verifiedCount } from "@/content/credentials";

export const metadata: Metadata = {
  title: "Licences and registrations",
  description:
    "Every licence, registration, membership and policy we hold, what each one actually establishes, what it does not, and how to check it without asking us.",
  alternates: { canonical: "/licences" },
};

const LAST_REVIEWED = "2026-08-23";

/**
 * What we hold, and what it is worth.
 *
 * The second half is the part that matters and the part nobody publishes.
 * Operators list credentials as a wall of logos, which invites a reader to
 * conclude that a licence is a safety rating. It is not: it is a registration.
 * Every entry here carries a `whatItDoesNotMean` because the page is worth
 * nothing if it lets somebody draw a conclusion we know to be wrong.
 *
 * Every number renders "—" until somebody holds the document. `check:trust`
 * fails on a number present without status `verified`, which is the one rule
 * on this site that could not be allowed to depend on anybody remembering it.
 */
export default function LicencesPage() {
  const verified = verifiedCount();

  return (
    <DocumentPage
      eyebrow="Licences"
      title="What we hold, and what it proves."
      lastReviewed={LAST_REVIEWED}
      sections={[
        { id: "state", title: "The state of this page" },
        ...CREDENTIALS.map((c) => ({ id: c.id, title: c.name })),
      ]}
      intro={
        <p>
          Seven credentials, each with what it establishes, what it does not,
          and how to check it yourself. The second column is the one that
          matters: a licence proves registration, not competence, and a page
          that lists credentials without saying so is inviting a conclusion it
          knows to be wrong.
        </p>
      }
      pending={
        <p>
          <strong>
            {verified} of {CREDENTIALS.length} verified.
          </strong>{" "}
          Every number on this page reads “—” because we hold no scanned
          document to publish yet. A registration number is four digits and a
          hyphen, and nobody checks it — which is exactly why inventing one
          here, on the page arguing that everything we say is checkable, would
          be the worst thing this site could do. The numbers appear when the
          documents do.
        </p>
      }
    >
      <DocSectionBlock
        id="state"
        title="The state of this page"
        lead={
          <p>
            The structure is complete and the credentials are not. What follows
            is what we will hold and what each item will and will not tell you.
            Where a number is missing, the entry says how you would check it
            once it is there — so the method is publishable before the
            credential is.
          </p>
        }
      />

      {CREDENTIALS.map((c) => (
        <DocSectionBlock key={c.id} id={c.id} title={c.name}>
          <dl className="grid gap-5 rounded-lg border border-border bg-card p-6 text-sm lg:grid-cols-[16rem_1fr] lg:gap-x-10">
            <dt className="text-muted-foreground">Issued by</dt>
            <dd>{c.issuingBody}</dd>

            <dt className="text-muted-foreground">Number</dt>
            <dd className="tabular">
              {c.number}
              {c.status !== "verified" && (
                <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                  pending
                </span>
              )}
            </dd>

            {c.expiresOn && (
              <>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="tabular">{c.expiresOn}</dd>
              </>
            )}

            <dt className="text-muted-foreground">What it means</dt>
            <dd>{c.whatItMeans}</dd>

            <dt className="text-prayer-deep">What it does not mean</dt>
            <dd className="text-foreground">{c.whatItDoesNotMean}</dd>

            <dt className="text-muted-foreground">How to check it</dt>
            <dd>{c.howToVerify}</dd>
          </dl>
        </DocSectionBlock>
      ))}
    </DocumentPage>
  );
}
