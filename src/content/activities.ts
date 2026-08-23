/*
 * ============================================================================
 * PLACEHOLDER DATA. EVERY PRICE, DURATION AND LIMIT BELOW IS INVENTED.
 * ============================================================================
 */

import {
  type Contingency,
  type CostLine,
  type CostSheet,
  sheetPrice,
} from "./cost-sheets.ts";
import type { Faq, GalleryImage, Practicalities } from "./trek-detail.ts";
import type { PhysicalDemand } from "./treks.ts";
import { permitsFor } from "./permits.ts";

/**
 * An activity is not a departure, and forcing it into that model would lie.
 *
 * A departure is one dated group trip with a published minimum, a decision
 * date and a guarantee. Nearly every activity we run is the opposite: it goes
 * on demand, for one or two people, most days in season, with no threshold to
 * reach and therefore no guarantee to make. Rendering "4 more bookings needed
 * to guarantee this departure" on a two-hour paraglide would be inventing a
 * mechanism that does not exist.
 *
 * WHAT IS REUSED, WHOLESALE, and deliberately not re-modelled:
 *
 *   `CostSheet`, `CostLine` and the four dispositions — an activity's money is
 *   the same shape as a trek's. The same selectors compute its price, its
 *   not-included estimates and its on-arrival claim, and the same guards check
 *   that a provided line has a payee and that the lines sum to the price.
 *
 *   The permit composition. An activity resolves permit types against the same
 *   dated records, so discontinuing a permit drops it from a rafting trip and
 *   an Everest departure in the same edit.
 *
 *   `PhysicalDemand`, `Practicalities`, `Faq`, `GalleryImage` and the
 *   contingency model, unchanged.
 *
 * WHAT DOES NOT FIT, and why it is new rather than borrowed:
 *
 *   `availability` replaces `departsOn`/`minimumToRun`/`decisionDate`. Those
 *   three fields only mean something for a dated group trip. An on-demand
 *   activity has a lead time and a season; a seasonal-window one has windows.
 *   Modelling those as a departure with `minimumToRun: 1` would technically
 *   work and would then render guarantee language about a threshold that is
 *   not a threshold.
 *
 *   `priceScaling`, because an activity's per-person price genuinely moves
 *   with group size — a raft costs what it costs whether two people or six are
 *   in it. A trek's does not, because the group cap is what it is costed at.
 */

export type ActivityCategory =
  | "water"
  | "wildlife"
  | "aerial"
  | "cultural"
  | "cycling"
  | "climbing"
  | "day-hike";

export type ActivityAvailability =
  | {
      mode: "on-demand";
      /** How much notice we need. The honest answer to "can I go tomorrow?" */
      leadTimeDays: number;
      /** 1–12. Months we run it at all. */
      operatingMonths: number[];
    }
  | {
      /** Runs as fixed dated group trips. Departure ids, reusing that model. */
      mode: "scheduled";
      departures: string[];
    }
  | {
      mode: "seasonal-window";
      windows: { from: string; to: string; note: string }[];
    };

export type Activity = {
  id: string;
  slug: string;
  name: string;
  category: ActivityCategory;
  region: string;
  summary: string;
  durationHours?: number;
  durationDays?: number;
  availability: ActivityAvailability;
  minParticipants: number;
  maxParticipants: number;
  /** Per person AT `minParticipants`. The worst case, not the best. */
  priceUSD: number;
  /**
   * Explicit, or absent.
   *
   * A "from $60 per person" that only applies at four people is the precise
   * hidden-cost pattern this site exists to argue against. If the per-person
   * price moves with group size the whole table is published, and the headline
   * figure is the one a solo traveller actually pays.
   */
  priceScaling?: { participants: number; priceUSD: number }[];
  costSheet: CostSheet;
  physicalDemand: PhysicalDemand;
  practicalities: Practicalities;
  faqs: Faq[];
  gallery: GalleryImage[];
  safetyNotes: string[];
  ageLimits?: { min?: number; max?: number; note?: string };
  weatherDependency: "none" | "moderate" | "high";
  /** Trek ids this pairs with. Guarded for existence and reciprocity. */
  combinesWith: string[];
  requiredPermitTypes: string[];
  heroImage?: { src?: string; alt: string };
};

/* --------------------------------------------------------------- helpers */

export const isOnDemand = (a: Activity) => a.availability.mode === "on-demand";
export const isScheduled = (a: Activity) => a.availability.mode === "scheduled";

/**
 * Whether this activity has a threshold to reach at all.
 *
 * The single most important derivation in this file. Every sentence about
 * running or not running is composed from it, so guarantee language cannot
 * reach a product that has no guarantee to give.
 */
export const hasGuarantee = (a: Activity) =>
  a.availability.mode === "scheduled";

