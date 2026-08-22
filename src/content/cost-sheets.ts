/**
 * The cost sheet.
 *
 * ============================================================================
 * THESE ARE PLACEHOLDER FIGURES. REPLACE THEM WITH REAL OPERATING NUMBERS
 * BEFORE THIS SITE TAKES A BOOKING.
 * ============================================================================
 *
 * Every number below is a plausible 2026 Nepal figure — permit fees, domestic
 * air fares, teahouse rates, staff day rates — assembled to be internally
 * consistent rather than accurate. They are the right SHAPE. They are not your
 * costs. See `departures.README.md` for what to change and in what order.
 *
 * WHY THIS SECTION EXISTS
 *
 * Hidden cost is the top complaint in Nepal trekking, and the Lukla flight is
 * the defining case. Thirty to forty per cent of peak-season flights are
 * cancelled. Peak-season departures are moved from Kathmandu to Ramechhap,
 * which means a four-to-five hour drive starting around one in the morning. A
 * shared helicopter out costs $500–1,000 per person. Most travel insurance
 * covers medical evacuation and not weather delay, which is the opposite of
 * what people assume when they buy it.
 *
 * An operator quoting "all-inclusive" under about $1,500 for Everest Base Camp
 * is either leaving the Lukla flight out or quietly substituting a jeep to
 * Salleri and two extra walking days. Neither is disclosed until you arrive.
 *
 * No operator publishes what happens when it goes wrong. This does.
 *
 * THE INVARIANT
 *
 * The included lines sum to `priceUSD` exactly. Not approximately: exactly, to
 * the dollar, checked by `pnpm check:departures` before every build. If that
 * ever fails the build fails, because a cost sheet that does not add up is
 * worse than no cost sheet — it is the same broken promise in a more
 * convincing typeface.
 */

import type { TrekProfile } from "./treks.ts";

export type CostCategory =
  | "permits"
  | "transport"
  | "accommodation"
  | "meals"
  | "staff"
  | "equipment"
  | "admin";

export type CostLine = {
  id: string;
  label: string;
  category: CostCategory;
  /**
   * ALWAYS the per-person amount that enters the total.
   *
   * `basis` says how the underlying charge is levied, and `note` carries the
   * arithmetic — "3 guides at $35/day for 12 days, split 12 ways". Keeping one
   * canonical meaning for the number is what makes the sum checkable; a column
   * where some rows are per-group and some per-person cannot be added up by a
   * reader or by a guard.
   */
  amountUSD: number;
  basis: "per-person" | "per-group" | "per-day";
  included: boolean;
  note?: string;
  payableTo?: string;
};

export type Contingency = {
  id: string;
  /** The thing that goes wrong, in the words someone would use. */
  trigger: string;
  /** How often, with a number where one exists. */
  likelihood: string;
  /** Our operational response. What we actually do, not how we feel about it. */
  whatWeDo: string;
  whoPays: "us" | "you" | "shared";
  estimatedCostUSD?: number | [number, number];
  coveredByInsurance: "usually" | "usually not" | "depends";
  note?: string;
};

export type CostSheet = {
  lines: CostLine[];
  contingencies: Contingency[];
  tipping: {
    guidance: string;
    included: false;
    typicalRangeUSD: [number, number];
  };
  insuranceRequirement: {
    mandatory: boolean;
    minimumMedicalCoverUSD: number;
    mustCoverHelicopterEvacuation: boolean;
    mustCoverAltitudeM: number;
    weatherDelayNote: string;
  };
};

/* ------------------------------------------------------------ day rates */

/**
 * Staff pay, published as its own line rather than folded into "trek costs".
 *
 * This is deliberate. Guide and porter pay is the number most easily hidden and
 * most often squeezed, and an operator unwilling to show it is telling you
 * something. These rates are above the Nepal government minimum and above the
 * common market rate; if you lower them, this section stops being an argument
 * for the company and becomes an argument against it.
 */
const STAFF_DAY_USD = {
  guide: 35,
  assistantGuide: 26,
  porter: 22,
} as const;

/** Insurance and kit for staff, per trekker. Legally required, routinely skipped. */
const STAFF_COVER_USD = 9;

