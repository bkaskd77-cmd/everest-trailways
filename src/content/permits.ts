/*
 * ============================================================================
 * PLACEHOLDER DATA. EVERY AMOUNT AND DATE BELOW IS INVENTED.
 * ============================================================================
 *
 * Not one figure in this file has been checked against a real fee schedule and
 * none of it should be published. The names are shaped like real permits so
 * the composition can be seen working; the numbers are deliberately round and
 * obviously fake so nobody mistakes them for research. Admin replaces the
 * records; nothing in the logic changes when they do.
 *
 * There is a reason this is data and not code. Nepal's permit regime moves —
 * TIMS was discontinued outright — and a codebase with "TIMS card, $20"
 * written into a cost sheet builder would have gone on charging for a permit
 * that no longer exists, on every page, until somebody noticed. That is the
 * exact failure this file is shaped to prevent.
 * ============================================================================
 */

export type PermitStatus = "active" | "superseded" | "discontinued";

export type Permit = {
  id: string;
  name: string;
  issuingBody: string;
  /** Region names as used by the treks. A permit may cover several. */
  appliesToRegions: string[];
  amountUSD: number;
  basis: "per-person" | "per-group" | "per-entry";
  /** ISO date. The first departure date this record applies to. */
  effectiveFrom: string;
  /**
   * ISO date, exclusive of nothing — a departure on this date still uses it.
   * Absent means "still in force".
   */
  effectiveUntil?: string;
  status: PermitStatus;
  /** Required when status is 'superseded'. The record that replaced it. */
  supersededBy?: string;
  verifyUrl?: string;
  note?: string;
};

/**
 * A permit TYPE, not a permit.
 *
 * Treks require types — "the conservation area fee for this region" — and the
 * record that satisfies a type depends on when the departure runs. Keeping the
 * two apart is what lets a fee change without touching a single trek, and what
 * lets a past departure keep the figure that applied on its date.
 */
export type PermitType = string;

export const PERMITS: Permit[] = [
  /* ------------------------------------------------------- conservation */
  {
    id: "acap-2026",
    name: "Annapurna Conservation Area Permit",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Annapurna", "Mustang"],
    amountUSD: 30,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT.",
  },
  {
    id: "sagarmatha-2026",
    name: "Sagarmatha National Park Entry",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Khumbu"],
    amountUSD: 30,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT.",
  },
  {
    id: "langtang-2026",
    name: "Langtang National Park Entry",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Langtang"],
    amountUSD: 30,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT.",
  },
  {
    id: "terai-parks-2026",
    name: "Terai National Park Entry",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Terai"],
    amountUSD: 20,
    basis: "per-entry",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT.",
  },
  {
    id: "valley-rim-2026",
    name: "Kathmandu Valley Rim Area Entry",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Kathmandu Valley"],
    amountUSD: 10,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT.",
  },

  /* --------------------------------------------------------- restricted */
  {
    id: "restricted-mustang-2026",
    name: "Upper Mustang Restricted Area Permit",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Mustang"],
    amountUSD: 500,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT. Restricted-area permits are the reason Upper Mustang costs what it does.",
  },

  /* ------------------------------------------------ a superseded record */
  /*
   * The same fee at a different figure, so the validity windows can be seen
   * doing their job: a departure before the changeover keeps the old amount,
   * one after it gets the new one, and neither trek was edited.
   */
  {
    /*
     * Retired long ago, and still here. A record only becomes `superseded`
     * once its replacement is actually in force — marking the current record
     * superseded the day a future one is drafted takes it out of composition
     * while it is still the fee people are paying, which is a live way to
     * under-charge a whole season.
     */
    id: "local-levy-2019",
    name: "Rural Municipality Trekking Levy",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Annapurna", "Khumbu", "Langtang"],
    amountUSD: 10,
    basis: "per-person",
    effectiveFrom: "2019-01-01",
    effectiveUntil: "2019-12-31",
    status: "superseded",
    supersededBy: "local-levy-2024",
    note: "PLACEHOLDER AMOUNT.",
  },
  {
    id: "local-levy-2024",
    name: "Rural Municipality Trekking Levy",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Annapurna", "Khumbu", "Langtang"],
    amountUSD: 15,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    effectiveUntil: "2026-12-31",
    status: "active",
    note: "PLACEHOLDER AMOUNT. In force until the 2027 record takes over.",
  },
  {
    id: "local-levy-2027",
    name: "Rural Municipality Trekking Levy",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: ["Annapurna", "Khumbu", "Langtang"],
    amountUSD: 20,
    basis: "per-person",
    effectiveFrom: "2027-01-01",
    status: "active",
    note: "PLACEHOLDER AMOUNT. Replaces local-levy-2024.",
  },

  /* ---------------------------------------------- a discontinued record */
  /*
   * Deliberately here and deliberately discontinued, so the mechanism can be
   * watched dropping a permit from every cost sheet at once. This is modelled
   * on what actually happened to TIMS: a permit that existed for years, was
   * charged on every trek, and then stopped existing.
   */
  {
    id: "trekker-registration-legacy",
    name: "Trekker Registration Card",
    issuingBody: "PLACEHOLDER — issuing body not verified",
    appliesToRegions: [
      "Annapurna",
      "Khumbu",
      "Langtang",
      "Mustang",
      "Kathmandu Valley",
    ],
    amountUSD: 17,
    basis: "per-person",
    effectiveFrom: "2020-01-01",
    effectiveUntil: "2025-12-31",
    status: "discontinued",
    note: "PLACEHOLDER AMOUNT. Discontinued — kept so past cost sheets stay truthful and so nobody re-adds it by hand.",
  },
];

/* ----------------------------------------------------------- composition */

const within = (permit: Permit, isoDate: string) =>
  permit.effectiveFrom <= isoDate &&
  (permit.effectiveUntil === undefined || isoDate <= permit.effectiveUntil);

/**
 * The permits that apply to a region on a date.
 *
 * This is the whole composition rule and it is deliberately small: a permit
 * applies when it is active, when it covers the region, and when the departure
 * date falls inside its validity window. Nothing about permits is stored on a
 * departure, so discontinuing one removes it from every affected cost sheet at
 * once, and a price change is a new record rather than an edit — which is what
 * keeps a past departure showing the figure that applied on its date.
 */
export function permitsFor(
  types: PermitType[],
  region: string,
  isoDate: string,
): Permit[] {
  return types
    .map((type) =>
      PERMITS.find(
        (p) =>
          p.name === type &&
          p.status === "active" &&
          p.appliesToRegions.includes(region) &&
          within(p, isoDate),
      ),
    )
    .filter((p): p is Permit => Boolean(p));
}

/** Every record ever issued for a type, newest window first. Admin history. */
export const permitHistory = (name: PermitType) =>
  PERMITS.filter((p) => p.name === name).sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );

export const permitById = (id: string) => PERMITS.find((p) => p.id === id);