const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * A trekking season crosses New Year, and a sorted list does not know that.
 *
 * Rafting runs September to May, which is `[9,10,11,12,1,2,3,4,5]`. Sorting
 * that numerically and taking the ends produced "between January and
 * December" — a sentence that says the opposite of the truth, on the field
 * that decides whether somebody can go at all. So the run is walked from its
 * start rather than sorted, and if it is not one unbroken run the months are
 * listed instead of being summarised into a range that would be wrong.
 */
function seasonPhrase(months: number[]): string {
  if (months.length >= 12) return "all year";
  const set = new Set(months);
  /* The start of the run is the month whose predecessor is absent. */
  const start = months.find((m) => !set.has(m === 1 ? 12 : m - 1));
  if (start === undefined) return "all year";

  const walk: number[] = [];
  for (let m = start, i = 0; i < months.length; i += 1) {
    if (!set.has(m)) break;
    walk.push(m);
    m = m === 12 ? 1 : m + 1;
  }

  if (walk.length === months.length) {
    return `between ${MONTH[walk[0] - 1]} and ${MONTH[walk[walk.length - 1] - 1]}`;
  }
  return `in ${months
    .slice()
    .sort((x, y) => x - y)
    .map((m) => MONTH[m - 1])
    .join(", ")}`;
}

/**
 * How this activity runs, in one sentence, derived from the mode.
 *
 * Never stored. An on-demand activity gets a lead time and a season; a
 * seasonal-window one gets its windows; only a scheduled one is allowed to
 * mention a minimum, and it says so by pointing at real departures.
 */
export function availabilitySentence(a: Activity): string {
  const av = a.availability;
  if (av.mode === "on-demand") {
    const notice =
      av.leadTimeDays === 0
        ? "the same day"
        : `${av.leadTimeDays} ${av.leadTimeDays === 1 ? "day's" : "days'"} notice`;
    return `Runs on demand from ${notice}, ${seasonPhrase(av.operatingMonths)}. There is no minimum group and no date to fill, so there is nothing to guarantee and nothing that can fall through for want of numbers.`;
  }
  if (av.mode === "seasonal-window") {
    return `Runs inside fixed windows: ${av.windows
      .map((w) => `${w.from} to ${w.to}`)
      .join(
        ", ",
      )}. Outside those we do not run it, and we will say so rather than sell you a date we cannot keep.`;
  }
  return `Runs as fixed dated group trips, listed below with their own minimum and decision date.`;
}

/* ------------------------------------------------------- cost composition */

/**
 * An activity cost sheet, built from the same parts as a departure's.
 *
 * Not `buildCostSheet`: that function is shaped around a trek profile — an
 * itinerary to read nights off, a guide ratio to divide by, a gateway town.
 * An activity has none of those. What is shared is everything that matters:
 * the line shape, the four dispositions, the permit composition, and the rule
 * that the price is the sum of the provided lines rather than a figure typed
 * beside them.
 */
function activityCostSheet(input: {
  region: string;
  requiredPermitTypes: string[];
  onDate: string;
  provided: {
    id: string;
    label: string;
    category: CostLine["category"];
    amountUSD: number;
    payableTo: string;
    note?: string;
  }[];
  notProvided: {
    id: string;
    label: string;
    category: CostLine["category"];
    estimatedAmountUSD: number | "varies";
    whoYouPay: string;
    payableWhen: "in advance" | "on arrival" | "on the trail";
    note?: string;
  }[];
  optional?: { id: string; label: string; amountUSD: number; note?: string }[];
  feeUSD: number;
  contingencies: Contingency[];
}): CostSheet {
  const lines: CostLine[] = [];

  /* Permits, composed from the dated records exactly as a trek's are. */
  permitsFor(input.requiredPermitTypes, input.region, input.onDate).forEach(
    (permit, i) =>
      lines.push({
        id: `permit-${i + 1}`,
        label: permit.name,
        category: "permits",
        amountUSD: permit.amountUSD,
        basis: "per-person",
        disposition: "provided",
        payableTo: permit.issuingBody,
        note: permit.note,
      }),
  );

  for (const p of input.provided) {
    lines.push({
      ...p,
      basis: "per-person",
      disposition: "provided",
    });
  }

  lines.push({
    id: "fee",
    label: "Our fee",
    category: "admin",
    amountUSD: input.feeUSD,
    basis: "per-person",
    disposition: "provided",
    payableTo: "Everest Trailways",
    note: "What the company keeps once everything above is paid.",
  });

  for (const n of input.notProvided) {
    lines.push({ ...n, disposition: "not-provided" });
  }
  for (const o of input.optional ?? []) {
    lines.push({
      ...o,
      category: "admin",
      basis: "per-person",
      disposition: "optional",
    });
  }

  return {
    lines,
    contingencies: input.contingencies,
    optionalExtras: (input.optional ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      amountUSD: o.amountUSD,
      note: o.note,
    })),
    /*
     * An activity is priced per person at its minimum, so there is no shared
     * cost being divided at a cap and nothing to absorb. Stated rather than
     * omitted because the field means something on a trek.
     */
    sharedCostPolicy: "we-absorb",
    tipping: {
      guidance:
        "Tipping is customary in Nepal and is not included above. We do not collect it and no member of staff will ask you for it.",
      included: false,
      typicalRangeUSD: [5, 15],
    },
    insuranceRequirement: {
      mandatory: true,
      minimumMedicalCoverUSD: 100_000,
      mustCoverHelicopterEvacuation: true,
      mustCoverAltitudeM: 3000,
      weatherDelayNote:
        "Most policies cover medical evacuation and do not cover weather delay.",
    },
  };
}

