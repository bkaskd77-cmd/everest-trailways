import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CloudRain } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { Reveal, StaggerGroup } from "@/components/motion";
import { SectionHead } from "@/components/departure/section-head";
import { CostLedger } from "@/components/departure/cost-ledger";
import { PracticalitiesSection } from "@/components/departure/practicalities";
import {
  ACTIVITIES,
  activityBySlug,
  availabilitySentence,
  hasGuarantee,
} from "@/content/activities";
import {
  byId as departureById,
  estimableExtras,
  formatDateRange,
  lineAmount,
  notProvidedLines,
  optionalLines,
  providedLines,
} from "@/content/departures";
import { trekById } from "@/content/trek-pages";
import { textShadowCss } from "@/lib/hero-scrim";
import { siteConfig } from "@/lib/site";

/**
 * One activity, in the same architecture as a departure page — minus the one
 * block that would be a lie.
 *
 * A departure page opens with a guarantee: bookings so far, the minimum to
 * run, the date we decide. An on-demand activity has none of those, so it gets
 * an availability block instead. That is not a cosmetic swap. Rendering
 * "3 more bookings needed" beside a paraglide that goes for one person would
 * be describing a mechanism we do not operate, which is the whole reason
 * activities are a separate type rather than departures with a minimum of one.
 */

export function generateStaticParams() {
  return ACTIVITIES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = activityBySlug(slug);
  if (!a) return { title: "Activity not found" };
  return {
    title: a.name,
    description: a.summary,
    alternates: { canonical: `/activities/${a.slug}` },
    openGraph: {
      title: `${a.name} — ${siteConfig.name}`,
      description: a.summary,
      url: `${siteConfig.url}/activities/${a.slug}`,
    },
  };
}

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

