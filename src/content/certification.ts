/*
 * ============================================================================
 * PLACEHOLDER DATA. THE TIER NAMES AND ALTITUDE BANDS BELOW ARE INVENTED.
 * ============================================================================
 *
 * Nepal certifies trekking guides in altitude-banded tiers, and a traveller is
 * well advised to confirm that the guide assigned to their departure is
 * certified for the altitude the route reaches. Almost no operator publishes
 * that per departure. We intend to.
 *
 * What is NOT in this file is any claim about what the real bands are. The
 * thresholds are regulation, they change, and inventing them would be worse
 * than useless — a reader could check the number against the rule and find we
 * had made it up, on the page arguing that everything here is checkable.
 *
 * So the derivation is code and the thresholds are data. Admin replaces these
 * records with the real bands and nothing else moves.
 * ============================================================================
 */

export type CertificationTier = {
  /** Placeholder label. Replaced with the real designation. */
  level: string;
  /** The highest altitude this tier is certified to work at. */
  maxAltitudeM: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  note?: string;
};

export const CERTIFICATION_TIERS: CertificationTier[] = [
  {
    level: "PLACEHOLDER Tier 1",
    maxAltitudeM: 3000,
    effectiveFrom: "2020-01-01",
    note: "PLACEHOLDER BAND. Trekking below the altitude at which acute mountain sickness is a routine concern.",
  },
  {
    level: "PLACEHOLDER Tier 2",
    maxAltitudeM: 4500,
    effectiveFrom: "2020-01-01",
    note: "PLACEHOLDER BAND. Trekking where altitude illness is a working part of the job.",
  },
  {
    level: "PLACEHOLDER Tier 3",
    maxAltitudeM: 6000,
    effectiveFrom: "2020-01-01",
    note: "PLACEHOLDER BAND. High trekking, including passes above 5,000 m.",
  },
];

export type GuideRequirement = {
  /** DERIVED from the route's maximum altitude against the tier set. */
  certificationLevel: string;
  /** Composed, in plain terms. Never stored. */
  reason: string;
  /**
   * References into `guides.ts`, not embedded records.
   *
   * The embedded version could not answer the three questions that make
   * publishing a guide worth anything: is this person on two trips at once,
   * does their certification survive the trip, and is the catalogue staffable
   * at all. All three need a roster to look across, so the roster is the
   * entity and this is a reference to it.
   */
  assignedGuideIds: string[];
};

const inForce = (tier: CertificationTier, isoDate: string) =>
  tier.effectiveFrom <= isoDate &&
  (tier.effectiveUntil === undefined || isoDate <= tier.effectiveUntil);

/**
 * The lowest tier that covers this altitude.
 *
 * Lowest rather than highest on purpose: the requirement is a floor, not a
 * preference. A 3,210 m walk needs a guide certified to at least 3,210 m, and
 * saying it needs the top tier would be a claim we would then have to meet on
 * every departure or quietly break.
 */
export function tierFor(
  maxAltitudeM: number,
  isoDate: string,
): CertificationTier | undefined {
  return CERTIFICATION_TIERS.filter((t) => inForce(t, isoDate))
    .filter((t) => t.maxAltitudeM >= maxAltitudeM)
    .sort((a, b) => a.maxAltitudeM - b.maxAltitudeM)[0];
}

/**
 * What this departure requires of its guide, and who is assigned.
 *
 * The requirement is derived. The guide is not: we never invent a name or a
 * licence number, and where nobody is assigned yet the page says the guide is
 * named once the departure is guaranteed — which is a promise the FAQ already
 * makes, so it costs nothing to keep and would cost a great deal to break.
 *
 * A fabricated licence number on the site that argues for verifiability is the
 * worst single failure available here, and it is the easy mistake: a plausible
 * string in a field nobody checks. The guard fails on any licence number
 * present without `status: "verified"`.
 */
export function guideRequirement(
  maxAltitudeM: number,
  departsOn: string,
  assignedGuideIds: string[] = [],
): GuideRequirement {
  const tier = tierFor(maxAltitudeM, departsOn);
  const height = maxAltitudeM.toLocaleString("en-GB");

  return {
    certificationLevel:
      tier?.level ?? "PLACEHOLDER — no tier covers this route",
    reason: tier
      ? `This route reaches ${height} m, so the guide must hold a certification valid to at least that altitude. ${tier.level} covers up to ${tier.maxAltitudeM.toLocaleString("en-GB")} m.`
      : `This route reaches ${height} m and no certification tier on file covers it. That is a gap in our data, not a permission to run it.`,
    assignedGuideIds,
  };
}