/** The cancellation contingency a weather-dependent activity must carry. */
const weatherContingency = (what: string, refundNote: string): Contingency => ({
  id: "weather-cancellation",
  trigger: `Conditions make ${what} unsafe on the day`,
  likelihood:
    "PLACEHOLDER — a working estimate until we have a season of records",
  whatWeDo:
    "We call it off, and the guide's judgement on the day is final. You choose another date inside the season, or a full refund of what you paid us.",
  whoPays: "us",
  coveredByInsurance: "usually not",
  note: refundNote,
});

const demand = (
  walkingHoursPerDay: string,
  consecutiveDays: number,
  terrain: string,
  preparationNote: string,
): PhysicalDemand => ({
  walkingHoursPerDay,
  consecutiveDays,
  terrain,
  preparationNote,
});

/**
 * The same `Practicalities` shape a departure uses, with day-trip defaults.
 *
 * Reused rather than re-modelled. Most of the fields are about nights, and on
 * a day activity the honest value is "not applicable" rather than a field that
 * does not exist — a reader comparing a rafting day with a trek should see the
 * same eleven questions answered, including the ones whose answer is nothing.
 */
const practical = (over: Partial<Practicalities>): Practicalities => ({
  accommodation: "Not applicable — this activity does not include a night.",
  roomSharing: "Not applicable.",
  toilets: "PLACEHOLDER.",
  showers: "Not applicable.",
  food: "PLACEHOLDER — what is provided on the day.",
  dietary: "PLACEHOLDER — tell us when you book and we pass it on.",
  water: "Bring a bottle. We refill it.",
  electricity: "Not applicable.",
  signal: "PLACEHOLDER.",
  luggage: "PLACEHOLDER.",
  laundry: "Not applicable.",
  ...over,
});

/* ------------------------------------------------------------ the seeds */

const g = (
  caption: string,
  category: GalleryImage["category"],
): GalleryImage => ({
  alt: "",
  caption,
  category,
});