type TrekCosts = {
  /** Statutory fees, each named with who receives it. */
  permits: {
    label: string;
    amountUSD: number;
    payableTo: string;
    note?: string;
  }[];
  transport: {
    label: string;
    amountUSD: number;
    note?: string;
    payableTo?: string;
  }[];
  /** Nights on the trail, and the nightly rate. */
  nights: number;
  perNightUSD: number;
  accommodationLabel: string;
  /**
   * City nights, where the itinerary has them.
   *
   * Priced separately because a Pokhara hotel and a Ghorepani teahouse are not
   * the same thing, and a blended average would be the first small lie in a
   * section whose entire argument is that the numbers are real.
   */
  cityNights?: number;
  perCityNightUSD?: number;
  cityLabel?: string;
  /**
   * What we hold back against this trek's own failure modes.
   *
   * Set per trek from what actually goes wrong on it, never as a flat
   * percentage. Everest carries the most because a Lukla delay day costs us
   * around $70 a head and two or three of them is an ordinary season.
   */
  reserveUSD: number;
  /** Days of food covered, and the daily rate. */
  mealDays: number;
  perDayUSD: number;
  mealsNote: string;
  /** One porter per this many trekkers. Zero where there are no porters. */
  trekkersPerPorter: number;
  /** Days an assistant guide is carried, for the high sections. */
  assistantGuideDays?: number;
  equipmentUSD: number;
  equipmentNote: string;
  /** Anything payable on arrival, which must be disclosed rather than absorbed. */
  onArrival?: { label: string; amountUSD: number; note: string };
  contingencies: Contingency[];
  excludedEstimates: {
    label: string;
    amountUSD: number;
    note?: string;
    category: CostCategory;
  }[];
};

/* --------------------------------------------------------- contingencies */

/**
 * The Lukla set.
 *
 * Only the Everest trek flies to Lukla, and `check:departures` fails if a
 * departure whose itinerary mentions Lukla does not carry these.
 */
const LUKLA_CONTINGENCIES: Contingency[] = [
  {
    id: "lukla-delay",
    trigger: "The Lukla flight is cancelled for weather, outbound or return.",
    likelihood:
      "30–40% of peak-season flights are cancelled or delayed. Most departures see at least one delayed day.",
    whatWeDo:
      "We hold your seat on the next available flight and keep the group together. Accommodation, meals and the guide's time for the delayed days are ours, at the standard we booked, not a downgrade.",
    whoPays: "us",
    coveredByInsurance: "usually not",
    note: "This is why the contingency reserve is a line in the ledger above rather than something we hope not to spend. A delay day costs us roughly $70 per person.",
  },
  {
    id: "lukla-ramechhap",
    trigger:
      "Peak-season flights are moved from Kathmandu to Ramechhap, a four-to-five hour drive away.",
    likelihood:
      "Routine in October, November and April. Assume it rather than hope against it.",
    whatWeDo:
      "We provide the vehicle and the driver, and we leave at around 1am because that is when the flights go. There is no way to make this pleasant. We tell you before you book rather than the night before.",
    whoPays: "us",
    coveredByInsurance: "usually not",
    note: "Operators quoting a Kathmandu departure and driving you to Ramechhap without saying so are the reason this line exists.",
  },
  {
    id: "lukla-helicopter",
    trigger:
      "Flights are grounded long enough to threaten your onward international flight, and you choose a helicopter out.",
    likelihood:
      "Uncommon. It becomes a live question after roughly three consecutive grounded days.",
    whatWeDo:
      "We arrange a shared seat and tell you the price before you commit. We take no commission on it. If we have caused the delay through our own scheduling, we pay; if the weather has, the cost is yours, because we cannot carry an unbounded weather risk and still guarantee the departure price.",
    whoPays: "you",
    estimatedCostUSD: [500, 1000],
    coveredByInsurance: "depends",
    note: "Per person, on a shared seat. A private charter is $2,500–3,500. Some policies cover this only when a doctor certifies a medical need, which weather is not.",
  },
  {
    id: "lukla-missed-connection",
    trigger: "A delay causes you to miss your international flight home.",
    likelihood: "Rare, and the reason we build in a buffer day.",
    whatWeDo:
      "We help you rebook and we will argue your case with the airline. The change fee is yours.",
    whoPays: "you",
    coveredByInsurance: "depends",
    note: "Travel disruption cover, where a policy has it, usually pays this. Medical-only policies do not. Book your international flight with at least one clear day after the trek ends.",
  },
];

/** Anything walked or driven can be closed by a landslide. */
const ROAD_CONTINGENCY: Contingency = {
  id: "road-closure",
  trigger: "A landslide or road closure blocks the route in or out.",
  likelihood:
    "Occasional outside monsoon; expected during and shortly after it. Most common on the Beni, Besisahar and Dhunche roads.",
  whatWeDo:
    "We reroute, and where the detour is walkable we walk it. Extra vehicle hire and any additional nights on our itinerary are ours.",
  whoPays: "us",
  coveredByInsurance: "usually not",
};

const ALTITUDE_CONTINGENCY = (altitudeM: number): Contingency => ({
  id: "altitude-descent",
  trigger:
    "You develop altitude sickness and the guide decides you must go down.",
  likelihood: `Some symptoms are common above 3,000 m. This trek sleeps as high as ${altitudeM.toLocaleString("en-GB")} m.`,
  whatWeDo:
    "The guide's decision to descend is final and is not negotiable at any price. An assistant guide goes down with you so the rest of the group continues. Descent on foot, the escort, and your accommodation lower down are ours.",
  whoPays: "us",
  coveredByInsurance: "usually",
  note: "A helicopter evacuation, if a doctor calls for one, is billed to your insurer directly and is why the cover below is mandatory. We take no commission on evacuations.",
});

