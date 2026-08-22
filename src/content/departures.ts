import {
  buildCostSheet,
  type Contingency,
  type CostLine,
  type CostSheet,
} from "./cost-sheets.ts";
import { TREKS, type ItineraryDay, type PhysicalDemand } from "./treks.ts";
import type { Focal } from "../lib/image-slots.ts";
import {
  GALLERIES,
  PRACTICALITIES,
  altitudeAwarePracticalities,
  buildFaqs,
  isTeahouseTrek,
  roomSharingLine,
  type Faq,
  type GalleryImage,
  type Practicalities,
} from "./trek-detail.ts";

export type { Contingency, CostLine, CostSheet };
export type { Faq, GalleryImage, Practicalities };
export {
  GRID_CATEGORIES,
  HEADER_CATEGORIES,
  gridImages,
  headerImages,
} from "./trek-detail.ts";
export { PLACES, type LatLon } from "./places.ts";
export {
  RETURN_POINTS,
  TREKS,
  type ItineraryDay,
  type PhysicalDemand,
} from "./treks.ts";

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
 *   3. `priceExcludes` must be non-empty. Every trip excludes something.
 *   4. `minimumToRun` and `decisionDate` are always public. This is the entire
 *      point of the section — the threshold is the promise.
 *   5. `groupSoFar` is country and count only. Never names, never ages.
 *   6. Status is DERIVED, never stored. See `departureStatus`.
 *
 * WHAT A SEED CARRIES, AND WHY THAT IS ALL.
 *
 * Everything about the route — itinerary, altitudes, physical demand, group
 * cap — lives on the TREK, in treks.ts. A seed carries only what genuinely
 * differs between two dates on the same route: when it goes, who has booked,
 * what it costs, and the photograph. Anything derivable is derived here rather
 * than typed twice: `days` comes from the itinerary length, `returnsOn` from
 * the departure date and that length, `decisionDate` from the lead time,
 * `acclimatisationDays` from the days marked as such, and `slug` and
 * `costSheetHref` from the trek and the month. None of those can drift out of
 * step with each other, because there is only one of each.
 *
 * Full guidance in departures.README.md.
 */

export type DepartureStatus =
  "guaranteed" | "needs-n" | "filling" | "full" | "closed";

export type Departure = {
  id: string;
  /** URL segment. Unique across all departures; the guard enforces it. */
  slug: string;
  trekId: string;
  trekName: string;
  region: string;
  days: number;
  /** The highest point reached on a walking day. Travel days do not count. */
  maxAltitudeM: number;
  difficulty: "moderate" | "challenging" | "strenuous";
  /** Two sentences. Factual — the banned adjective list applies here too. */
  summary: string;
  itinerary: ItineraryDay[];
  physicalDemand: PhysicalDemand;
  groupSizeMax: number;
  /** Day numbers that are rest or acclimatisation. Derived from the itinerary. */
  acclimatisationDays: number[];
  /** ISO date. */
  departsOn: string;
  returnsOn: string;
  seatsTotal: number;
  seatsBooked: number;
  /** The published threshold at which the departure is guaranteed to run. */
  minimumToRun: number;
  /** ISO date the guarantee was reached, when it has been. */
  guaranteedAt?: string;
  /** ISO date by which run / no-run is decided, always before departsOn. */
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
  /** The same figures as a one-page PDF, prerendered at build time. */
  costSheetPdfHref: string;
  /** The itemised ledger. Its included lines sum to `priceUSD` exactly. */
  costSheet: CostSheet;
  /** At least one `accommodation` and one `food` image. Guarded. */
  gallery: GalleryImage[];
  /** What it is actually like. Unglamorous by design. */
  practicalities: Practicalities;
  /** Departure-specific. Quotes this date's own numbers. */
  faqs: Faq[];
  /** Anonymised. Country and count only. */
  groupSoFar: { country: string; count: number }[];
  /**
   * The card photograph. `focal` is optional and only needed when the subject
   * sits at an edge — see docs/IMAGE-SPEC.md.
   */
  image: { src: string; alt: string; focal?: Focal };
};

/* -------------------------------------------------------- price line items */

const PERMITS_HIGH = [
  "All national park and conservation area permits",
  "TIMS card",
];

const CORE_INCLUDES = [
  "Guide and porter wages, insurance and equipment",
  "Airport transfers on arrival and departure",
];

const CORE_EXCLUDES = [
  "International flights",
  "Travel and evacuation insurance",
  "Tips (our policy is published, not expected)",
];

