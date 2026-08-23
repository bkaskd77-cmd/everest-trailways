import Link from "next/link";
import type { Metadata } from "next";

import {
  DocSectionBlock,
  DocumentPage,
} from "@/components/trust/document-page";
import {
  ACCLIMATISATION_POLICY,
  DESCENT_RULE,
  EQUIPMENT_AT_ALTITUDE,
  EVACUATION_COMMISSION,
  INCIDENT_REPORTING,
  IPPG_REFERENCE,
  PORTER_WELFARE,
  RATIO_BANDS,
  RESCUE_COORDINATION,
  WHAT_WE_DO_NOT_DO,
  bandFor,
  certificationTierSet,
} from "@/content/safety";
import { departures } from "@/content/departures";

export const metadata: Metadata = {
  title: "Safety",
  description:
    "Guide ratios by altitude, the certification each band requires, the descent rule, acclimatisation, rescue coordination, porter welfare — and what we do not do.",
  alternates: { canonical: "/safety" },
};

const LAST_REVIEWED = "2026-08-23";

/**
 * Safety as a table, not as reassurance.
 *
 * Everything structural on this page is read from the same data the departure
 * pages are built from, and `check:safety` fails the build if any departure's
 * ratio, staffing or required certification contradicts what is stated here. A
 * page of paragraphs could not be checked against nineteen departures; a table
 * can, which is the whole reason it is one.
 */
