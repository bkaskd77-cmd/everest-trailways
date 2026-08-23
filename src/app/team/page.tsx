import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { Reveal, StaggerGroup } from "@/components/motion";
import { SectionHead } from "@/components/departure/section-head";
import { CERTIFICATION_TIERS } from "@/content/certification";
import { GUIDES, PORTERS, rosterSummary } from "@/content/guides";
import { departures } from "@/content/departures";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "The guiding team",
  description:
    "Every guide, their certification and what altitude it covers, their licence number and how to check it, first aid and its expiry, and the departures they are assigned to.",
  alternates: { canonical: "/team" },
};

/**
 * The proof behind "no middlemen".
 *
 * The trust strip has promised "meet the guiding team" since step 3 and the
 * departure FAQ has promised you can see a licence. Both pointed nowhere,
 * which is the worst version of a claim — made, and then not kept.
 *
 * What makes this page hard is what it must not do. Four placeholder records
 * with "—" for every number is an unimpressive page, and the pressure to make
 * it look like a team is exactly the pressure that produces invented people.
 * So the roster renders as it is, the summary is composed from the records
 * rather than asserted, and the page says plainly that nothing here is
 * verified yet.
 */
export default function TeamPage() {
  const summary = rosterSummary();

  const assignmentsFor = (guideId: string) =>
    departures.filter((d) =>
      d.guideRequirement.assignedGuideIds.includes(guideId),
    );

  const totalAssignments = departures.filter(
    (d) => d.guideRequirement.assignedGuideIds.length > 0,
  ).length;

  return (
    <main className="bg-band-sunk">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.name,
          url: `${siteConfig.url}/team`,
          employee: GUIDES.map((g) => ({
            "@type": "Person",
            name: g.name,
            jobTitle: g.role.replace(/-/g, " "),
          })),
        }}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          The team
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          The people you would actually be walking with.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          We run our own departures rather than passing them to another company,
          which is a claim worth nothing unless you can see who runs them. Every
          guide below carries the certification their routes require, and every
          licence number is checkable against the issuing body rather than
          against us.
        </p>

        <div className="mt-8 max-w-[70ch] rounded-lg border-2 border-prayer bg-prayer/10 p-5">
          <p className="text-xs tracking-[0.18em] text-prayer-deep uppercase">
            {summary.verified} of {summary.total} verified
          </p>
          <p className="mt-3 text-sm">
            <strong>
              None of the people below is real, and the page says so rather than
              filling itself in.
            </strong>{" "}
            These are record shapes waiting for guides whose licence copies and
            first-aid certificates we hold. A plausible name beside a plausible
            licence number is the easiest lie on this site to tell and the
            hardest for you to catch, so it is the one thing we will not do — on
            the page whose whole purpose is that you do not have to take our
            word for it.
          </p>
        </div>

        {/* ------------------------------------------------ the summary */}
        <section aria-labelledby="summary-heading" className="mt-16">
          <SectionHead
            eyebrow="The roster, counted"
            id="summary-heading"
            title="What the team holds, added up."
          >
            <p>
              Every figure here is counted from the records below rather than
              stated separately — there is no second place for these numbers to
              be written down, so there is no second place for them to be wrong.
            </p>
          </SectionHead>

          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CERTIFICATION_TIERS.map((tier) => {
              const held = summary.byTier.find(
                (t) => t.tier.level === tier.level,
              );
              return (
                <div
                  key={tier.level}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {tier.level}
                  </dt>
                  <dd className="mt-2 font-display tabular text-3xl tracking-tight">
                    {held?.guides.length ?? 0}
                  </dd>
                  <dd className="mt-1 tabular text-sm text-muted-foreground">
                    valid to {tier.maxAltitudeM.toLocaleString("en-GB")} m
                  </dd>
                </div>
              );
            })}

            <div className="rounded-lg border border-border bg-card p-5">
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Current wilderness first aid
              </dt>
              <dd className="mt-2 font-display tabular text-3xl tracking-tight">
                {summary.withCurrentFirstAid} of {summary.total}
              </dd>
              {summary.withoutFirstAid > 0 && (
                <dd className="mt-1 text-sm text-prayer-deep">
                  {summary.withoutFirstAid} without a certificate on file
                </dd>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Licence numbers published
              </dt>
              <dd className="mt-2 font-display tabular text-3xl tracking-tight">
                {summary.withLicenceNumber} of {summary.total}
              </dd>
              <dd className="mt-1 text-sm text-muted-foreground">
                A number appears only once we hold the document.
              </dd>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Departures with a guide named
              </dt>
              <dd className="mt-2 font-display tabular text-3xl tracking-tight">
                {totalAssignments} of {departures.length}
              </dd>
              <dd className="mt-1 text-sm text-muted-foreground">
                Guides are named once a departure is guaranteed.
              </dd>
            </div>
          </dl>
        </section>

        {/* -------------------------------------------------- the roster */}
        <section aria-labelledby="roster-heading" className="mt-20">
          <SectionHead
            eyebrow="The roster"
            id="roster-heading"
            title="Everyone, with what can be checked about them."
          />

          <StaggerGroup as="ul" className="mt-10 grid gap-4">
            {GUIDES.map((g) => (
              <Reveal as="li" key={g.id}>
                <article className="rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h3 className="font-display text-xl tracking-tight">
                      {g.name}
                    </h3>
                    <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                      {g.role.replace(/-/g, " ")}
                      {g.status !== "verified" && (
                        <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 normal-case">
                          pending
                        </span>
                      )}
                    </p>
                  </div>

                  <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
                    {g.bio}
                  </p>

                  <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm lg:grid-cols-2 lg:gap-x-10">
                    <div>
                      <dt className="text-muted-foreground">Certification</dt>
                      <dd className="tabular">
                        {g.certificationLevel}
                        {(() => {
                          const tier = CERTIFICATION_TIERS.find(
                            (t) => t.level === g.certificationLevel,
                          );
                          return tier
                            ? ` — valid to ${tier.maxAltitudeM.toLocaleString("en-GB")} m`
                            : "";
                        })()}
                        {g.certificationExpiresOn
                          ? `, expires ${g.certificationExpiresOn}`
                          : ""}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Licence</dt>
                      <dd className="tabular">
                        {g.licenceNumber} · {g.licenceIssuingBody}
                      </dd>
                      <dd className="mt-1 text-xs text-muted-foreground">
                        Check it against the issuing body’s own register rather
                        than against us.
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        Wilderness first aid
                      </dt>
                      <dd className="tabular">
                        {g.wildernessFirstAid
                          ? `${g.wildernessFirstAid.certifier}, expires ${g.wildernessFirstAid.expiresOn}`
                          : "No certificate on file"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        Languages, years, home
                      </dt>
                      <dd>
                        {g.languages.join(", ")} ·{" "}
                        <span className="tabular">{g.yearsGuiding}</span> years
                        · {g.homeRegion}
                      </dd>
                    </div>

                    <div className="lg:col-span-2">
                      <dt className="text-muted-foreground">
                        Assigned departures
                      </dt>
                      <dd>
                        {assignmentsFor(g.id).length === 0 ? (
                          "None currently assigned."
                        ) : (
                          <ul className="mt-1 grid gap-1">
                            {assignmentsFor(g.id).map((d) => (
                              <li key={d.id}>
                                <Link
                                  href={`/departures/${d.slug}`}
                                  className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                                >
                                  {d.trekName}
                                </Link>
                                <span className="tabular text-muted-foreground">
                                  {" "}
                                  · {d.departsOn} to {d.returnsOn}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              </Reveal>
            ))}
          </StaggerGroup>
        </section>

        {/* -------------------------------------------------- the porters */}
        <section aria-labelledby="porters-heading" className="mt-20">
          <SectionHead
            eyebrow="Porters"
            id="porters-heading"
            title={
              PORTERS.recordCount === 0
                ? "We hold no porter records here yet."
                : `${PORTERS.recordCount} porters on the books.`
            }
          >
            <p>
              The standards they are engaged under are already published in full
              on{" "}
              <Link
                href="/safety#porters"
                className="underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                the safety page
              </Link>{" "}
              — load limits, clothing, shelter, food, medical care, insurance,
              and what happens if somebody is injured.
            </p>
          </SectionHead>

          <p className="mt-8 max-w-[68ch] text-base text-muted-foreground">
            {PORTERS.note}
          </p>
        </section>
      </div>
    </main>
  );
}