/* ---------------------------------------------------------------- the seeds */

type Seed = {
  id: string;
  trekId: string;
  departsOn: string;
  seatsTotal: number;
  seatsBooked: number;
  minimumToRun: number;
  guaranteedAt?: string;
  priceUSD: number;
  singleSupplementUSD: number;
  priceIncludes: string[];
  priceExcludes: string[];
  groupSoFar: { country: string; count: number }[];
  image: { src: string; alt: string; focal?: Focal };
};

/** Swap to "/departures/<id>.jpg" when real photography lands. */
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&h=1200&q=75`;

const PHOTO = {
  khumbu: {
    src: unsplash("photo-1693717671076-374d59bc2ff2"),
    alt: "The trail into Everest Base Camp below the Khumbu icefall.",
  },
  sanctuary: {
    src: unsplash("photo-1531719555052-632b0348c404"),
    alt: "The Annapurna sanctuary rim at first light.",
  },
  circuit: {
    src: unsplash("photo-1538279288577-f2551fb138ba"),
    alt: "The high crossing on the Annapurna Circuit under clear sky.",
  },
  langtang: {
    src: unsplash("photo-1741755072624-7dffb6bed861"),
    alt: "Trekkers on the valley floor beneath the Langtang range.",
  },
  mustang: {
    src: unsplash("photo-1758701320941-89f86492c1ef"),
    alt: "A walled village and terraced fields on the Upper Mustang valley floor.",
  },
  terai: {
    src: unsplash("photo-1700366776973-20bda63d5b1a"),
    alt: "A slow river running through sal forest in the Terai lowlands.",
  },
} as const;

/** Days between the decision date and departure. Published, never moved. */
const DECISION_LEAD_DAYS = 30;

const SEEDS: Seed[] = [
  {
    id: "ktm-rim-2026-09-07",
    trekId: "kathmandu-valley-rim",
    departsOn: "2026-09-07",
    seatsTotal: 14,
    seatsBooked: 9,
    minimumToRun: 5,
    guaranteedAt: "2026-07-14",
    priceUSD: 540,
    singleSupplementUSD: 90,
    priceIncludes: [
      "Shivapuri National Park entry and valley permits",
      ...CORE_INCLUDES,
      "Lodge and hotel accommodation, twin or single",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Lunches and dinners in Kathmandu"],
    groupSoFar: [
      { country: "United Kingdom", count: 3 },
      { country: "Australia", count: 2 },
      { country: "Germany", count: 2 },
      { country: "Japan", count: 2 },
    ],
    image: PHOTO.langtang,
  },
  {
    id: "poonhill-2026-09-21",
    trekId: "poon-hill",
    departsOn: "2026-09-21",
    seatsTotal: 12,
    seatsBooked: 3,
    minimumToRun: 5,
    priceUSD: 690,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      ...CORE_INCLUDES,
      "Pokhara transfers and teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [
      { country: "Netherlands", count: 2 },
      { country: "Canada", count: 1 },
    ],
    image: PHOTO.sanctuary,
  },
  {
    id: "mardi-2026-10-03",
    trekId: "mardi-himal",
    departsOn: "2026-10-03",
    seatsTotal: 10,
    seatsBooked: 8,
    minimumToRun: 4,
    guaranteedAt: "2026-06-20",
    priceUSD: 860,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      ...CORE_INCLUDES,
      "Pokhara transfers and teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [
      { country: "France", count: 2 },
      { country: "United States", count: 2 },
      { country: "Singapore", count: 2 },
      { country: "Ireland", count: 2 },
    ],
    image: PHOTO.sanctuary,
  },
  {
    id: "ebc-2026-10-14",
    trekId: "everest-base-camp",
    departsOn: "2026-10-14",
    seatsTotal: 12,
    seatsBooked: 7,
    minimumToRun: 4,
    guaranteedAt: "2026-06-02",
    priceUSD: 1890,
    singleSupplementUSD: 0,
    priceIncludes: [
      ...PERMITS_HIGH,
      "Kathmandu–Lukla flights",
      ...CORE_INCLUDES,
      "Teahouse accommodation, twin or single at no extra cost",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Lunches and dinners in Kathmandu"],
    groupSoFar: [
      { country: "Germany", count: 2 },
      { country: "Australia", count: 2 },
      { country: "Canada", count: 1 },
      { country: "Singapore", count: 2 },
    ],
    image: PHOTO.khumbu,
  },
  {
    id: "bardia-2026-10-26",
    trekId: "bardia-wildlife",
    departsOn: "2026-10-26",
    seatsTotal: 8,
    seatsBooked: 4,
    minimumToRun: 4,
    guaranteedAt: "2026-08-01",
    priceUSD: 1320,
    singleSupplementUSD: 210,
    priceIncludes: [
      "Bardia National Park permits and ranger fees",
      "Kathmandu–Nepalgunj flights",
      ...CORE_INCLUDES,
      "Lodge accommodation and all meals in the park",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals outside the park"],
    groupSoFar: [
      { country: "Denmark", count: 2 },
      { country: "United Kingdom", count: 2 },
    ],
    image: PHOTO.terai,
  },
  {
    id: "abc-2026-11-02",
    trekId: "annapurna-base-camp",
    departsOn: "2026-11-02",
    seatsTotal: 10,
    seatsBooked: 10,
    minimumToRun: 4,
    guaranteedAt: "2026-05-19",
    priceUSD: 1240,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      "Pokhara transfers",
      ...CORE_INCLUDES,
      "Teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [
      { country: "United Kingdom", count: 3 },
      { country: "Netherlands", count: 2 },
      { country: "Japan", count: 2 },
      { country: "Brazil", count: 2 },
    ],
    image: PHOTO.sanctuary,
  },
  {
    id: "bardia-2026-11-16",
    trekId: "bardia-wildlife",
    departsOn: "2026-11-16",
    seatsTotal: 8,
    seatsBooked: 2,
    minimumToRun: 4,
    priceUSD: 1320,
    singleSupplementUSD: 210,
    priceIncludes: [
      "Bardia National Park permits and ranger fees",
      "Kathmandu–Nepalgunj flights",
      ...CORE_INCLUDES,
      "Lodge accommodation and all meals in the park",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals outside the park"],
    groupSoFar: [{ country: "Switzerland", count: 2 }],
    image: PHOTO.terai,
  },
  {
    id: "langtang-2026-11-21",
    trekId: "langtang-valley",
    departsOn: "2026-11-21",
    seatsTotal: 10,
    seatsBooked: 3,
    minimumToRun: 4,
    priceUSD: 980,
    singleSupplementUSD: 0,
    priceIncludes: [
      "Langtang National Park permit and TIMS card",
      "Kathmandu–Syabrubesi transfers",
      ...CORE_INCLUDES,
      "Teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Kathmandu"],
    groupSoFar: [
      { country: "Italy", count: 2 },
      { country: "South Korea", count: 1 },
    ],
    image: PHOTO.langtang,
  },
  {
    id: "poonhill-2026-12-05",
    trekId: "poon-hill",
    departsOn: "2026-12-05",
    seatsTotal: 12,
    seatsBooked: 6,
    minimumToRun: 5,
    guaranteedAt: "2026-08-10",
    priceUSD: 690,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      ...CORE_INCLUDES,
      "Pokhara transfers and teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [
      { country: "Spain", count: 2 },
      { country: "Poland", count: 2 },
      { country: "New Zealand", count: 2 },
    ],
    image: PHOTO.sanctuary,
  },
  {
    id: "ktm-rim-2026-12-18",
    trekId: "kathmandu-valley-rim",
    departsOn: "2026-12-18",
    seatsTotal: 14,
    seatsBooked: 12,
    minimumToRun: 5,
    guaranteedAt: "2026-07-30",
    priceUSD: 540,
    singleSupplementUSD: 90,
    priceIncludes: [
      "Shivapuri National Park entry and valley permits",
      ...CORE_INCLUDES,
      "Lodge and hotel accommodation, twin or single",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Lunches and dinners in Kathmandu"],
    groupSoFar: [
      { country: "United States", count: 4 },
      { country: "Germany", count: 3 },
      { country: "Belgium", count: 2 },
      { country: "Sweden", count: 3 },
    ],
    image: PHOTO.langtang,
  },
  {
    id: "chitwan-2027-01-11",
    trekId: "chitwan-safari",
    departsOn: "2027-01-11",
    seatsTotal: 10,
    seatsBooked: 7,
    minimumToRun: 4,
    guaranteedAt: "2026-08-12",
    priceUSD: 830,
    singleSupplementUSD: 145,
    priceIncludes: [
      "National park permits and naturalist guide fees",
      "Kathmandu–Chitwan transfers",
      ...CORE_INCLUDES,
      "Lodge accommodation and all meals in the park",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals outside the park"],
    groupSoFar: [
      { country: "India", count: 2 },
      { country: "United Kingdom", count: 3 },
      { country: "Norway", count: 2 },
    ],
    image: PHOTO.terai,
  },
  {
    id: "bardia-2027-02-01",
    trekId: "bardia-wildlife",
    departsOn: "2027-02-01",
    seatsTotal: 8,
    seatsBooked: 6,
    minimumToRun: 4,
    guaranteedAt: "2026-08-05",
    priceUSD: 1320,
    singleSupplementUSD: 210,
    priceIncludes: [
      "Bardia National Park permits and ranger fees",
      "Kathmandu–Nepalgunj flights",
      ...CORE_INCLUDES,
      "Lodge accommodation and all meals in the park",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals outside the park"],
    groupSoFar: [
      { country: "Netherlands", count: 2 },
      { country: "Austria", count: 2 },
      { country: "Canada", count: 2 },
    ],
    image: PHOTO.terai,
  },
  {
    id: "chitwan-2027-02-15",
    trekId: "chitwan-safari",
    departsOn: "2027-02-15",
    seatsTotal: 10,
    seatsBooked: 5,
    minimumToRun: 4,
    guaranteedAt: "2026-09-30",
    priceUSD: 830,
    singleSupplementUSD: 145,
    priceIncludes: [
      "National park permits and naturalist guide fees",
      "Kathmandu–Chitwan transfers",
      ...CORE_INCLUDES,
      "Lodge accommodation and all meals in the park",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals outside the park"],
    groupSoFar: [
      { country: "United Kingdom", count: 2 },
      { country: "Denmark", count: 2 },
      { country: "India", count: 1 },
    ],
    image: PHOTO.terai,
  },
  {
    id: "ktm-rim-2027-02-26",
    trekId: "kathmandu-valley-rim",
    departsOn: "2027-02-26",
    seatsTotal: 14,
    seatsBooked: 3,
    minimumToRun: 5,
    priceUSD: 560,
    singleSupplementUSD: 90,
    priceIncludes: [
      "Shivapuri National Park entry and valley permits",
      ...CORE_INCLUDES,
      "Lodge and hotel accommodation, twin or single",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Lunches and dinners in Kathmandu"],
    groupSoFar: [
      { country: "Portugal", count: 2 },
      { country: "Finland", count: 1 },
    ],
    image: PHOTO.langtang,
  },
  {
    id: "acircuit-2027-03-08",
    trekId: "annapurna-circuit",
    departsOn: "2027-03-08",
    seatsTotal: 12,
    seatsBooked: 2,
    minimumToRun: 4,
    priceUSD: 1675,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      "Kathmandu and Pokhara transfers",
      ...CORE_INCLUDES,
      "Teahouse accommodation",
    ],
    priceExcludes: [
      ...CORE_EXCLUDES,
      "Jeep transfer if Thorong La is closed",
      "Meals in Pokhara and Kathmandu",
    ],
    groupSoFar: [
      { country: "France", count: 1 },
      { country: "United States", count: 1 },
    ],
    image: PHOTO.circuit,
  },
  {
    id: "ebc-2027-03-22",
    trekId: "everest-base-camp",
    departsOn: "2027-03-22",
    seatsTotal: 12,
    seatsBooked: 5,
    minimumToRun: 4,
    guaranteedAt: "2026-08-15",
    priceUSD: 1890,
    singleSupplementUSD: 0,
    priceIncludes: [
      ...PERMITS_HIGH,
      "Kathmandu–Lukla flights",
      ...CORE_INCLUDES,
      "Teahouse accommodation, twin or single at no extra cost",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Lunches and dinners in Kathmandu"],
    groupSoFar: [
      { country: "Australia", count: 2 },
      { country: "Ireland", count: 2 },
      { country: "Mexico", count: 1 },
    ],
    image: PHOTO.khumbu,
  },
  {
    id: "mardi-2027-04-05",
    trekId: "mardi-himal",
    departsOn: "2027-04-05",
    seatsTotal: 10,
    seatsBooked: 1,
    minimumToRun: 4,
    priceUSD: 860,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      ...CORE_INCLUDES,
      "Pokhara transfers and teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [{ country: "Germany", count: 1 }],
    image: PHOTO.sanctuary,
  },
  {
    id: "mustang-2027-04-12",
    trekId: "upper-mustang",
    departsOn: "2027-04-12",
    seatsTotal: 8,
    seatsBooked: 6,
    minimumToRun: 4,
    guaranteedAt: "2026-08-01",
    priceUSD: 2750,
    singleSupplementUSD: 320,
    priceIncludes: [
      "Restricted-area permit, itemised in full",
      "ACAP permit and TIMS card",
      ...CORE_INCLUDES,
      "Lodge accommodation",
    ],
    priceExcludes: [
      ...CORE_EXCLUDES,
      "Pokhara–Jomsom flight if roads are closed",
    ],
    groupSoFar: [
      { country: "Australia", count: 2 },
      { country: "Germany", count: 1 },
      { country: "Spain", count: 1 },
    ],
    image: PHOTO.mustang,
  },
  {
    id: "abc-2027-05-10",
    trekId: "annapurna-base-camp",
    departsOn: "2027-05-10",
    seatsTotal: 10,
    seatsBooked: 4,
    minimumToRun: 4,
    guaranteedAt: "2026-08-18",
    priceUSD: 1290,
    singleSupplementUSD: 0,
    priceIncludes: [
      "ACAP permit and TIMS card",
      "Pokhara transfers",
      ...CORE_INCLUDES,
      "Teahouse accommodation",
    ],
    priceExcludes: [...CORE_EXCLUDES, "Meals in Pokhara"],
    groupSoFar: [
      { country: "Czechia", count: 2 },
      { country: "United States", count: 2 },
    ],
    image: PHOTO.sanctuary,
  },
];

/* ------------------------------------------------------------- composition */

const MONTH_SLUG = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function compose(seed: Seed): Departure {
  const trek = TREKS[seed.trekId];
  if (!trek) throw new Error(`no trek profile for "${seed.trekId}"`);

  const days = trek.itinerary.length;
  const departs = new Date(`${seed.departsOn}T00:00:00Z`);
  const slug = `${seed.trekId}-${MONTH_SLUG[departs.getUTCMonth()]}-${departs.getUTCFullYear()}`;

  const composed: Departure = {
    ...seed,
    slug,
    trekName: trek.trekName,
    region: trek.region,
    days,
    maxAltitudeM: trek.maxAltitudeM,
    difficulty: trek.difficulty,
    summary: trek.summary,
    itinerary: trek.itinerary,
    physicalDemand: trek.physicalDemand,
    groupSizeMax: trek.groupSizeMax,
    acclimatisationDays: trek.itinerary
      .filter((d) => d.isAcclimatisation)
      .map((d) => d.day),
    guideRatio: trek.guideRatio,
    assistantGuideAbove: trek.assistantGuideAbove,
    // The last night is the night before the last day, so a 12-day trip that
    // leaves on the 14th comes back on the 25th.
    returnsOn: addDays(seed.departsOn, days - 1),
    decisionDate: addDays(seed.departsOn, -DECISION_LEAD_DAYS),
    costSheetHref: `/departures/${slug}#cost-sheet`,
    costSheetPdfHref: `/departures/${slug}/cost-sheet.pdf`,
    // Built from the trek's cost components and this date's price, so the
    // ledger cannot disagree with the headline number — the margin line is
    // whatever is left, which makes the total exact by construction.
    costSheet: buildCostSheet(seed.trekId, trek, {
      priceUSD: seed.priceUSD,
      days,
      groupSizeMax: trek.groupSizeMax,
      singleSupplementUSD: seed.singleSupplementUSD,
    }),
    gallery: GALLERIES[seed.trekId] ?? [],
    practicalities: PRACTICALITIES[seed.trekId],
    // Filled in below: the answers quote the cost sheet and the physical
    // demand, so they cannot be built until the rest of the departure exists.
    faqs: [],
  };

  /*
   * The FAQ reads the finished departure.
   *
   * Answers quote this date's price, supplement, minimum and decision date, so
   * an FAQ cannot drift out of step with the cost sheet on the same page. That
   * is only possible if the departure is complete before the answers are
   * written, hence the second pass rather than a single object literal.
   */
  /*
   * The room-sharing line is derived, not stored.
   *
   * It has to agree with `singleSupplementUSD`, and stored prose did not: three
   * sections of one page disagreed about whether a single room was an option,
   * an extra, or included. One fact, three sentences derived from it.
   */
  const teahouse = isTeahouseTrek(seed.trekId);
  composed.practicalities = altitudeAwarePracticalities(
    {
      ...composed.practicalities,
      roomSharing: roomSharingLine(composed, teahouse),
    },
    {
      highestSleepM: Math.max(
        ...trek.itinerary.map((day) => day.sleepAltitudeM),
      ),
      maxAltitudeM: trek.maxAltitudeM,
      teahouse,
    },
  );

  composed.faqs = buildFaqs(composed);
  return composed;
}

