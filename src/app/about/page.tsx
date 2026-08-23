import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { SectionHead } from "@/components/departure/section-head";
import { CREDENTIALS } from "@/content/credentials";
import { GUIDES } from "@/content/guides";
import { bookableDepartures, departures } from "@/content/departures";
import { ACTIVITIES } from "@/content/activities";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What we sell and what we do not, that we run our own departures rather than broker them, how the guarantee works, and an honest account of what we are new at.",
  alternates: { canonical: "/about" },
};

/**
 * Why the company exists, without the sentence every operator writes.
 *
 * The hard section is the last one. A new operator claiming a long record is
 * the specific lie this entire site is built against, and the temptation to
 * imply experience is strongest on the page where you are asked to describe
 * yourself. So the page says we are new, says what that costs a customer, and
 * says what to check instead of taking our word — which is the only version of
 * this page consistent with the rest of the site.
 */
export default function AboutPage() {
  const open = bookableDepartures();
  const pendingCredentials = CREDENTIALS.filter(
    (c) => c.status !== "verified",
  ).length;
  const pendingGuides = GUIDES.filter((g) => g.status !== "verified").length;

  return (
    <main className="bg-band-sunk">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: `About ${siteConfig.name}`,
          url: `${siteConfig.url}/about`,
        }}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          About
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          Who runs these trips, and what we are not yet.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          There is a version of this page that says we were founded by
          mountaineers with three decades in the Khumbu. We have not written it,
          because it would not be true and because the whole argument of this
          site is that you should not have to believe an unverifiable sentence.
        </p>

        <div className="mt-16 grid gap-16">
          <Reveal as="section">
            <div id="what-we-sell">
              <SectionHead
                eyebrow="What we sell"
                title="Fixed departures, activities, and nothing else."
              >
                <p>
                  {departures.length} dated group treks and {ACTIVITIES.length}{" "}
                  activities, {open.length} of the treks currently open. Each
                  publishes its full itemised cost sheet, including what we
                  keep.
                </p>
              </SectionHead>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-verified/30 bg-verified/5 p-6">
                  <h3 className="font-display text-xl tracking-tight">
                    What we do
                  </h3>
                  <ul className="mt-4 grid gap-3 text-sm">
                    <li>
                      Run our own departures — our staff, our permits, our
                      liability.
                    </li>
                    <li>
                      Publish every cost line, the fee included, before you are
                      asked for anything.
                    </li>
                    <li>
                      Say who a trip is wrong for, on the trip’s own page, in
                      the same size type as who it suits.
                    </li>
                    <li>
                      Publish the dates that did not run, with the bookings they
                      had against the minimum they needed.
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-prayer/30 bg-prayer/5 p-6">
                  <h3 className="font-display text-xl tracking-tight">
                    What we do not
                  </h3>
                  <ul className="mt-4 grid gap-3 text-sm">
                    <li>
                      We do not broker. If we cannot staff a trip ourselves we
                      do not sell it and hand it to somebody else.
                    </li>
                    <li>
                      We do not sell flights, insurance, or visas, and we take
                      no commission on any of them.
                    </li>
                    <li>
                      We do not run expeditions above trekking-peak altitude,
                      and we do not sell anything we would not walk ourselves.
                    </li>
                    <li>
                      We do not quote a “from” price that applies to a group
                      size you are not in.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal as="section">
            <div id="our-own-departures">
              <SectionHead
                eyebrow="No middlemen"
                title="We run them, and the cost sheet is how you can tell."
              >
                <p>
                  Any operator can claim there is no middleman. What is harder
                  to fake is a ledger that adds up.
                </p>
              </SectionHead>

              <p className="mt-6 max-w-[68ch] text-base text-muted-foreground">
                A brokered trip has to carry two margins — the agency’s and the
                operator’s — and the second one is invisible, because it is
                inside a number the agency buys at and does not publish. Every
                departure here publishes each cost line with who receives it,
                and a single fee line that is ours. If we were reselling, one of
                two things would be true: the line items would not add up to the
                price, or our fee would be implausibly small for the work
                described. Both are checkable, and both are checked by the build
                before the page can ship.
              </p>

              <p className="mt-4 max-w-[68ch] text-base text-muted-foreground">
                The guides are on{" "}
                <Link
                  href="/team"
                  className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  the team page
                </Link>{" "}
                with their certification and licence numbers, and the method
                behind the numbers is on{" "}
                <Link
                  href="/pricing"
                  className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  the pricing page
                </Link>
                .
              </p>
            </div>
          </Reveal>

          <Reveal as="section">
            <div id="guarantee">
              <SectionHead
                eyebrow="The guarantee"
                title="A published minimum, and a date we decide by."
              >
                <p>
                  Every departure states how many travellers it needs and the
                  date it is decided. Below that number on that date it is
                  cancelled and refunded in full.
                </p>
              </SectionHead>

              <p className="mt-6 max-w-[68ch] text-base text-muted-foreground">
                The money for that refund is a line in the departure’s own cost
                sheet, held against your trip rather than pooled — so the refund
                does not depend on how the rest of the season sells. The
                mechanism only means anything if the times it was used are
                visible, which is why the dates that did not reach their minimum
                are published on their trek’s page rather than quietly deleted.
              </p>
            </div>
          </Reveal>

          <Reveal as="section">
            <div id="what-we-are-new-at">
              <SectionHead eyebrow="Honestly" title="What we are new at.">
                <p>
                  A new operator implying a long record is the specific claim
                  this site exists to argue against. So: we are new.
                </p>
              </SectionHead>

              <div className="mt-8 rounded-lg border-2 border-prayer bg-prayer/10 p-6">
                <p className="max-w-[68ch] text-base">
                  We have not run a full season. We have no incident history to
                  publish, because we have no incidents and no trips — and an
                  operator publishing zero incidents is either very small or not
                  counting, so read ours as the first. {pendingCredentials} of{" "}
                  {CREDENTIALS.length} credentials are still pending, and{" "}
                  {pendingGuides} of {GUIDES.length} guide records are
                  placeholders rather than people.
                </p>
              </div>

              <h3 className="mt-10 font-display text-xl tracking-tight">
                What that actually costs you
              </h3>
              <ul className="mt-4 grid max-w-[68ch] gap-3 text-base text-muted-foreground">
                <li>
                  No track record to check. You cannot ask somebody who went
                  last year, because nobody did.
                </li>
                <li>
                  Our contingency planning is reasoned rather than remembered.
                  We have written down what we expect to go wrong and what it
                  costs; an operator with ten seasons knows.
                </li>
                <li>
                  A departure that does not fill is more likely in a first
                  season, which is why the minimum and the decision date are on
                  every date before you book rather than after.
                </li>
              </ul>

              <h3 className="mt-10 font-display text-xl tracking-tight">
                What to check before trusting us
              </h3>
              <ul className="mt-4 grid max-w-[68ch] gap-3 text-base text-muted-foreground">
                <li>
                  Our registration and licence, against the issuing bodies’ own
                  registers rather than against this site —{" "}
                  <Link
                    href="/licences"
                    className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    every one is listed with how to check it
                  </Link>
                  .
                </li>
                <li>
                  The licence number of the guide assigned to your departure,
                  which we give you before you pay a balance.
                </li>
                <li>
                  That the cost sheet on your date adds up, and that the fee
                  looks like a fee rather than a hidden margin.
                </li>
                <li>
                  Our insurance: the insurer, the cover limit, and the altitude
                  ceiling. Any one of those alone is not an answer.
                </li>
                <li>
                  Ask us something specific and see how long we take. The reply
                  time is a commitment on{" "}
                  <Link
                    href="/contact"
                    className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    the contact page
                  </Link>
                  , and it is one of the few things you can test before paying
                  anything.
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