const SEEDS: Activity[] = [
  {
    id: "trishuli-rafting",
    slug: "trishuli-day-rafting",
    name: "Trishuli day rafting",
    category: "water",
    region: "Kathmandu Valley",
    summary:
      "PLACEHOLDER. A day on the Trishuli, put in after breakfast and out before dark, with the road alongside for most of it. Grade three in the high season and gentler outside it.",
    durationHours: 7,
    availability: {
      mode: "on-demand",
      leadTimeDays: 2,
      operatingMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    },
    minParticipants: 2,
    maxParticipants: 8,
    priceUSD: 95,
    priceScaling: [
      { participants: 2, priceUSD: 95 },
      { participants: 4, priceUSD: 78 },
      { participants: 6, priceUSD: 66 },
      { participants: 8, priceUSD: 60 },
    ],
    weatherDependency: "high",
    requiredPermitTypes: [],
    combinesWith: ["chitwan-safari", "kathmandu-valley-rim"],
    ageLimits: {
      min: 12,
      note: "PLACEHOLDER — a swimming ability requirement applies.",
    },
    safetyNotes: [
      "PLACEHOLDER — helmet and buoyancy aid worn the whole time on the water, no exceptions and no photographs without them.",
      "The trip is called off by the guide on the day if the river is running too high. That decision is not negotiable.",
      "We carry no doctor. The nearest hospital is in Kathmandu.",
    ],
    physicalDemand: demand(
      "0",
      1,
      "Sitting and paddling, with a scramble down to the put-in and up from the take-out.",
      "PLACEHOLDER — you need to be able to swim and to be comfortable being thrown out of a raft.",
    ),
    practicalities: practical({
      food: "Lunch on the bank, cooked by the raft crew.",
      toilets: "The bank. There is nothing else.",
      luggage: "Dry bags provided. Everything else stays on the bus.",
      signal: "Patchy along the gorge, none on the water.",
    }),
    gallery: [
      g("PLACEHOLDER — the put-in below the road bridge.", "landscape"),
    ],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Kathmandu Valley",
      requiredPermitTypes: [],
      onDate: "2026-10-01",
      feeUSD: 18,
      provided: [
        {
          id: "raft-crew",
          label: "Raft guide and safety kayaker",
          category: "staff",
          amountUSD: 34,
          payableTo: "The river crew",
        },
        {
          id: "equipment",
          label: "Raft, paddles, helmet and buoyancy aid",
          category: "equipment",
          amountUSD: 16,
          payableTo: "Our own store",
        },
        {
          id: "transport",
          label: "Return road transfer from Kathmandu",
          category: "transport",
          amountUSD: 19,
          payableTo: "The coach operator",
        },
        {
          id: "lunch",
          label: "Lunch on the riverbank",
          category: "meals",
          amountUSD: 8,
          payableTo: "The raft crew",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Travel and evacuation insurance",
          category: "admin",
          estimatedAmountUSD: 120,
          whoYouPay: "Your insurer",
          payableWhen: "in advance",
          note: "Mandatory. Must cover water sports.",
        },
        {
          id: "excluded-2",
          label: "Drinks and snacks on the road",
          category: "meals",
          estimatedAmountUSD: 8,
          whoYouPay: "The roadside stops",
          payableWhen: "on the trail",
        },
      ],
      optional: [
        {
          id: "photos",
          label: "Photographs from the safety kayak",
          amountUSD: 15,
          note: "PLACEHOLDER.",
        },
      ],
      contingencies: [
        weatherContingency(
          "the river",
          "You are not charged for a day we call off. The refund is the full amount you paid us and it does not depend on you rebooking.",
        ),
      ],
    }),
  },

  {
    id: "pokhara-paragliding",
    slug: "pokhara-paragliding",
    name: "Pokhara tandem paragliding",
    category: "aerial",
    region: "Annapurna",
    summary:
      "PLACEHOLDER. Thirty minutes off Sarangkot with a licensed tandem pilot, over the lake with the Annapurnas behind. Flown in the morning, when the air is predictable.",
    durationHours: 3,
    availability: {
      mode: "on-demand",
      leadTimeDays: 1,
      operatingMonths: [9, 10, 11, 12, 1, 2, 3, 4],
    },
    minParticipants: 1,
    maxParticipants: 6,
    priceUSD: 110,
    weatherDependency: "high",
    requiredPermitTypes: [],
    combinesWith: ["poon-hill", "annapurna-base-camp", "mardi-himal"],
    ageLimits: {
      min: 16,
      max: 70,
      note: "PLACEHOLDER — a weight range applies and is set by the wing.",
    },
    safetyNotes: [
      "PLACEHOLDER — flown by a licensed tandem pilot. The licence number of the pilot flying you is given before you get in the harness.",
      "The pilot's decision not to fly is final. Wind that looks fine from the road is not the same as wind at launch.",
      "We do not fly in the monsoon and we do not fly in the afternoon in spring.",
    ],
    physicalDemand: demand(
      "0",
      1,
      "A short run at launch and a seated landing.",
      "PLACEHOLDER — you need to be able to run five steps downhill on command.",
    ),
    practicalities: practical({
      food: "Not included. Most people fly before breakfast.",
      luggage: "Nothing in your hands. Pockets emptied at launch.",
      signal: "Good at launch and at the landing field.",
      toilets: "At the launch site.",
    }),
    gallery: [
      g(
        "PLACEHOLDER — the launch at Sarangkot before the wind fills in.",
        "landscape",
      ),
    ],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Annapurna",
      requiredPermitTypes: [],
      onDate: "2026-10-01",
      feeUSD: 20,
      provided: [
        {
          id: "pilot",
          label: "Licensed tandem pilot and wing",
          category: "staff",
          amountUSD: 62,
          payableTo: "The flight operator",
        },
        {
          id: "equipment",
          label: "Harness, helmet and reserve",
          category: "equipment",
          amountUSD: 10,
          payableTo: "The flight operator",
        },
        {
          id: "transport",
          label: "Transfer to launch and back from the landing field",
          category: "transport",
          amountUSD: 8,
          payableTo: "The jeep operator",
        },
        {
          id: "landing-fee",
          label: "Launch and landing site fees",
          category: "admin",
          amountUSD: 10,
          payableTo: "The site operators",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Travel and evacuation insurance",
          category: "admin",
          estimatedAmountUSD: 120,
          whoYouPay: "Your insurer",
          payableWhen: "in advance",
          note: "Mandatory. Must cover adventure sports and paragliding by name.",
        },
      ],
      optional: [
        {
          id: "video",
          label: "In-flight video and stills",
          amountUSD: 25,
          note: "PLACEHOLDER. Shot by the pilot on a pole camera.",
        },
      ],
      contingencies: [
        weatherContingency(
          "flying",
          "You are not charged for a flight that does not happen. You can wait for the next window, take another morning, or have the whole amount back.",
        ),
      ],
    }),
  },

  {
    id: "bhaktapur-day",
    slug: "bhaktapur-and-changu-narayan",
    name: "Bhaktapur and Changu Narayan on foot",
    category: "cultural",
    region: "Kathmandu Valley",
    summary:
      "PLACEHOLDER. A day walking between two of the valley's oldest settlements with a guide who can read the buildings, rather than a bus that stops at three of them.",
    durationHours: 8,
    availability: {
      mode: "on-demand",
      leadTimeDays: 1,
      operatingMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    minParticipants: 1,
    maxParticipants: 10,
    priceUSD: 68,
    priceScaling: [
      { participants: 1, priceUSD: 78 },
      { participants: 2, priceUSD: 48 },
      { participants: 4, priceUSD: 38 },
      { participants: 8, priceUSD: 32 },
    ],
    weatherDependency: "none",
    requiredPermitTypes: ["Kathmandu Valley Rim Area Entry"],
    combinesWith: ["kathmandu-valley-rim", "everest-base-camp"],
    safetyNotes: [
      "PLACEHOLDER — traffic is the hazard on this day, not the walking.",
      "We carry no doctor. Kathmandu's hospitals are half an hour away.",
    ],
    physicalDemand: demand(
      "5",
      1,
      "Paved streets, brick lanes and one long climb to Changu Narayan.",
      "PLACEHOLDER — comfortable on your feet for a day, with stops.",
    ),
    practicalities: practical({
      food: "Lunch in Bhaktapur, included.",
      toilets: "Public and café facilities through the day.",
      signal: "Good throughout.",
      luggage: "Day bag only.",
    }),
    gallery: [
      g("PLACEHOLDER — the potters' square in the early morning.", "trail"),
    ],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Kathmandu Valley",
      requiredPermitTypes: ["Kathmandu Valley Rim Area Entry"],
      onDate: "2026-10-01",
      feeUSD: 14,
      provided: [
        {
          id: "guide",
          label: "Licensed cultural guide for the day",
          category: "staff",
          amountUSD: 26,
          payableTo: "The guide",
        },
        {
          id: "entry",
          label: "Bhaktapur and Changu Narayan entry",
          category: "permits",
          amountUSD: 14,
          payableTo: "The municipal authorities",
        },
        {
          id: "transport",
          label: "Return transfer from Kathmandu",
          category: "transport",
          amountUSD: 8,
          payableTo: "The driver",
        },
        {
          id: "lunch",
          label: "Lunch in Bhaktapur",
          category: "meals",
          amountUSD: 6,
          payableTo: "The restaurant",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Drinks and anything you buy",
          category: "meals",
          estimatedAmountUSD: 10,
          whoYouPay: "The cafés and shops",
          payableWhen: "on the trail",
        },
      ],
      contingencies: [],
    }),
  },

  {
    id: "chitwan-canoe",
    slug: "rapti-canoe-and-walk",
    name: "Rapti canoe and jungle walk",
    category: "wildlife",
    region: "Terai",
    summary:
      "PLACEHOLDER. A dugout down the Rapti at first light and a walk back through the buffer forest with two guides, which is the number the park requires on foot.",
    durationHours: 5,
    availability: {
      mode: "seasonal-window",
      windows: [
        {
          from: "2026-10-01",
          to: "2027-03-31",
          note: "PLACEHOLDER. The park is open and the grass is low enough to see through.",
        },
        {
          from: "2027-04-01",
          to: "2027-05-31",
          note: "PLACEHOLDER. Open but severe by midday, so this runs at dawn only.",
        },
      ],
    },
    minParticipants: 2,
    maxParticipants: 6,
    priceUSD: 72,
    weatherDependency: "moderate",
    requiredPermitTypes: ["Terai National Park Entry"],
    combinesWith: ["chitwan-safari", "bardia-wildlife"],
    ageLimits: {
      min: 14,
      note: "PLACEHOLDER — the walking section has an age floor set by the park.",
    },
    safetyNotes: [
      "PLACEHOLDER — two guides on any walk inside the park, which is the park's rule and not a courtesy.",
      "You are on foot in a park with rhino and sloth bear in it. The briefing before you start is not a formality and the instructions are not advisory.",
      "We carry no doctor and the nearest hospital is in Bharatpur.",
    ],
    physicalDemand: demand(
      "3",
      1,
      "Flat forest floor and sand, wet underfoot in places.",
      "PLACEHOLDER — able to walk three hours and to stand still and quiet when told to.",
    ),
    practicalities: practical({
      food: "Breakfast on return, at the lodge.",
      toilets: "Before you get in the canoe, and not again until you are back.",
      signal: "None inside the park.",
      luggage: "Day bag. Nothing brightly coloured.",
    }),
    gallery: [g("PLACEHOLDER — the dugout at first light.", "landscape")],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Terai",
      requiredPermitTypes: ["Terai National Park Entry"],
      onDate: "2026-11-01",
      feeUSD: 12,
      provided: [
        {
          id: "guides",
          label: "Two park-licensed naturalist guides",
          category: "staff",
          amountUSD: 28,
          payableTo: "The guides",
        },
        {
          id: "canoe",
          label: "Dugout canoe and boatman",
          category: "transport",
          amountUSD: 10,
          payableTo: "The boatman",
        },
        {
          id: "breakfast",
          label: "Breakfast at the lodge on return",
          category: "meals",
          amountUSD: 6,
          payableTo: "The lodge",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Travel and evacuation insurance",
          category: "admin",
          estimatedAmountUSD: 120,
          whoYouPay: "Your insurer",
          payableWhen: "in advance",
        },
        {
          id: "excluded-2",
          label: "Binocular hire",
          category: "equipment",
          estimatedAmountUSD: 5,
          whoYouPay: "The lodge",
          payableWhen: "on arrival",
        },
      ],
      contingencies: [
        {
          id: "no-sighting",
          trigger: "You see very little",
          likelihood:
            "PLACEHOLDER — common enough that it should be said before you book",
          whatWeDo:
            "Nothing, because there is nothing to do. We do not offer a sighting guarantee and we will not pretend the animals are reliable.",
          whoPays: "you",
          coveredByInsurance: "usually not",
          note: "This is the honest position and it is why the price is what it is rather than higher.",
        },
      ],
    }),
  },

  {
    id: "annapurna-cycling",
    slug: "pokhara-valley-cycling",
    name: "Pokhara valley cycling day",
    category: "cycling",
    region: "Annapurna",
    summary:
      "PLACEHOLDER. Sixty flat-ish kilometres around the lake and out to the Tibetan settlements, on a bike that fits, with a van behind for anyone who has had enough.",
    durationHours: 7,
    availability: {
      mode: "on-demand",
      leadTimeDays: 2,
      operatingMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    },
    minParticipants: 2,
    maxParticipants: 8,
    priceUSD: 82,
    priceScaling: [
      { participants: 2, priceUSD: 82 },
      { participants: 4, priceUSD: 64 },
      { participants: 8, priceUSD: 52 },
    ],
    weatherDependency: "moderate",
    requiredPermitTypes: [],
    combinesWith: ["poon-hill", "annapurna-base-camp"],
    safetyNotes: [
      "PLACEHOLDER — helmets provided and worn. Nepali road traffic is the hazard here.",
      "The support van carries you and the bike if you want to stop, and that is not treated as a failure.",
    ],
    physicalDemand: demand(
      "6",
      1,
      "Sealed road and some broken surface, with one long climb out of the valley.",
      "PLACEHOLDER — comfortable riding sixty kilometres in a day.",
    ),
    practicalities: practical({
      food: "Lunch on the route, included.",
      toilets: "Café stops through the day.",
      signal: "Good for most of the loop.",
      luggage: "Support van carries everything.",
    }),
    gallery: [
      g("PLACEHOLDER — the lake road early, before the traffic.", "trail"),
    ],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Annapurna",
      requiredPermitTypes: [],
      onDate: "2026-10-01",
      feeUSD: 15,
      provided: [
        {
          id: "guide",
          label: "Ride leader and mechanic",
          category: "staff",
          amountUSD: 30,
          payableTo: "The ride leader",
        },
        {
          id: "bike",
          label: "Bike, helmet and repair kit",
          category: "equipment",
          amountUSD: 20,
          payableTo: "The bike shop",
        },
        {
          id: "support",
          label: "Support van and driver",
          category: "transport",
          amountUSD: 11,
          payableTo: "The driver",
        },
        {
          id: "lunch",
          label: "Lunch on the route",
          category: "meals",
          amountUSD: 6,
          payableTo: "The restaurant",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Travel and evacuation insurance",
          category: "admin",
          estimatedAmountUSD: 120,
          whoYouPay: "Your insurer",
          payableWhen: "in advance",
        },
      ],
      contingencies: [],
    }),
  },

  {
    id: "shivapuri-day-hike",
    slug: "shivapuri-ridge-day",
    name: "Shivapuri ridge day hike",
    category: "day-hike",
    region: "Kathmandu Valley",
    summary:
      "PLACEHOLDER. Up through the forest from Sundarijal to the ridge and back, which is the walk people do when they have one spare day in Kathmandu and do not want to spend it in Thamel.",
    durationHours: 7,
    availability: {
      mode: "on-demand",
      leadTimeDays: 1,
      operatingMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12],
    },
    minParticipants: 1,
    maxParticipants: 10,
    priceUSD: 58,
    priceScaling: [
      { participants: 1, priceUSD: 58 },
      { participants: 2, priceUSD: 42 },
      { participants: 4, priceUSD: 34 },
    ],
    weatherDependency: "moderate",
    requiredPermitTypes: ["Kathmandu Valley Rim Area Entry"],
    combinesWith: ["kathmandu-valley-rim"],
    safetyNotes: [
      "PLACEHOLDER — the forest is quiet and it is easy to lose the path off the main line. Nobody walks it without the guide.",
      "We carry no doctor.",
    ],
    physicalDemand: demand(
      "6",
      1,
      "Steep forest path, stone steps and roots, slippery after rain.",
      "PLACEHOLDER — a thousand metres of ascent in a day, on your feet for six hours.",
    ),
    practicalities: practical({
      food: "Packed lunch, included.",
      toilets: "At the park gate and nowhere afterwards.",
      signal: "Patchy in the forest, good on the ridge.",
      luggage: "Day bag.",
    }),
    gallery: [g("PLACEHOLDER — the forest track above Sundarijal.", "trail")],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Kathmandu Valley",
      requiredPermitTypes: ["Kathmandu Valley Rim Area Entry"],
      onDate: "2026-10-01",
      feeUSD: 12,
      provided: [
        {
          id: "guide",
          label: "Licensed guide for the day",
          category: "staff",
          amountUSD: 24,
          payableTo: "The guide",
        },
        {
          id: "transport",
          label: "Return transfer to Sundarijal",
          category: "transport",
          amountUSD: 9,
          payableTo: "The driver",
        },
        {
          id: "lunch",
          label: "Packed lunch",
          category: "meals",
          amountUSD: 3,
          payableTo: "The caterer",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Drinks on the ridge",
          category: "meals",
          estimatedAmountUSD: 5,
          whoYouPay: "The teashops",
          payableWhen: "on the trail",
        },
      ],
      contingencies: [],
    }),
  },

  {
    id: "island-peak",
    slug: "island-peak-climb",
    name: "Island Peak climb",
    category: "climbing",
    region: "Khumbu",
    summary:
      "PLACEHOLDER. A trekking peak above the Khumbu, run as a fixed dated group trip because it needs a climbing permit, a rope team and a weather window — none of which can be arranged on two days' notice.",
    durationDays: 18,
    availability: { mode: "scheduled", departures: ["ebc-2027-03-22"] },
    minParticipants: 4,
    maxParticipants: 8,
    priceUSD: 2450,
    weatherDependency: "high",
    requiredPermitTypes: ["Sagarmatha National Park Entry"],
    combinesWith: ["everest-base-camp"],
    ageLimits: {
      min: 18,
      note: "PLACEHOLDER — previous experience at altitude is required and is checked.",
    },
    safetyNotes: [
      "PLACEHOLDER — a climbing guide per two climbers on the summit day.",
      "This is the only thing we sell with a rope on it. If you have not used crampons before, the answer is not the two-hour session on the glacier.",
      "The decision to turn around is the guide's and it is final.",
    ],
    physicalDemand: demand(
      "7",
      16,
      "Trekking terrain for two weeks, then glacier, fixed rope and a headwall on summit day.",
      "PLACEHOLDER — you must have slept above 5,000 m before and be comfortable on a fixed line.",
    ),
    practicalities: practical({
      accommodation: "Teahouses to base camp, then tents for two nights.",
      roomSharing: "Twin share throughout. No single option above base camp.",
      food: "Full board.",
      toilets: "Teahouse to base camp, then a tent.",
      showers: "Nothing above base camp.",
      signal: "None on the mountain.",
      electricity: "Paid at teahouses, nothing above.",
      luggage: "Porters to base camp, carry your own above.",
    }),
    gallery: [g("PLACEHOLDER — the headwall from high camp.", "landscape")],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Khumbu",
      requiredPermitTypes: ["Sagarmatha National Park Entry"],
      onDate: "2027-03-22",
      feeUSD: 320,
      provided: [
        {
          id: "climbing-permit",
          label: "Trekking peak climbing permit",
          category: "permits",
          amountUSD: 250,
          payableTo: "PLACEHOLDER — the issuing body",
        },
        {
          id: "climbing-guide",
          label: "Climbing guide, one per two climbers",
          category: "staff",
          amountUSD: 620,
          payableTo: "The climbing guides",
        },
        {
          id: "equipment",
          label: "Ropes, anchors and group hardware",
          category: "equipment",
          amountUSD: 180,
          payableTo: "Our own store",
        },
        {
          id: "camp",
          label: "Base camp and high camp, tents and kitchen",
          category: "accommodation",
          amountUSD: 420,
          payableTo: "The camp crew",
        },
        {
          id: "trek-portion",
          label: "The eighteen-day trek beneath it",
          category: "accommodation",
          amountUSD: 630,
          payableTo: "Teahouses on the route",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Personal climbing equipment",
          category: "equipment",
          estimatedAmountUSD: "varies",
          whoYouPay: "An outdoor shop, at home or in Kathmandu",
          payableWhen: "in advance",
          note: "Boots, crampons, harness. Rentable in Kathmandu.",
        },
        {
          id: "excluded-2",
          label: "Travel and evacuation insurance",
          category: "admin",
          estimatedAmountUSD: 260,
          whoYouPay: "Your insurer",
          payableWhen: "in advance",
          note: "Must cover climbing to 6,200 m.",
        },
      ],
      contingencies: [
        weatherContingency(
          "the summit day",
          "PLACEHOLDER. No refund of the trip, because everything beneath the summit day has already been run. What we do not do is charge you again to try later.",
        ),
      ],
    }),
  },

  {
    id: "everest-scenic-flight",
    slug: "everest-scenic-flight",
    name: "Everest mountain flight",
    category: "aerial",
    region: "Khumbu",
    summary:
      "PLACEHOLDER. An hour up the Himalaya and back in a fixed-wing aircraft, flown at dawn from Kathmandu. Everybody gets a window seat because the aircraft is sold that way.",
    durationHours: 3,
    availability: {
      mode: "seasonal-window",
      windows: [
        {
          from: "2026-10-01",
          to: "2027-05-15",
          note: "PLACEHOLDER. Flown when the morning air is clear enough to see anything.",
        },
      ],
    },
    minParticipants: 1,
    maxParticipants: 12,
    priceUSD: 235,
    weatherDependency: "high",
    requiredPermitTypes: [],
    combinesWith: ["everest-base-camp"],
    safetyNotes: [
      "PLACEHOLDER — a scheduled commercial flight operated by a licensed carrier. We book it; we do not fly it.",
      "Cancelled for cloud more often than people expect, and we will not tell you otherwise to make the booking.",
    ],
    physicalDemand: demand("0", 1, "A seat.", "None."),
    practicalities: practical({
      food: "Nothing. It is an hour.",
      toilets: "At the airport.",
      signal: "None in the air.",
      luggage: "Hand baggage only, and airport rules apply.",
    }),
    gallery: [
      g(
        "PLACEHOLDER — the range from the north side of the aircraft.",
        "landscape",
      ),
    ],
    faqs: [],
    costSheet: activityCostSheet({
      region: "Khumbu",
      requiredPermitTypes: [],
      onDate: "2026-11-01",
      feeUSD: 30,
      provided: [
        {
          id: "seat",
          label: "Window seat on a scheduled mountain flight",
          category: "transport",
          amountUSD: 175,
          payableTo: "The airline",
        },
        {
          id: "transfer",
          label: "Hotel transfer to the airport and back",
          category: "transport",
          amountUSD: 12,
          payableTo: "The driver",
        },
        {
          id: "airport-fee",
          label: "Domestic airport fee",
          category: "admin",
          amountUSD: 18,
          payableTo: "The airport authority",
        },
      ],
      notProvided: [
        {
          id: "excluded-1",
          label: "Anything at the airport",
          category: "meals",
          estimatedAmountUSD: 8,
          whoYouPay: "The airport cafés",
          payableWhen: "on arrival",
        },
      ],
      contingencies: [
        weatherContingency(
          "flying",
          "The airline refunds a flight it cancels and we pass that on in full, without keeping our fee. If it flies and you see nothing, that is a flight that happened and it is not refundable — which is the honest answer and the reason we say it before you book.",
        ),
      ],
    }),
  },
];