const WEATHER_LABEL = {
  none: "Runs in most weather",
  moderate: "Weather affects it",
  high: "Weather can cancel it",
} as const;

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = activityBySlug(slug);
  if (!a) notFound();

  const provided = providedLines(a.costSheet);
  const excluded = notProvidedLines(a.costSheet);
  const extras = optionalLines(a.costSheet);
  const extrasFigure = estimableExtras(a.costSheet);
  const av = a.availability;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: a.name,
          description: a.summary,
          url: `${siteConfig.url}/activities/${a.slug}`,
          offers: {
            "@type": "Offer",
            price: a.priceUSD,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      {/* 1 — HEADER */}
      <header className="relative isolate overflow-hidden bg-summit text-glacier">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-summit via-summit/70 to-summit/30"
        />
        <div className="shell py-20 lg:py-28">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-glacier/70">
              <li>
                <Link href="/activities" className="hover:text-snow">
                  Activities
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/regions" className="hover:text-snow">
                  {a.region}
                </Link>
              </li>
            </ol>
          </nav>

          <h1
            className="mt-4 max-w-[16ch] font-display text-5xl tracking-tight text-balance lg:text-6xl"
            style={{ textShadow: textShadowCss("display") }}
          >
            {a.name}
          </h1>

          <dl
            className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm"
            style={{ textShadow: textShadowCss("small") }}
          >
            {[
              [
                "Takes",
                a.durationDays
                  ? `${a.durationDays} days`
                  : `${a.durationHours} hours`,
              ],
              ["Group", `${a.minParticipants}–${a.maxParticipants}`],
              [
                a.priceScaling ? "From, at " + a.minParticipants : "Per person",
                money(a.priceUSD),
              ],
              ["Weather", WEATHER_LABEL[a.weatherDependency]],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs tracking-[0.14em] text-glacier/70 uppercase">
                  {label}
                </dt>
                <dd className="mt-1 tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main className="bg-band-sunk">
        {/* 2 — SUMMARY */}
        <section className="shell py-16 lg:py-20">
          <Reveal>
            <p className="max-w-[62ch] font-display text-2xl tracking-tight text-balance lg:text-3xl">
              {a.summary}
            </p>
          </Reveal>
        </section>

        {/* 3 — AVAILABILITY, in place of a departure's guarantee block.
               Composed from the mode, so guarantee language cannot reach a
               product with no threshold to guarantee. */}
        <section
          aria-labelledby="availability-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="When it runs"
              id="availability-heading"
              title={
                av.mode === "on-demand"
                  ? "On demand, with no minimum to reach."
                  : av.mode === "seasonal-window"
                    ? "In season, and not outside it."
                    : "On fixed dates, like a trek."
              }
            >
              <p>{availabilitySentence(a)}</p>
            </SectionHead>

            {av.mode === "seasonal-window" && (
              <ul className="mt-10 grid gap-3">
                {av.windows.map((w) => (
                  <Reveal as="li" key={w.from}>
                    <div className="rounded-lg border border-border bg-card p-5 text-sm">
                      <p className="font-display tabular text-lg tracking-tight">
                        {w.from} to {w.to}
                      </p>
                      <p className="mt-1 text-muted-foreground">{w.note}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            )}

            {av.mode === "scheduled" && (
              <ul className="mt-10 grid gap-3">
                {av.departures.map((id) => {
                  /* `departures` holds ids, not slugs. */
                  const d = departureById(id) ?? null;
                  return (
                    <Reveal as="li" key={id}>
                      <div className="rounded-lg border border-border bg-card p-5 text-sm">
                        {d ? (
                          <Link href={`/departures/${d.slug}`}>
                            <span className="font-display tabular text-lg tracking-tight">
                              {formatDateRange(d.departsOn, d.returnsOn)}
                            </span>
                            <span className="mt-1 block text-muted-foreground">
                              {d.seatsBooked} booked, {d.minimumToRun} needed to
                              run, decided {d.decisionDate}
                            </span>
                          </Link>
                        ) : (
                          <span className="tabular">{id}</span>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
              </ul>
            )}

            {a.ageLimits && (
              <p className="mt-8 max-w-[62ch] text-sm text-muted-foreground">
                {a.ageLimits.min ? `Minimum age ${a.ageLimits.min}. ` : ""}
                {a.ageLimits.max ? `Maximum age ${a.ageLimits.max}. ` : ""}
                {a.ageLimits.note}
              </p>
            )}
          </div>
        </section>

        {/* 4 — PRICE SCALING, where the price moves with group size. */}
        {a.priceScaling && (
          <section
            aria-labelledby="scaling-heading"
            className="border-t border-border py-16 lg:py-20"
          >
            <div className="shell">
              <SectionHead
                eyebrow="Price by group size"
                id="scaling-heading"
                title="What it costs each, depending on how many of you there are."
              >
                <p>
                  The headline figure is what {a.minParticipants}{" "}
                  {a.minParticipants === 1 ? "person pays" : "people pay"} each
                  — not the best case. A “from” price that only applies at four
                  people is the hidden cost this site exists to argue against,
                  so the whole table is here.
                </p>
              </SectionHead>

              <div className="mt-10 overflow-x-auto">
                <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Per-person price by number of participants.
                  </caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        scope="col"
                        className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                      >
                        Participants
                      </th>
                      <th
                        scope="col"
                        className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                      >
                        Each
                      </th>
                      <th
                        scope="col"
                        className="py-3 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.priceScaling.map((b) => (
                      <tr
                        key={b.participants}
                        className="border-b border-border/60"
                      >
                        <th
                          scope="row"
                          className="py-4 pr-4 tabular font-normal"
                        >
                          {b.participants}
                        </th>
                        <td className="py-4 pr-4 tabular">
                          {money(b.priceUSD)}
                        </td>
                        <td className="py-4 tabular text-muted-foreground">
                          {money(b.priceUSD * b.participants)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 5 — WHAT IT COSTS. The same ledger a departure publishes. */}
        <section
          aria-labelledby="cost-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="What it costs"
              id="cost-heading"
              title={`${money(a.priceUSD)} per person, itemised.`}
            >
              <p>
                The same cost sheet a trek carries: every line, who is paid, and
                what we keep. Roughly {money(extrasFigure.total)} of estimable
                extras sit outside it
                {extrasFigure.varies
                  ? `, plus ${extrasFigure.varies} we cannot price honestly`
                  : ""}
                .
              </p>
            </SectionHead>

            <div className="mt-10">
              <CostLedger
                lines={provided}
                priceUSD={a.priceUSD}
                caption={`What ${a.name} costs, line by line.`}
              />
            </div>

            {excluded.length > 0 && (
              <div className="mt-12">
                <h3 className="font-display text-xl tracking-tight">
                  Not included
                </h3>
                <ul className="mt-4 grid gap-2 text-sm">
                  {excluded.map((l) => (
                    <li key={l.id} className="text-muted-foreground">
                      <span className="text-foreground">{l.label}</span> —{" "}
                      {l.estimatedAmountUSD === "varies"
                        ? "varies"
                        : money(lineAmount(l))}
                      , paid to {l.whoYouPay} {l.payableWhen}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extras.length > 0 && (
              <div className="mt-12">
                <h3 className="font-display text-xl tracking-tight">
                  Optional, not in the price
                </h3>
                <ul className="mt-4 grid gap-2 text-sm">
                  {extras.map((l) => (
                    <li key={l.id} className="text-muted-foreground">
                      <span className="text-foreground">{l.label}</span> —{" "}
                      {money(lineAmount(l))}
                      {l.note ? ` · ${l.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* 6 — WHEN IT DOES NOT RUN. Required where weather can cancel it. */}
        {a.costSheet.contingencies.length > 0 && (
          <section
            aria-labelledby="contingency-heading"
            className="border-t border-border py-16 lg:py-20"
          >
            <div className="shell">
              <SectionHead
                eyebrow="When things go wrong"
                id="contingency-heading"
                title={
                  a.weatherDependency === "high"
                    ? "This one gets cancelled by weather, and here is what happens."
                    : "What we do when it does not go to plan."
                }
              >
                <p>
                  Named triggers, what we actually do, and who pays — the same
                  model every departure uses.
                </p>
              </SectionHead>

              <StaggerGroup className="mt-10 grid gap-4">
                {a.costSheet.contingencies.map((c) => (
                  <Reveal key={c.id}>
                    <div className="rounded-lg border border-border bg-card p-6">
                      <p className="flex items-start gap-3 font-display text-xl tracking-tight">
                        {a.weatherDependency === "high" ? (
                          <CloudRain
                            aria-hidden
                            className="mt-1 size-5 shrink-0 text-prayer-deep"
                          />
                        ) : (
                          <AlertTriangle
                            aria-hidden
                            className="mt-1 size-5 shrink-0 text-prayer-deep"
                          />
                        )}
                        {c.trigger}
                      </p>
                      <dl className="mt-4 grid gap-3 text-sm lg:grid-cols-[10rem_1fr] lg:gap-x-8">
                        <dt className="text-muted-foreground">How often</dt>
                        <dd>{c.likelihood}</dd>
                        <dt className="text-muted-foreground">What we do</dt>
                        <dd>{c.whatWeDo}</dd>
                        <dt className="text-muted-foreground">Who pays</dt>
                        <dd className="capitalize">{c.whoPays}</dd>
                        {c.note && (
                          <>
                            <dt className="text-muted-foreground">Note</dt>
                            <dd>{c.note}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  </Reveal>
                ))}
              </StaggerGroup>
            </div>
          </section>
        )}

        {/* 7 — SAFETY */}
        <section
          aria-labelledby="safety-heading"
          className="border-t border-border bg-band py-16 lg:py-20"
        >
          <div className="shell">
            <SectionHead
              eyebrow="Safety"
              id="safety-heading"
              title="What this asks of you, and what it does not."
            >
              <p>
                Specific to this activity. The company-wide position, including
                what we do not do, is on{" "}
                <Link
                  href="/safety"
                  className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  the safety page
                </Link>
                .
              </p>
            </SectionHead>

            <ul className="mt-10 grid gap-4">
              {a.safetyNotes.map((n) => (
                <Reveal as="li" key={n}>
                  <p className="max-w-[68ch] rounded-lg border border-border bg-card p-5 text-sm">
                    {n}
                  </p>
                </Reveal>
              ))}
            </ul>

            <div className="mt-10 rounded-lg border border-border bg-card p-6 text-sm">
              <h3 className="font-display text-lg tracking-tight">
                What it asks physically
              </h3>
              <dl className="mt-4 grid gap-3 lg:grid-cols-[10rem_1fr] lg:gap-x-8">
                <dt className="text-muted-foreground">On the go</dt>
                <dd className="tabular">
                  {a.physicalDemand.walkingHoursPerDay} hours a day,{" "}
                  {a.physicalDemand.consecutiveDays}{" "}
                  {a.physicalDemand.consecutiveDays === 1 ? "day" : "days"}
                </dd>
                <dt className="text-muted-foreground">Terrain</dt>
                <dd>{a.physicalDemand.terrain}</dd>
                <dt className="text-muted-foreground">Before you come</dt>
                <dd>{a.physicalDemand.preparationNote}</dd>
              </dl>
            </div>
          </div>
        </section>

        {/* 8 — PRACTICALITIES, the same component a departure uses */}
        <PracticalitiesSection practicalities={a.practicalities} />

        {/* 9 — COMBINES WITH */}
        {a.combinesWith.length > 0 && (
          <section
            aria-labelledby="combines-heading"
            className="border-t border-border py-16 lg:py-20"
          >
            <div className="shell">
              <SectionHead
                eyebrow="Pairs with"
                id="combines-heading"
                title="Treks this fits alongside."
              >
                <p>
                  Same region or the same trip either side of it. Each trek page
                  lists this activity back.
                </p>
              </SectionHead>

              <StaggerGroup as="ul" className="mt-10 grid gap-3">
                {a.combinesWith.map((trekId) => {
                  const trek = trekById(trekId);
                  if (!trek) return null;
                  return (
                    <Reveal as="li" key={trekId}>
                      <Link
                        href={`/treks/${trek.slug}`}
                        className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25"
                      >
                        <span>
                          <span className="font-display text-lg tracking-tight">
                            {trek.name}
                          </span>
                          <span className="mt-1 block tabular text-sm text-muted-foreground">
                            {trek.region} ·{" "}
                            {trek.maxAltitudeM.toLocaleString("en-GB")} m
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                        />
                      </Link>
                    </Reveal>
                  );
                })}
              </StaggerGroup>
            </div>
          </section>
        )}

        {/* 10 — CLOSE. No guarantee language where there is no guarantee. */}
        <section className="border-t border-border py-16 lg:py-24">
          <div className="shell">
            <Reveal>
              <h2 className="max-w-[22ch] font-display text-3xl tracking-tight text-balance lg:text-4xl">
                {hasGuarantee(a)
                  ? "Fixed dates, with a published minimum."
                  : "Tell us when you want to go."}
              </h2>
              <p className="mt-4 max-w-[56ch] text-muted-foreground">
                {hasGuarantee(a)
                  ? "This one runs as a dated group trip, so it carries the same minimum and decision date as a trek."
                  : `There is no date to fill and no minimum to reach — we need ${
                      a.availability.mode === "on-demand"
                        ? `${a.availability.leadTimeDays} days' notice`
                        : "a date inside the season"
                    }, and that is the whole condition.`}
              </p>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