const GROUP_SIZE_CONTINGENCY: Contingency = {
  id: "below-minimum",
  trigger:
    "The departure does not reach its published minimum by the decision date.",
  likelihood:
    "Stated on this page for this date. You can see the count before you book.",
  whatWeDo:
    "We tell you on the decision date, not later. You choose a full refund, a transfer to another date at the same price, or running as a smaller group at the same price if we can staff it.",
  whoPays: "us",
  coveredByInsurance: "depends",
  note: "The refund is the full amount you paid us, including the single supplement. It is not a credit note.",
};

const WILDLIFE_CONTINGENCY: Contingency = {
  id: "no-sighting",
  trigger: "You see no tiger, rhino or other large wildlife.",
  likelihood:
    "Normal. Bardia's tiger sighting rate is roughly one trip in three; Chitwan's rhino rate is higher.",
  whatWeDo:
    "Nothing, because there is nothing to do. We do not bait, we do not use elephants to corner animals, and we will not pretend a sighting is likely to sell a trip.",
  whoPays: "you",
  coveredByInsurance: "usually not",
  note: "No operator can promise wildlife. One who does is telling you how they work.",
};

/* --------------------------------------------------------- trek profiles */

const TREK_COSTS: Record<string, TrekCosts> = {
  "everest-base-camp": {
    permits: [
      {
        label: "Sagarmatha National Park entry",
        amountUSD: 23,
        payableTo: "Department of National Parks",
      },
      {
        label: "Khumbu Pasang Lhamu rural municipality fee",
        amountUSD: 15,
        payableTo: "Khumbu Pasang Lhamu Rural Municipality",
      },
    ],
    transport: [
      {
        label: "Kathmandu–Lukla return flight",
        amountUSD: 440,
        note: "$220 each way at peak-season fares. The single largest line, and the one most often left out of an 'all-inclusive' quote.",
        payableTo: "the airline",
      },
      {
        label: "Airport transfers, Kathmandu",
        amountUSD: 20,
        note: "Both directions, private vehicle.",
      },
    ],
    nights: 10,
    perNightUSD: 14,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 1,
    perCityNightUSD: 45,
    cityLabel: "Kathmandu hotel, twin share",
    reserveUSD: 190,
    mealDays: 12,
    perDayUSD: 34,
    mealsNote:
      "Three meals a day on the trail. Food above Namche costs roughly twice what it does in Kathmandu because it arrives on a porter's back or a mule.",
    trekkersPerPorter: 2,
    assistantGuideDays: 6,
    equipmentUSD: 48,
    equipmentNote:
      "Duffel, four-season sleeping bag, group first aid, pulse oximeter, and a portable altitude chamber carried above 4,000 m.",
    contingencies: [
      ...LUKLA_CONTINGENCIES,
      ALTITUDE_CONTINGENCY(5364),
      GROUP_SIZE_CONTINGENCY,
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging in teahouses",
        amountUSD: 45,
        category: "accommodation",
        note: "$3–6 each, above Namche. Payable to the teahouse.",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 90,
        category: "meals",
        note: "We provide treated water; buying bottled instead costs about this.",
      },
      {
        label: "Wi-Fi or a data card",
        amountUSD: 25,
        category: "admin",
      },
    ],
  },

  "annapurna-base-camp": {
    permits: [
      {
        label: "Annapurna Conservation Area permit",
        amountUSD: 23,
        payableTo: "National Trust for Nature Conservation",
      },
      { label: "TIMS card", amountUSD: 15, payableTo: "Nepal Tourism Board" },
    ],
    transport: [
      {
        label: "Kathmandu–Pokhara return, tourist coach",
        amountUSD: 60,
        note: "Seven hours each way. A flight is $240 return if you would rather; see the not-included table.",
      },
      {
        label: "Pokhara–trailhead jeep, both directions",
        amountUSD: 55,
      },
    ],
    nights: 6,
    perNightUSD: 9,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 2,
    perCityNightUSD: 40,
    cityLabel: "Pokhara hotel, twin share",
    reserveUSD: 70,
    mealDays: 9,
    perDayUSD: 24,
    mealsNote: "Three meals a day on the trail, plus breakfast in Pokhara.",
    trekkersPerPorter: 2,
    assistantGuideDays: 4,
    equipmentUSD: 38,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    contingencies: [
      ROAD_CONTINGENCY,
      ALTITUDE_CONTINGENCY(4130),
      GROUP_SIZE_CONTINGENCY,
      {
        id: "avalanche-risk",
        trigger:
          "The sanctuary approach is closed for avalanche risk between Deurali and Machhapuchhre Base Camp.",
        likelihood:
          "A few days most winters and after heavy spring snow. Judged locally, on the day.",
        whatWeDo:
          "We wait a day where waiting is sensible, or we turn around. The guide decides and the decision is not open to negotiation.",
        whoPays: "us",
        coveredByInsurance: "usually not",
        note: "This stretch has killed trekkers who pushed on. We will lose the money before we take the risk.",
      },
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 25,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 60,
        category: "meals",
      },
    ],
  },

  "annapurna-circuit": {
    permits: [
      {
        label: "Annapurna Conservation Area permit",
        amountUSD: 23,
        payableTo: "National Trust for Nature Conservation",
      },
      { label: "TIMS card", amountUSD: 15, payableTo: "Nepal Tourism Board" },
    ],
    transport: [
      {
        label: "Kathmandu–Besisahar bus",
        amountUSD: 25,
      },
      {
        label: "Jeep transfers on the road sections",
        amountUSD: 85,
        note: "The road now runs a long way up both sides. We drive the sections that are no longer worth walking and say which.",
      },
      {
        label: "Pokhara–Kathmandu return, tourist coach",
        amountUSD: 30,
      },
    ],
    nights: 11,
    perNightUSD: 10,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 2,
    perCityNightUSD: 38,
    cityLabel: "Pokhara and Besisahar hotels, twin share",
    reserveUSD: 110,
    mealDays: 14,
    perDayUSD: 26,
    mealsNote:
      "Three meals a day. Prices climb steadily towards Thorong Phedi and fall again on the Mustang side.",
    trekkersPerPorter: 2,
    assistantGuideDays: 7,
    equipmentUSD: 52,
    equipmentNote:
      "Duffel, four-season sleeping bag, group first aid, pulse oximeter, and a portable altitude chamber for the Thorong La crossing.",
    contingencies: [
      ROAD_CONTINGENCY,
      ALTITUDE_CONTINGENCY(5416),
      GROUP_SIZE_CONTINGENCY,
      {
        id: "thorong-la-closed",
        trigger:
          "Thorong La is closed by snow on the day you are due to cross.",
        likelihood:
          "A handful of days each season. The 2014 storm that killed 43 people on this pass was a forecastable weather system.",
        whatWeDo:
          "We wait below the pass, or we descend and fly out from Jomsom. We do not cross a pass we have been told not to cross. Extra nights and the Jomsom flight are ours.",
        whoPays: "us",
        estimatedCostUSD: 130,
        coveredByInsurance: "usually not",
      },
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 40,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 85,
        category: "meals",
      },
      {
        label: "Hot springs at Tatopani",
        amountUSD: 5,
        category: "admin",
      },
    ],
  },

  "langtang-valley": {
    permits: [
      {
        label: "Langtang National Park entry",
        amountUSD: 23,
        payableTo: "Department of National Parks",
      },
      { label: "TIMS card", amountUSD: 15, payableTo: "Nepal Tourism Board" },
    ],
    transport: [
      {
        label: "Kathmandu–Syabrubesi return, private vehicle",
        amountUSD: 95,
        note: "Seven hours each way on a road that is genuinely poor. A shared jeep is cheaper and we do not use it for this stretch.",
      },
    ],
    nights: 5,
    perNightUSD: 10,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 1,
    perCityNightUSD: 42,
    cityLabel: "Kathmandu hotel, twin share",
    reserveUSD: 60,
    mealDays: 7,
    perDayUSD: 23,
    mealsNote: "Three meals a day on the trail.",
    trekkersPerPorter: 2,
    assistantGuideDays: 3,
    equipmentUSD: 36,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    contingencies: [
      ROAD_CONTINGENCY,
      ALTITUDE_CONTINGENCY(4984),
      GROUP_SIZE_CONTINGENCY,
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 20,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 45,
        category: "meals",
      },
    ],
  },

  "upper-mustang": {
    permits: [
      {
        label: "Upper Mustang restricted area permit",
        amountUSD: 650,
        payableTo: "Department of Immigration",
        note: "$500 for the first ten days, then $50 a day. Non-negotiable, non-refundable, and the reason this trek costs what it does.",
      },
      {
        label: "Annapurna Conservation Area permit",
        amountUSD: 23,
        payableTo: "National Trust for Nature Conservation",
      },
    ],
    transport: [
      {
        label: "Kathmandu–Pokhara return flight",
        amountUSD: 240,
      },
      {
        label: "Pokhara–Jomsom return flight",
        amountUSD: 220,
        note: "Morning flights only. The valley wind closes the strip by late morning most days.",
      },
      {
        label: "Jeep transfers north of Kagbeni",
        amountUSD: 90,
      },
    ],
    nights: 10,
    perNightUSD: 16,
    accommodationLabel: "Guesthouse accommodation, twin share",
    cityNights: 2,
    perCityNightUSD: 42,
    cityLabel: "Pokhara hotel, twin share",
    reserveUSD: 150,
    mealDays: 13,
    perDayUSD: 27,
    mealsNote:
      "Three meals a day. Everything north of Kagbeni arrives by road from Jomsom or over the Chinese border.",
    trekkersPerPorter: 2,
    equipmentUSD: 44,
    equipmentNote:
      "Duffel, sleeping bag, group first aid, pulse oximeter and wind shell for the valley afternoons.",
    contingencies: [
      {
        id: "jomsom-wind",
        trigger: "The Jomsom flight does not go, in either direction.",
        likelihood:
          "Common. The Kali Gandaki wind closes the strip most days by 11am, and flights are cancelled outright several days a month.",
        whatWeDo:
          "We drive. Jomsom to Pokhara by jeep is nine hours on a rough road, and we pay for it and for any extra night it forces.",
        whoPays: "us",
        estimatedCostUSD: 160,
        coveredByInsurance: "usually not",
      },
      ROAD_CONTINGENCY,
      ALTITUDE_CONTINGENCY(3840),
      GROUP_SIZE_CONTINGENCY,
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 40,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 70,
        category: "meals",
      },
      {
        label: "Monastery photography fees",
        amountUSD: 20,
        category: "admin",
        note: "Charged at several gompas. Payable on the spot, to the monastery.",
      },
    ],
  },

  "poon-hill": {
    permits: [
      {
        label: "Annapurna Conservation Area permit",
        amountUSD: 23,
        payableTo: "National Trust for Nature Conservation",
      },
      { label: "TIMS card", amountUSD: 15, payableTo: "Nepal Tourism Board" },
    ],
    transport: [
      {
        label: "Kathmandu–Pokhara return, tourist coach",
        amountUSD: 60,
      },
      { label: "Pokhara–trailhead jeep, both directions", amountUSD: 50 },
    ],
    nights: 2,
    perNightUSD: 9,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 2,
    perCityNightUSD: 38,
    cityLabel: "Pokhara hotel, twin share",
    reserveUSD: 35,
    mealDays: 5,
    perDayUSD: 22,
    mealsNote: "Three meals a day on the trail.",
    trekkersPerPorter: 3,
    equipmentUSD: 24,
    equipmentNote: "Duffel, sleeping bag and group first aid.",
    contingencies: [
      ROAD_CONTINGENCY,
      GROUP_SIZE_CONTINGENCY,
      {
        id: "poon-hill-cloud",
        trigger: "The Poon Hill sunrise is clouded out.",
        likelihood:
          "Roughly one morning in four outside the driest months. We are selling a walk, not a view.",
        whatWeDo:
          "We go up again the following morning where the itinerary allows it. It often does not, and we will not claim otherwise.",
        whoPays: "us",
        coveredByInsurance: "usually not",
      },
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 12,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 30,
        category: "meals",
      },
    ],
  },

  "mardi-himal": {
    permits: [
      {
        label: "Annapurna Conservation Area permit",
        amountUSD: 23,
        payableTo: "National Trust for Nature Conservation",
      },
      { label: "TIMS card", amountUSD: 15, payableTo: "Nepal Tourism Board" },
    ],
    transport: [
      {
        label: "Kathmandu–Pokhara return, tourist coach",
        amountUSD: 60,
      },
      { label: "Pokhara–trailhead jeep, both directions", amountUSD: 50 },
    ],
    nights: 4,
    perNightUSD: 11,
    accommodationLabel: "Teahouse accommodation, twin share",
    cityNights: 2,
    perCityNightUSD: 38,
    cityLabel: "Pokhara hotel, twin share",
    reserveUSD: 50,
    mealDays: 7,
    perDayUSD: 24,
    mealsNote:
      "Three meals a day. The high camps carry everything up a single ridge, and charge accordingly.",
    trekkersPerPorter: 2,
    assistantGuideDays: 2,
    equipmentUSD: 34,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    contingencies: [
      ROAD_CONTINGENCY,
      ALTITUDE_CONTINGENCY(4500),
      GROUP_SIZE_CONTINGENCY,
      {
        id: "high-camp-full",
        trigger: "High Camp has no beds when we arrive.",
        likelihood:
          "Real in October and April. There are four lodges on the ridge and no alternative within two hours.",
        whatWeDo:
          "We book ahead and send a porter up early to hold the rooms. If it fails we drop to Low Camp and go up before dawn instead.",
        whoPays: "us",
        coveredByInsurance: "usually not",
      },
    ],
    excludedEstimates: [
      {
        label: "Hot showers and device charging",
        amountUSD: 18,
        category: "accommodation",
      },
      {
        label: "Drinks, snacks and bottled water",
        amountUSD: 40,
        category: "meals",
      },
    ],
  },

  "chitwan-safari": {
    permits: [
      {
        label: "Chitwan National Park entry, 3 days",
        amountUSD: 45,
        payableTo: "Department of National Parks",
        note: "$15 a day, charged per day inside the park.",
      },
    ],
    transport: [
      {
        label: "Kathmandu–Sauraha return, private vehicle",
        amountUSD: 110,
        note: "Six hours each way.",
      },
      {
        label: "Jeep and canoe inside the park",
        amountUSD: 85,
        note: "Two jeep drives and one dugout canoe stretch, with a park naturalist.",
      },
    ],
    nights: 4,
    perNightUSD: 42,
    accommodationLabel: "Lodge accommodation, twin share",
    reserveUSD: 35,
    mealDays: 5,
    perDayUSD: 34,
    mealsNote: "Full board at the lodge.",
    trekkersPerPorter: 0,
    equipmentUSD: 20,
    equipmentNote: "Binoculars, group first aid and leech socks in season.",
    contingencies: [
      WILDLIFE_CONTINGENCY,
      ROAD_CONTINGENCY,
      GROUP_SIZE_CONTINGENCY,
      {
        id: "park-closure",
        trigger:
          "The park closes a sector for an anti-poaching operation or a flood.",
        likelihood: "A few days a year, without notice.",
        whatWeDo:
          "We move to an open sector or extend the buffer-zone walking. Park fees for days we cannot use are refunded to you.",
        whoPays: "us",
        coveredByInsurance: "usually not",
      },
    ],
    excludedEstimates: [
      {
        label: "Drinks at the lodge",
        amountUSD: 45,
        category: "meals",
      },
      {
        label: "Tharu cultural evening",
        amountUSD: 8,
        category: "admin",
        note: "Optional. Paid to the community group that runs it.",
      },
    ],
  },

  "bardia-wildlife": {
    permits: [
      {
        label: "Bardia National Park entry, 4 days",
        amountUSD: 60,
        payableTo: "Department of National Parks",
        note: "$15 a day, charged per day inside the park.",
      },
    ],
    transport: [
      {
        label: "Kathmandu–Nepalgunj return flight",
        amountUSD: 260,
        note: "Bardia is a fifteen-hour drive otherwise. The flight is the reason this costs more than Chitwan.",
      },
      {
        label: "Nepalgunj–Bardia road transfers",
        amountUSD: 70,
      },
      {
        label: "Jeep, canoe and machan time inside the park",
        amountUSD: 120,
        note: "Including full days on foot with an armed park guard, which the park requires.",
      },
    ],
    nights: 5,
    perNightUSD: 46,
    accommodationLabel: "Lodge accommodation, twin share",
    reserveUSD: 90,
    mealDays: 6,
    perDayUSD: 34,
    mealsNote: "Full board at the lodge.",
    trekkersPerPorter: 0,
    equipmentUSD: 24,
    equipmentNote: "Binoculars, group first aid and leech socks in season.",
    contingencies: [
      WILDLIFE_CONTINGENCY,
      ROAD_CONTINGENCY,
      GROUP_SIZE_CONTINGENCY,
      {
        id: "nepalgunj-flight",
        trigger: "The Nepalgunj flight is cancelled for weather or fog.",
        likelihood:
          "Winter fog closes Nepalgunj several mornings each December and January.",
        whatWeDo:
          "We wait for the next flight or drive, and we cover the extra night either way. A daytime drive is fifteen hours and we will not do it overnight.",
        whoPays: "us",
        estimatedCostUSD: 140,
        coveredByInsurance: "usually not",
      },
    ],
    excludedEstimates: [
      {
        label: "Drinks at the lodge",
        amountUSD: 50,
        category: "meals",
      },
    ],
  },

  "kathmandu-valley-rim": {
    permits: [
      {
        label: "Shivapuri Nagarjun National Park entry",
        amountUSD: 8,
        payableTo: "Department of National Parks",
      },
      {
        label: "Heritage site entry, Bhaktapur and Changu Narayan",
        amountUSD: 22,
        payableTo: "the municipalities",
        note: "Charged at the gate. Included here so there is nothing to pay on the day.",
      },
    ],
    transport: [
      {
        label: "Valley transfers, private vehicle",
        amountUSD: 65,
        note: "Trailheads, and airport both directions.",
      },
    ],
    nights: 3,
    perNightUSD: 38,
    accommodationLabel: "Hotel and lodge accommodation, twin share",
    reserveUSD: 25,
    mealDays: 4,
    perDayUSD: 22,
    mealsNote:
      "Breakfast every day and lunch on walking days. Dinners in Kathmandu are yours, because you will want to choose.",
    trekkersPerPorter: 0,
    equipmentUSD: 12,
    equipmentNote: "Group first aid and a day pack if you need one.",
    contingencies: [
      GROUP_SIZE_CONTINGENCY,
      {
        id: "valley-air",
        trigger:
          "Valley air quality is poor enough that the ridge views are gone and walking is unpleasant.",
        likelihood:
          "Common from late December to March, and during the pre-monsoon burning season.",
        whatWeDo:
          "We start earlier, go higher onto the rim, and say plainly on the day what you are likely to see. We will not pretend a brown sky is haze.",
        whoPays: "us",
        coveredByInsurance: "usually not",
      },
      ROAD_CONTINGENCY,
    ],
    excludedEstimates: [
      {
        label: "Dinners in Kathmandu",
        amountUSD: 60,
        category: "meals",
        note: "Four dinners, at what a decent Thamel restaurant charges.",
      },
      {
        label: "Drinks and snacks",
        amountUSD: 25,
        category: "meals",
      },
    ],
  },
};