export default function SafetyPage() {
  const tiers = certificationTierSet();

  /* Every departure, grouped by the band its altitude puts it in. */
  const byBand = RATIO_BANDS.map((band) => ({
    band,
    departures: departures.filter((d) => bandFor(d.maxAltitudeM) === band),
  }));

  return (
    <DocumentPage
      eyebrow="Safety"
      title="What we do, how it is staffed, and what we cannot do."
      lastReviewed={LAST_REVIEWED}
      sections={[
        { id: "ratios", title: "Ratios and certification" },
        { id: "catalogue", title: "Every departure, by band" },
        { id: "descent", title: "The descent rule" },
        { id: "acclimatisation", title: "Acclimatisation" },
        { id: "equipment", title: "Equipment at altitude" },
        { id: "rescue", title: "Rescue coordination" },
        { id: "commission", title: "Evacuation commission" },
        { id: "porters", title: "Porter welfare" },
        { id: "incidents", title: "Incident reporting" },
        { id: "not", title: "What we do not do" },
      ]}
      intro={
        <p>
          Most of this page is a table rather than a paragraph, because a
          promise about staffing is only worth anything if it can be checked
          against the trips actually on sale. The build fails if any departure
          contradicts what is stated here.
        </p>
      }
    >
      <DocSectionBlock
        id="ratios"
        title="Guide ratios by altitude, and the certification each band needs"
        lead={
          <p>
            Nepal certifies trekking guides in altitude-banded tiers. The tier
            names and bands below are{" "}
            <strong>placeholders pending the current regulation</strong> — they
            are stored as data precisely because thresholds change, and a number
            invented here would be checkable against the real rule and found
            wrong.
          </p>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Guide ratios by altitude band and the certification tier each
              requires.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Altitude band
                </th>
                <th
                  scope="col"
                  className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Guide ratio
                </th>
                <th
                  scope="col"
                  className="py-3 pr-4 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Certified to at least
                </th>
                <th
                  scope="col"
                  className="py-3 text-xs tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {RATIO_BANDS.map((b) => (
                <tr key={b.aboveM} className="border-b border-border/60">
                  <th
                    scope="row"
                    className="py-4 pr-4 align-top tabular font-normal whitespace-nowrap"
                  >
                    {b.aboveM === 0
                      ? "Below 3,000 m"
                      : `Above ${b.aboveM.toLocaleString("en-GB")} m`}
                  </th>
                  <td className="py-4 pr-4 align-top tabular">
                    {b.guideRatio}
                  </td>
                  <td className="py-4 pr-4 align-top tabular">
                    {b.requiresTierAtLeastM.toLocaleString("en-GB")} m
                  </td>
                  <td className="max-w-[46ch] py-4 align-top text-muted-foreground">
                    {b.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-10 font-display text-xl tracking-tight">
          Certification tiers on file
        </h3>
        <ul className="mt-4 grid gap-3">
          {tiers.map((t) => (
            <li
              key={t.level}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <p className="tabular">
                <strong>{t.level}</strong> — valid to{" "}
                {t.maxAltitudeM.toLocaleString("en-GB")} m
              </p>
              {t.note && <p className="mt-1 text-muted-foreground">{t.note}</p>}
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-[68ch] text-sm text-muted-foreground">
          The guide assigned to your departure is named once the departure is
          guaranteed, with their licence number and the expiry of their
          wilderness first aid. We do not publish a name before we have one — an
          invented name on this page would undo everything the rest of the site
          is for.
        </p>
      </DocSectionBlock>

      <DocSectionBlock
        id="catalogue"
        title="Every departure, and the certification it requires"
        lead={
          <p>
            Derived from each route’s maximum altitude against the tier set
            above. No departure page and no entry here is typed by hand.
          </p>
        }
      >
        <div className="grid gap-8">
          {byBand.map(({ band, departures: list }) => (
            <div key={band.aboveM}>
              <h3 className="font-display tabular text-lg tracking-tight">
                {band.aboveM === 0
                  ? "Below 3,000 m"
                  : `Above ${band.aboveM.toLocaleString("en-GB")} m`}{" "}
                — {band.guideRatio}
              </h3>
              <ul className="mt-3 grid gap-2">
                {list.map((d) => (
                  <li key={d.id} className="text-sm">
                    <Link
                      href={`/departures/${d.slug}`}
                      className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                    >
                      {d.trekName}
                    </Link>
                    <span className="tabular text-muted-foreground">
                      {" "}
                      · {d.maxAltitudeM.toLocaleString("en-GB")} m · ratio{" "}
                      {d.guideRatio} · {d.guideRequirement.certificationLevel}
                    </span>
                  </li>
                ))}
                {list.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Nothing on sale in this band.
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </DocSectionBlock>

      {[
        DESCENT_RULE,
        ACCLIMATISATION_POLICY,
        EQUIPMENT_AT_ALTITUDE,
        RESCUE_COORDINATION,
        EVACUATION_COMMISSION,
      ].map((p) => (
        <DocSectionBlock key={p.id} id={p.id} title={p.title}>
          <p className="max-w-[68ch] text-base">{p.body}</p>
          {p.note && (
            <p className="mt-4 max-w-[68ch] text-sm text-muted-foreground">
              {p.note}
            </p>
          )}
        </DocSectionBlock>
      ))}

      <DocSectionBlock
        id="porters"
        title="Porter welfare"
        lead={<p>{IPPG_REFERENCE}</p>}
      >
        <ul className="grid gap-3">
          {PORTER_WELFARE.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-card p-5 text-sm"
            >
              <p>{c.commitment}</p>
              {c.note && (
                <p className="mt-2 text-xs tracking-[0.06em] text-prayer-deep uppercase">
                  {c.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </DocSectionBlock>

      <DocSectionBlock
        id={INCIDENT_REPORTING.id}
        title={INCIDENT_REPORTING.title}
      >
        <p className="max-w-[68ch] text-base">{INCIDENT_REPORTING.body}</p>
        {INCIDENT_REPORTING.note && (
          <p className="mt-4 max-w-[68ch] text-sm text-muted-foreground">
            {INCIDENT_REPORTING.note}
          </p>
        )}
      </DocSectionBlock>

      <DocSectionBlock
        id="not"
        title="What we do not do"
        lead={
          <p>
            A safety page listing only what a company does reads as a guarantee,
            and a guarantee is the one thing nobody can give at altitude. These
            are the limits.
          </p>
        }
      >
        <ul className="grid gap-4 rounded-lg border border-prayer/30 bg-prayer/5 p-6">
          {WHAT_WE_DO_NOT_DO.map((line) => (
            <li key={line} className="max-w-[68ch] text-base">
              {line}
            </li>
          ))}
        </ul>
      </DocSectionBlock>
    </DocumentPage>
  );
}