export const departures: Departure[] = SEEDS.map(compose);

/* -------------------------------------------------------------- lifecycle */

/**
 * Where a departure is in its life, as against how full it is.
 *
 * `departureStatus` answers "how is it selling"; this answers "does it still
 * exist as a thing you can buy". They were the same question for as long as
 * every date was in the future, and then the first one passed its decision date
 * without filling — and the page went on being indexed as a purchasable product,
 * with a full cost sheet and an in-stock offer, for a trip that had been
 * cancelled and refunded.
 *
 * That is worse than an ordinary stale page. This site's entire argument is
 * that a published minimum is a real threshold; leaving a cancelled date
 * looking bookable makes the threshold look decorative.
 *
 * Always derived, never stored. A stored lifecycle is a lifecycle somebody has
 * to remember to update, on exactly the day nobody is thinking about it.
 */
export type Lifecycle =
  "open" | "closed" | "cancelled" | "departed" | "completed";

export function lifecycle(d: Departure, now: Date = new Date()): Lifecycle {
  const departs = new Date(`${d.departsOn}T00:00:00Z`).getTime();
  const returns = new Date(`${d.returnsOn}T23:59:59Z`).getTime();
  const decided = new Date(`${d.decisionDate}T00:00:00Z`).getTime();
  const t = now.getTime();

  // Order matters: a trip that ran and came back is completed whatever else
  // was true of it along the way.
  if (t > returns) return "completed";
  if (t >= departs) return "departed";
  if (t >= decided && d.seatsBooked < d.minimumToRun) return "cancelled";
  if (d.seatsBooked >= d.seatsTotal) return "closed";
  return "open";
}