/* -------------------------------------------------------------- excluded */

/**
 * The things nobody includes, listed with estimates anyway.
 *
 * An excluded item without a number is a way of technically disclosing a cost
 * while leaving someone unable to budget for it. Every line here carries a
 * figure, marked as an estimate, except the two that genuinely vary by
 * nationality and by where you live.
 */
const UNIVERSAL_EXCLUDES: {
  label: string;
  amountUSD: number;
  category: CostCategory;
  note?: string;
}[] = [
  {
    label: "International flights to and from Kathmandu",
    amountUSD: 0,
    category: "transport",
    note: "Varies too much by origin and season to estimate honestly. Europe is typically $700–1,100 return.",
  },
  {
    label: "Nepal visa on arrival",
    amountUSD: 50,
    category: "admin",
    note: "$30 for 15 days, $50 for 30 days, $125 for 90 days. Paid at the airport, in cash.",
  },
  {
    label: "Travel and evacuation insurance",
    amountUSD: 120,
    category: "admin",
    note: "Mandatory. See the requirement below for what it must cover. $80–200 for a two-week trip depending on age and cover.",
  },
  {
    label: "Personal trekking gear",
    amountUSD: 0,
    category: "equipment",
    note: "Boots, layers and a down jacket. Buy or rent in Kathmandu for $60–150 if you do not own them.",
  },
];

