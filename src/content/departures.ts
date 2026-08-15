/**
 * Fixed departures.
 *
 * Travellers in this market actively distrust the phrase "fixed departure".
 * The common experience is an advertised date quietly cancelled for low
 * numbers, or arriving to discover you are a group of one. Roughly half of
 * group-departure participants are solo travellers, and the industry guide
 * ratio is 1:8–10.
 *
 * So this data is not a catalogue. It exists to answer one question for a solo
 * traveller deciding whether to commit: **will this date actually run?**
 *
 * THE RULES.
 *
 *   1. `priceUSD` is the total a solo traveller pays. Not "from", not a
 *      double-occupancy figure with a supplement bolted on later. Hidden cost
 *      is the single biggest complaint in this market.
 *   2. `singleSupplementUSD` is always displayed, including when it is 0.
 *      Omitting it is how the number gets sprung on someone at checkout.
 *   3. `priceExcludes` must be non-empty. Every trip excludes something; a
 *      blank list means nobody has written it down yet, not that it is all-in.
 *   4. `minimumToRun` and `decisionDate` are always public. This is the entire
 *      point of the section — the threshold is the promise.
 *   5. `groupSoFar` is country and count only. Never names, never ages, never
 *      anything that could identify a person who has already booked.
 *   6. Status is DERIVED, never stored. See `departureStatus`.
 *
 * Full guidance in departures.README.md.
 */

export type DepartureStatus =
  "guaranteed" | "needs-n" | "filling" | "full" | "closed";

export type Departure = {
  id: string;
  trekId: string;
  trekName: string;
  region: string;
  days: number;
  maxAltitudeM: number;
  difficulty: "moderate" | "challenging" | "strenuous";
  /** ISO date. */
  departsOn: string;
  returnsOn: string;
  seatsTotal: number;
  seatsBooked: number;
  /** The published threshold at which the departure is guaranteed to run. */
  minimumToRun: number;
  /** ISO date the guarantee was reached, when it has been. */
  guaranteedAt?: string;
  /** ISO date by which run / no-run is decided, always before departure. */
  decisionDate: string;
  guideRatio: string;
  /** Altitude in metres above which a second guide joins the group. */
  assistantGuideAbove?: number;
  /** All-in, per person, what a solo traveller is actually charged. */
  priceUSD: number;
  /** 0 when there is none. Always rendered. */
  singleSupplementUSD: number;
  priceIncludes: string[];
  /** Never empty. */
  priceExcludes: string[];
  costSheetHref: string;
  /** Anonymised. Country and count only. */
  groupSoFar: { country: string; count: number }[];
  image: { src: string; alt: string };
};