/** Can somebody still join this date? The only test any listing should use. */
export const isBookable = (d: Departure, now: Date = new Date()) =>
  lifecycle(d, now) === "open";

/**
 * Should a search engine index this page?
 *
 * A cancelled, departed or completed date is not a product. It stays reachable
 * — deleting it would be the dishonest choice, and the cancelled ones are the
 * best evidence the guarantee is real — but it is not offered up as something
 * to buy.
 */
export const isIndexable = (d: Departure, now: Date = new Date()) =>
  ["open", "closed"].includes(lifecycle(d, now));

/** Departures a visitor can actually book, for every grid and list. */
export const bookableDepartures = (now: Date = new Date()) =>
  departures.filter((d) => isBookable(d, now));

/* ---------------------------------------------------------------- derived */

/**
 * The dates on a trek that did not reach their minimum.
 *
 * Lives here rather than in the page's own helpers so the guard can import the
 * exact function the trek page renders. Deleting a cancelled departure is the
 * easiest thing in the world to do quietly, and a published minimum is worth
 * nothing if the times it was not met can disappear — so the archive is
 * derived from `lifecycle`, the same function the departure pages use, and the
 * guard asserts over this and not over a second copy of the rule.
 */
export type CancelledDate = {
  departure: Departure;
  booked: number;
  minimum: number;
  decidedOn: string;
};