/* ------------------------------------------------------------- the build */

const round = (n: number) => Math.round(n);

/** "1 night", "10 nights". Small, and the kind of thing a reader notices. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Assemble one departure's cost sheet.
 *
 * Everything except the last two lines is computed from real components. The
 * contingency reserve and the operating margin then take up the remainder, so
 * the included lines sum to `priceUSD` to the dollar by construction rather
 * than by anyone remembering to check.
 *
 * That remainder is not a rounding trick. It is the money the promises on this
 * page are paid out of: the reserve is what covers a Lukla delay day, and the
 * margin is what pays the office, the licences and the guarantee. Publishing
 * both as their own lines is the point. An operator who cannot show you this
 * number is showing you something about the number.
 */
export function buildCostSheet(
  trekId: string,
  trek: TrekProfile,
  input: { priceUSD: number; days: number },
): CostSheet {
  const costs = TREK_COSTS[trekId];
  if (!costs) throw new Error(`no cost profile for trek "${trekId}"`);

  // "1:4" — one guide to four trekkers, so each trekker carries a quarter of a
  // guide's day rate. Costed on the ratio rather than on the actual group size,
  // because that is the number we can promise before anyone has booked.
  const perGuide = Number(trek.guideRatio.split(":")[1]) || 8;

  const lines: CostLine[] = [];
  const add = (line: CostLine) => lines.push(line);

  /* ------------------------------------------------------------ permits */

  costs.permits.forEach((permit, i) =>
    add({
      id: `permit-${i + 1}`,
      label: permit.label,
      category: "permits",
      amountUSD: permit.amountUSD,
      basis: "per-person",
      included: true,
      payableTo: permit.payableTo,
      note: permit.note,
    }),
  );

  /* ---------------------------------------------------------- transport */

  costs.transport.forEach((leg, i) =>
    add({
      id: `transport-${i + 1}`,
      label: leg.label,
      category: "transport",
      amountUSD: leg.amountUSD,
      basis: "per-person",
      included: true,
      payableTo: leg.payableTo,
      note: leg.note,
    }),
  );

  /* ------------------------------------------------------ accommodation */

  add({
    id: "accommodation-trail",
    label: costs.accommodationLabel,
    category: "accommodation",
    amountUSD: round(costs.nights * costs.perNightUSD),
    basis: "per-day",
    included: true,
    note: `${plural(costs.nights, "night")} at $${costs.perNightUSD} a night.`,
    payableTo: "paid by us directly to the teahouses and lodges",
  });

  if (costs.cityNights && costs.perCityNightUSD) {
    add({
      id: "accommodation-city",
      label: costs.cityLabel ?? "Hotel accommodation, twin share",
      category: "accommodation",
      amountUSD: round(costs.cityNights * costs.perCityNightUSD),
      basis: "per-day",
      included: true,
      note: `${plural(costs.cityNights, "night")} at $${costs.perCityNightUSD} a night.`,
    });
  }

  /* -------------------------------------------------------------- meals */

  add({
    id: "meals",
    label: "Meals",
    category: "meals",
    amountUSD: round(costs.mealDays * costs.perDayUSD),
    basis: "per-day",
    included: true,
    note: `${plural(costs.mealDays, "day")} at $${costs.perDayUSD} a day. ${costs.mealsNote}`,
    payableTo: "paid by us directly to the teahouses and lodges",
  });

  /* -------------------------------------------------------------- staff */

  add({
    id: "staff-guide",
    label: "Guide",
    category: "staff",
    amountUSD: round((STAFF_DAY_USD.guide * input.days) / perGuide),
    basis: "per-group",
    included: true,
    note: `$${STAFF_DAY_USD.guide} a day for ${input.days} days, one guide to ${perGuide} trekkers.`,
    payableTo: "the guide",
  });

  if (costs.assistantGuideDays) {
    add({
      id: "staff-assistant",
      label: "Assistant guide, high sections",
      category: "staff",
      amountUSD: round(
        (STAFF_DAY_USD.assistantGuide * costs.assistantGuideDays) / perGuide,
      ),
      basis: "per-group",
      included: true,
      note: `$${STAFF_DAY_USD.assistantGuide} a day for the ${costs.assistantGuideDays} days spent high, so one person can descend without the group turning back.`,
      payableTo: "the assistant guide",
    });
  }

  if (costs.trekkersPerPorter > 0) {
    add({
      id: "staff-porter",
      label: "Porters",
      category: "staff",
      amountUSD: round(
        (STAFF_DAY_USD.porter * input.days) / costs.trekkersPerPorter,
      ),
      basis: "per-group",
      included: true,
      note: `$${STAFF_DAY_USD.porter} a day for ${input.days} days, one porter to ${costs.trekkersPerPorter} trekkers, load capped at 20kg.`,
      payableTo: "the porters",
    });
  }

  add({
    id: "staff-cover",
    label: "Staff insurance, kit and rescue cover",
    category: "staff",
    amountUSD: STAFF_COVER_USD,
    basis: "per-person",
    included: true,
    note: "Required by law for every guide and porter. Routinely omitted by operators competing on price.",
  });

  /* ---------------------------------------------------------- equipment */

  add({
    id: "equipment",
    label: "Group equipment and safety kit",
    category: "equipment",
    amountUSD: costs.equipmentUSD,
    basis: "per-group",
    included: true,
    note: costs.equipmentNote,
  });

  /* -------------------------------------------------------------- admin */

  add({
    id: "reserve",
    label: "Contingency reserve",
    category: "admin",
    amountUSD: costs.reserveUSD,
    basis: "per-person",
    included: true,
    note: "What pays for the delays, reroutes and extra nights listed under 'When things go wrong'. Held against this departure rather than a general fund.",
  });

  /*
   * The margin is what is left, and it is a line like any other.
   *
   * Deriving it rather than declaring it is what makes the total exact by
   * construction: there is no arrangement of the numbers above under which the
   * ledger fails to add up to the price. The guard then checks that this line
   * is a plausible share of the price, so a bad edit shows up as an implausible
   * margin instead of silently balancing itself.
   */
  const spent = lines.reduce((sum, line) => sum + line.amountUSD, 0);
  const margin = input.priceUSD - spent;

  add({
    id: "margin",
    label: "Operating margin, office, licences and guarantee",
    category: "admin",
    amountUSD: margin,
    basis: "per-person",
    included: true,
    note: `${Math.round((margin / input.priceUSD) * 100)}% of the price. Pays the Kathmandu office, the operating licence and company insurance, and funds the refund if this departure does not reach its minimum.`,
  });

  /* ----------------------------------------------------------- excluded */

  [...UNIVERSAL_EXCLUDES, ...costs.excludedEstimates].forEach((item, i) =>
    add({
      id: `excluded-${i + 1}`,
      label: item.label,
      category: item.category,
      amountUSD: item.amountUSD,
      basis: "per-person",
      included: false,
      note: item.note,
    }),
  );

  if (costs.onArrival) {
    add({
      id: "on-arrival",
      label: costs.onArrival.label,
      category: "admin",
      amountUSD: costs.onArrival.amountUSD,
      basis: "per-person",
      included: false,
      note: costs.onArrival.note,
    });
  }

  return {
    lines,
    contingencies: costs.contingencies,
    tipping: {
      guidance:
        "Tipping is customary in Nepal and it is not included in the price above. We do not collect it, we do not add it to an invoice, and no member of staff will ask you for it. The range below is what groups commonly give across a whole trip, pooled and divided at the end.",
      included: false,
      typicalRangeUSD: [round(input.days * 8), round(input.days * 14)],
    },
    insuranceRequirement: {
      mandatory: true,
      minimumMedicalCoverUSD: 100_000,
      mustCoverHelicopterEvacuation: true,
      mustCoverAltitudeM: Math.max(3000, trek.maxAltitudeM),
      weatherDelayNote:
        "Most policies cover medical evacuation and do not cover weather delay. A cancelled Lukla flight is not a medical event, and a policy sold as trekking cover will often pay nothing towards a missed connection or an extra night in a lodge. If that matters to you, look for travel disruption cover specifically, and read what it excludes rather than what it advertises.",
    },
  };
}
