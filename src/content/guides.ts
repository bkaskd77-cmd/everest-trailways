/*
 * ============================================================================
 * NO REAL PERSON IS DESCRIBED IN THIS FILE.
 * ============================================================================
 *
 * Every name is a placeholder and says so. Every licence number is "—". Every
 * certifier and expiry is absent or marked. Not one of these records refers to
 * somebody who exists, and none of them may be published as though it did.
 *
 * The rule is the same one that governs credentials.ts and for the same
 * reason, but it bites harder here: a fabricated licence number is a lie about
 * a document, and a fabricated guide is a lie about a person — one a traveller
 * would be trusting with a decision at 5,000 m. The structure is the
 * deliverable; the people are entered by whoever holds their paperwork.
 * ============================================================================
 */

import { CERTIFICATION_TIERS } from "./certification.ts";

export type GuideRole =
  "lead-guide" | "assistant-guide" | "porter-guide" | "specialist";

export type Guide = {
  id: string;
  name: string;
  role: GuideRole;
  /** "—" until a document is held. Guarded against being set while pending. */
  licenceNumber: string;
  licenceIssuingBody: string;
  /** Must name a tier in certification.ts. Guarded. */
  certificationLevel: string;
  /** ISO date. A certification that lapses mid-trek is the failure to catch. */
  certificationExpiresOn?: string;
  wildernessFirstAid: { certifier: string; expiresOn: string } | null;
  languages: string[];
  yearsGuiding: number;
  homeRegion: string;
  regionsWorked: string[];
  /** Factual. The banned adjective list applies. */
  bio: string;
  photo?: { src: string; alt: string };
  status: "verified" | "pending";
};

/**
 * Why a guide is an entity rather than a field on a departure.
 *
 * Step 10 embedded `assignedGuide` inside Departure, which made three real
 * questions unanswerable. Whether the same person is on two trips at once —
 * invisible, because nothing could see across departures. Whether a
 * certification expires mid-season — invisible, because the record had no life
 * of its own. And whether the catalogue is staffable at all — invisible,
 * because there was no roster to count.
 *
 * A departure now references guides by id, and every one of those three is
 * arithmetic a guard can do.
 */
export const GUIDES: Guide[] = [
  {
    id: "guide-placeholder-1",
    name: "PLACEHOLDER — lead guide, Khumbu",
    role: "lead-guide",
    licenceNumber: "—",
    licenceIssuingBody: "PLACEHOLDER — issuing body not verified",
    certificationLevel: "PLACEHOLDER Tier 3",
    wildernessFirstAid: null,
    languages: ["PLACEHOLDER"],
    yearsGuiding: 0,
    homeRegion: "Khumbu",
    regionsWorked: ["Khumbu"],
    bio: "PLACEHOLDER. A record shape, not a person. Replaced when we hold a licence copy and a first-aid certificate for the guide it describes.",
    status: "pending",
  },
  {
    id: "guide-placeholder-2",
    name: "PLACEHOLDER — lead guide, Annapurna",
    role: "lead-guide",
    licenceNumber: "—",
    licenceIssuingBody: "PLACEHOLDER — issuing body not verified",
    certificationLevel: "PLACEHOLDER Tier 2",
    wildernessFirstAid: null,
    languages: ["PLACEHOLDER"],
    yearsGuiding: 0,
    homeRegion: "Annapurna",
    regionsWorked: ["Annapurna"],
    bio: "PLACEHOLDER. A record shape, not a person.",
    status: "pending",
  },
  {
    id: "guide-placeholder-3",
    name: "PLACEHOLDER — assistant guide, Annapurna",
    role: "assistant-guide",
    licenceNumber: "—",
    licenceIssuingBody: "PLACEHOLDER — issuing body not verified",
    certificationLevel: "PLACEHOLDER Tier 2",
    wildernessFirstAid: null,
    languages: ["PLACEHOLDER"],
    yearsGuiding: 0,
    homeRegion: "Annapurna",
    regionsWorked: ["Annapurna"],
    bio: "PLACEHOLDER. A record shape, not a person.",
    status: "pending",
  },
  {
    id: "guide-placeholder-4",
    name: "PLACEHOLDER — naturalist, Terai",
    role: "specialist",
    licenceNumber: "—",
    licenceIssuingBody: "PLACEHOLDER — issuing body not verified",
    certificationLevel: "PLACEHOLDER Tier 1",
    wildernessFirstAid: null,
    languages: ["PLACEHOLDER"],
    yearsGuiding: 0,
    homeRegion: "Terai",
    regionsWorked: ["Terai"],
    bio: "PLACEHOLDER. A record shape, not a person.",
    status: "pending",
  },
];

/**
 * Which guides are assigned to which departure.
 *
 * Lives beside the roster rather than in certification.ts, because it is
 * roster data: who is working which trip. Keeping it with the tier thresholds
 * also made it impossible to write one test that both assigns a guide and
 * expires their certificate — which is the exact pair the scheduling guard
 * exists to catch, so the split was hiding the thing it should have exposed.
 *
 * Empty on purpose. Assigning a placeholder person to a real date would put a
 * name on a departure page that no traveller could check, which is the failure
 * this whole file is shaped to avoid. The guards run over whatever is here, so
 * they are live from the first real assignment rather than switched on later.
 */
export const ASSIGNED_GUIDES: Record<string, string[]> = {};

export const guideById = (id: string) => GUIDES.find((g) => g.id === id);

export const guidesByIds = (ids: string[]) =>
  ids.map(guideById).filter((g): g is Guide => Boolean(g));

/**
 * How many porters we employ, and on what terms.
 *
 * Zero records, stated rather than omitted. A team page that lists guides and
 * says nothing about porters implies we do not use them or do not count them,
 * and both would be worse than an empty roster with a sentence explaining it.
 * The welfare standards those records will be held to are already published on
 * /safety and are not waiting on this.
 */
export const PORTERS = {
  recordCount: 0,
  note: "We hold no porter records in this system yet. Porters are engaged for the treks that carry a porter cost line — which is visible on those departures' cost sheets, with their wages and insurance as named amounts. Until every porter has a record here with their insurance and its altitude ceiling, this page will say so rather than publish a number we cannot support.",
} as const;

/* --------------------------------------------------------- derived counts */

/**
 * The roster summary, composed from the records.
 *
 * Composed rather than written, so the page cannot claim a count the roster
 * does not support. This is the same rule the cost sheets run on and it
 * matters more here: "six guides hold the top certification" is the kind of
 * sentence somebody types once and never revisits.
 */
export function rosterSummary() {
  const byTier = CERTIFICATION_TIERS.map((tier) => ({
    tier,
    guides: GUIDES.filter((g) => g.certificationLevel === tier.level),
  }));

  const withCurrentFirstAid = GUIDES.filter(
    (g) => g.wildernessFirstAid !== null,
  );

  return {
    total: GUIDES.length,
    verified: GUIDES.filter((g) => g.status === "verified").length,
    pending: GUIDES.filter((g) => g.status === "pending").length,
    byTier,
    withCurrentFirstAid: withCurrentFirstAid.length,
    withoutFirstAid: GUIDES.length - withCurrentFirstAid.length,
    withLicenceNumber: GUIDES.filter((g) => g.licenceNumber !== "—").length,
  };
}

/** Is this qualification still valid on the given date? */
export const validOn = (expiresOn: string | undefined, isoDate: string) =>
  expiresOn === undefined || expiresOn >= isoDate;