/**
 * The price is the sum of the provided lines, not a figure typed beside them.
 *
 * The same rule step 10 established for departures, and it caught the same
 * class of error here immediately: two activities were seeded with a price
 * that did not include the permit the composition adds, so the headline was
 * $10 and $4 short of the ledger below it. Deriving it means a permit fee
 * changing moves an activity's price without anybody editing the activity.
 *
 * `priceScaling` is checked against this rather than derived from it — the
 * per-person price at four people is a commercial decision, not arithmetic,
 * but its first row has to be the price a solo traveller actually pays.
 */
export const ACTIVITIES: Activity[] = SEEDS.map((a) => ({
  ...a,
  priceUSD: sheetPrice(a.costSheet),
}));

export const activityBySlug = (slug: string) =>
  ACTIVITIES.find((a) => a.slug === slug);
export const activityById = (id: string) => ACTIVITIES.find((a) => a.id === id);
export const activitiesForTrek = (trekId: string) =>
  ACTIVITIES.filter((a) => a.combinesWith.includes(trekId));

/** Per-person price at a given group size, from the table or the base. */
export function priceAt(a: Activity, participants: number): number {
  if (!a.priceScaling?.length) return a.priceUSD;
  const band = [...a.priceScaling]
    .sort((x, y) => y.participants - x.participants)
    .find((b) => participants >= b.participants);
  return band?.priceUSD ?? a.priceUSD;
}