export const cancelledFor = (
  trekId: string,
  now: Date = new Date(),
): CancelledDate[] =>
  departures
    .filter((d) => d.trekId === trekId && lifecycle(d, now) === "cancelled")
    .sort((a, b) => a.departsOn.localeCompare(b.departsOn))
    .map((d) => ({
      departure: d,
      booked: d.seatsBooked,
      minimum: d.minimumToRun,
      decidedOn: formatDate(d.decisionDate),
    }));

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

/** The highest point reached on a day that is not a travel day. */
export function itineraryHighPoint(d: Departure): number {
  return d.itinerary
    .filter((day) => !day.isTravelDay)
    .reduce(
      (high, day) => Math.max(high, day.maxAltitudeM ?? day.sleepAltitudeM),
      0,
    );
}

/** The highest night. The number that governs how someone actually feels. */
export function highestSleep(d: Departure): ItineraryDay {
  return d.itinerary.reduce((high, day) =>
    day.sleepAltitudeM > high.sleepAltitudeM ? day : high,
  );
}

export const byId = (id: string) => departures.find((d) => d.id === id);
export const bySlug = (slug: string) => departures.find((d) => d.slug === slug);

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
 * decision has been made. The decision date only earns its line in the
 * `needs-n` state, where it is the whole point.
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