/** Swap to "/departures/everest-oct.jpg" when real photography lands. */
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=900&q=75`;

export const departures: Departure[] = [
  {
    id: "ebc-2026-10-14",
    trekId: "everest-base-camp",
    trekName: "Everest Base Camp",
    region: "Khumbu",
    days: 12,
    maxAltitudeM: 5364,
    difficulty: "challenging",
    departsOn: "2026-10-14",
    returnsOn: "2026-10-25",
    seatsTotal: 12,
    seatsBooked: 7,
    minimumToRun: 4,
    guaranteedAt: "2026-06-02",
    decisionDate: "2026-09-14",
    guideRatio: "1:4",
    assistantGuideAbove: 4000,
    priceUSD: 1890,
    singleSupplementUSD: 0,
    priceIncludes: [
      "All permits and TIMS card",
      "Kathmandu–Lukla flights",
      "Guide and porter wages, insurance and equipment",
      "Teahouse accommodation, twin or single at no extra cost",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Lunches and dinners in Kathmandu",
      "Tips (our policy is published, not expected)",
    ],
    costSheetHref: "/pricing/ebc-2026-10-14",
    groupSoFar: [
      { country: "Germany", count: 2 },
      { country: "Australia", count: 2 },
      { country: "Canada", count: 1 },
      { country: "Singapore", count: 2 },
    ],
    image: {
      src: unsplash("photo-1693717671076-374d59bc2ff2"),
      alt: "The trail into Everest Base Camp below the Khumbu icefall.",
    },
  },
  {
    id: "abc-2026-11-02",
    trekId: "annapurna-base-camp",
    trekName: "Annapurna Base Camp",
    region: "Annapurna",
    days: 9,
    maxAltitudeM: 4130,
    difficulty: "moderate",
    departsOn: "2026-11-02",
    returnsOn: "2026-11-10",
    seatsTotal: 10,
    seatsBooked: 10,
    minimumToRun: 4,
    guaranteedAt: "2026-05-19",
    decisionDate: "2026-10-02",
    guideRatio: "1:4",
    priceUSD: 1240,
    singleSupplementUSD: 0,
    priceIncludes: [
      "All permits and TIMS card",
      "Pokhara transfers",
      "Guide and porter wages, insurance and equipment",
      "Teahouse accommodation",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Meals in Pokhara",
      "Tips",
    ],
    costSheetHref: "/pricing/abc-2026-11-02",
    groupSoFar: [
      { country: "United Kingdom", count: 3 },
      { country: "Netherlands", count: 2 },
      { country: "Japan", count: 2 },
      { country: "Brazil", count: 2 },
    ],
    image: {
      src: unsplash("photo-1531719555052-632b0348c404"),
      alt: "The Annapurna sanctuary rim at first light.",
    },
  },
  {
    id: "acircuit-2027-03-08",
    trekId: "annapurna-circuit",
    trekName: "Annapurna Circuit",
    region: "Annapurna",
    days: 14,
    maxAltitudeM: 5416,
    difficulty: "strenuous",
    departsOn: "2027-03-08",
    returnsOn: "2027-03-21",
    seatsTotal: 12,
    seatsBooked: 2,
    minimumToRun: 4,
    decisionDate: "2027-02-06",
    guideRatio: "1:4",
    assistantGuideAbove: 4500,
    priceUSD: 1675,
    singleSupplementUSD: 0,
    priceIncludes: [
      "All permits and TIMS card",
      "Kathmandu and Pokhara transfers",
      "Guide and porter wages, insurance and equipment",
      "Teahouse accommodation",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Jeep transfer if Thorong La is closed",
      "Tips",
    ],
    costSheetHref: "/pricing/acircuit-2027-03-08",
    groupSoFar: [
      { country: "France", count: 1 },
      { country: "United States", count: 1 },
    ],
    image: {
      src: unsplash("photo-1538279288577-f2551fb138ba"),
      alt: "The high crossing on the Annapurna Circuit under clear sky.",
    },
  },
  {
    id: "langtang-2026-11-21",
    trekId: "langtang-valley",
    trekName: "Langtang Valley",
    region: "Langtang",
    days: 7,
    maxAltitudeM: 4984,
    difficulty: "moderate",
    departsOn: "2026-11-21",
    returnsOn: "2026-11-27",
    seatsTotal: 10,
    seatsBooked: 3,
    minimumToRun: 4,
    decisionDate: "2026-10-21",
    guideRatio: "1:4",
    priceUSD: 980,
    singleSupplementUSD: 0,
    priceIncludes: [
      "All permits and TIMS card",
      "Kathmandu–Syabrubesi transfers",
      "Guide and porter wages, insurance and equipment",
      "Teahouse accommodation",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Meals in Kathmandu",
      "Tips",
    ],
    costSheetHref: "/pricing/langtang-2026-11-21",
    groupSoFar: [
      { country: "Italy", count: 2 },
      { country: "South Korea", count: 1 },
    ],
    image: {
      src: unsplash("photo-1741755072624-7dffb6bed861"),
      alt: "Trekkers on the valley floor beneath the Langtang range.",
    },
  },
  {
    id: "mustang-2027-04-12",
    trekId: "upper-mustang",
    trekName: "Upper Mustang",
    region: "Mustang",
    days: 13,
    maxAltitudeM: 3840,
    difficulty: "moderate",
    departsOn: "2027-04-12",
    returnsOn: "2027-04-24",
    seatsTotal: 8,
    seatsBooked: 6,
    minimumToRun: 4,
    guaranteedAt: "2026-08-01",
    decisionDate: "2027-03-12",
    guideRatio: "1:4",
    priceUSD: 2450,
    singleSupplementUSD: 320,
    priceIncludes: [
      "Restricted-area permit, itemised in full",
      "ACAP permit and TIMS card",
      "Guide and porter wages, insurance and equipment",
      "Lodge accommodation",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Pokhara–Jomsom flight if roads are closed",
      "Tips",
    ],
    costSheetHref: "/pricing/mustang-2027-04-12",
    groupSoFar: [
      { country: "Australia", count: 2 },
      { country: "Germany", count: 1 },
      { country: "Spain", count: 1 },
    ],
    image: {
      src: unsplash("photo-1758701320941-89f86492c1ef"),
      alt: "A walled village and terraced fields on the Upper Mustang valley floor.",
    },
  },
  {
    id: "chitwan-2027-02-15",
    trekId: "chitwan-safari",
    trekName: "Chitwan River & Jungle",
    region: "Terai",
    days: 5,
    maxAltitudeM: 415,
    difficulty: "moderate",
    departsOn: "2027-02-15",
    returnsOn: "2027-02-19",
    seatsTotal: 10,
    seatsBooked: 5,
    minimumToRun: 4,
    guaranteedAt: "2026-09-30",
    decisionDate: "2027-01-15",
    guideRatio: "1:6",
    priceUSD: 720,
    singleSupplementUSD: 145,
    priceIncludes: [
      "National park permits and guide fees",
      "Kathmandu–Chitwan transfers",
      "Naturalist guide wages and insurance",
      "Lodge accommodation and all meals in park",
    ],
    priceExcludes: [
      "International flights",
      "Travel and evacuation insurance",
      "Meals outside the park",
      "Tips",
    ],
    costSheetHref: "/pricing/chitwan-2027-02-15",
    groupSoFar: [
      { country: "United Kingdom", count: 2 },
      { country: "Denmark", count: 2 },
      { country: "India", count: 1 },
    ],
    image: {
      src: unsplash("photo-1700366776973-20bda63d5b1a"),
      alt: "A slow river running through sal forest in the Terai lowlands.",
    },
  },
];

/* ---------------------------------------------------------------- derived */

export const seatsRemaining = (d: Departure) => d.seatsTotal - d.seatsBooked;

/** How many more bookings are needed before the departure is guaranteed. */
export const seatsToGuarantee = (d: Departure) =>
  Math.max(0, d.minimumToRun - d.seatsBooked);

/**
 * Status is always computed from the numbers, never stored, so it cannot drift
 * out of step with them. `pnpm check:departures` re-derives it independently.
 */
export function departureStatus(
  d: Departure,
  now: Date = new Date(),
): DepartureStatus {
  if (seatsRemaining(d) <= 0) return "full";
  if (new Date(d.decisionDate) < now && d.seatsBooked < d.minimumToRun) {
    return "closed";
  }
  if (d.seatsBooked >= d.minimumToRun) {
    return seatsRemaining(d) <= 3 ? "filling" : "guaranteed";
  }
  return "needs-n";
}

/** "14 Oct — 25 Oct 2026". Never numeric-only: 04/05 is ambiguous worldwide. */
export function formatDateRange(departsOn: string, returnsOn: string): string {
  const from = new Date(departsOn);
  const to = new Date(returnsOn);
  const day = (d: Date) =>
    `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}`;
  return `${day(from)} — ${day(to)} ${to.getUTCFullYear()}`;
}

/** "14 Sept 2026" for the decision deadline. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
}

/**
 * The line under the seat meter.
 *
 * Once a departure is guaranteed, "decided by <date>" is dead weight — the
 * decision has been made. What matters then is that further bookings cannot
 * change it. The decision date only earns its line in the `needs-n` state,
 * where it is the whole point.
 *
 * A pure function so `pnpm check:departures` can assert the rule rather than
 * trusting the component.
 */
export function guaranteeMeta(d: Departure, now: Date = new Date()): string {
  const status = departureStatus(d, now);
  if (status === "needs-n") {
    return `${d.seatsBooked} booked · guaranteed at ${d.minimumToRun} · decided by ${formatDate(d.decisionDate)}`;
  }
  if (status === "full") {
    return `${d.seatsTotal} of ${d.seatsTotal} booked · this departure is closed to new bookings`;
  }
  if (status === "closed") {
    return `Did not reach ${d.minimumToRun} bookings · everyone booked was refunded in full`;
  }
  return `${d.seatsBooked} booked · guaranteed — runs regardless of further bookings`;
}

/** "2 Germany · 1 Australia" — country and count, nothing else. */
export function formatGroup(groupSoFar: Departure["groupSoFar"]): string {
  return groupSoFar.map((g) => `${g.count} ${g.country}`).join(" · ");
}
