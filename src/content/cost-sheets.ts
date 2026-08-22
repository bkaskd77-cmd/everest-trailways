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

  /*
   * The arithmetic behind the amount, as data rather than as prose.
   *
   * `amountUSD` alone with `basis: "per-day"` was wrong and it read as wrong:
   * the accommodation line said "$114" and "per day" beside each other, when
   * $114 is three nights at $38. A reader checking our sums cannot check a
   * number whose derivation is only described in a sentence.
   *
   * So a per-day line carries its unit rate and its count and renders
   * "$38 × 3 nights = $114", and a per-group line carries what it was divided
   * by and renders "$35 × 12 days ÷ 4 = $105". The guard reproduces the
   * arithmetic and fails if it does not land on `amountUSD`.
   */
  unitAmountUSD?: number;
  unitCount?: number;
  /** Singular. "night", "day", "person" — pluralised at render time. */
  unitLabel?: string;
  /** For per-group lines: how many people the group charge is split across. */
  dividedBy?: number;
};

/**
 * Something you can add, that is not in the price.
 *
 * Kept as data rather than as a sentence under the total because that is what
 * it is: a priced option a reader may want to compare, add up, or forward. The
 * single supplement lived in prose and was therefore invisible to the PDF, to
 * the feed, and to anyone scanning the tables for numbers.
 */
export type OptionalExtra = {
  id: string;
  label: string;
  amountUSD: number;
  note?: string;
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
  /** Priced options, not in the total. Includes the single supplement. */
  optionalExtras: OptionalExtra[];
  /**
   * What happens to a shared cost when the group is smaller than the cap.
   *
   * Guide time and group equipment are divided at the group cap. If five
   * people book a trip costed at fourteen, the true per-person share is nearly
   * three times what the ledger shows. Somebody carries that difference, and a
   * cost sheet that does not say who is hiding the one number a small-group
   * traveller most needs.
   *
   * `we-absorb` — the published price stands whatever the group size.
   * `price-varies` — the price would be recalculated, and the page says so
   *   plainly instead of implying otherwise.
   */
  sharedCostPolicy: "we-absorb" | "price-varies";
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

/**
 * Kathmandu office and coordination, per trekker per day of trip.
 *
 * Permits filed in person at three different offices, domestic flights held and
 * re-held as the weather moves, teahouses booked ahead on the ridges where beds
 * run out, and somebody reachable at two in the morning when a group is stuck
 * at Ramechhap. It is real work by paid people and it is not the same thing as
 * profit, which is why it stopped being bundled with it.
 */
const OFFICE_DAY_USD = 7;

/**
 * Held to refund you if this departure does not reach its minimum.
 *
 * A share of the price, set aside against THIS departure rather than pooled, so
 * the refund does not depend on next month's bookings. Distinct from the
 * contingency reserve, which pays for delays on a trip that does run.
 */
const GUARANTEE_RESERVE_SHARE = 0.025;

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
  /**
   * The cost of being a company that legally exists, per traveller.
   *
   * Trekking agency licence, TAAN and NMA membership, company liability
   * insurance, annual registration and audit. Small, unglamorous, and the first
   * thing an unregistered operator saves by not paying.
   */
  licencesUSD: number;
  /** Trek-specific options a traveller can add. Merged with the universal ones. */
  extras?: OptionalExtra[];
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
  /**
   * Built from the trek's own facts rather than stored as prose.
   *
   * A function, not an array, because every sentence in here that names a
   * height or a place has to come from this trek. Stored prose is how an
   * Annapurna page ended up talking about Lukla.
   */
  contingencies: (facts: TrekFacts) => Contingency[];
  /** Places this trek may legitimately name that are not overnight stops. */
  namedPlaces?: string[];
  /** The town the trip runs out of. */
  gateway: string;
  /** The leg weather actually threatens on this trek. */
  disruption: { place: string; kind: "flight" | "road" };
  excludedEstimates: {
    label: string;
    amountUSD: number;
    note?: string;
    category: CostCategory;
  }[];
};

/* --------------------------------------------------------- contingencies */

/**
 * What a contingency is allowed to know about the trek it belongs to.
 *
 * Contingencies used to be a fixed array per trek, written by hand, carrying
 * whatever number somebody typed. One of them said "this trek sleeps as high as
 * 4,500 m" on a trek that sleeps at 3,580 m — 4,500 m being the day high point
 * at a viewpoint you walk to and come down from. Confusing the sleeping
 * altitude with the day maximum is the precise error the whole altitude profile
 * exists to prevent, printed in the section that exists to answer it.
 *
 * So they are derived now, and the two numbers are separate fields that cannot
 * be substituted for one another by accident.
 */
export type TrekFacts = {
  /** The highest a night is spent. The number that governs altitude illness. */
  highestSleepM: number;
  /** The highest point touched on a walking day. Not where you sleep. */
  maxAltitudeM: number;
  /** The town the trip runs out of, for road and flight disruption prose. */
  gateway: string;
  /**
   * The weather-exposed leg, where there is one.
   *
   * Named per trek so no shared sentence has to invent a place. An Annapurna
   * page said "a cancelled Lukla flight is not a medical event" because that
   * sentence was written once for Everest and reused everywhere.
   */
  disruption: { place: string; kind: "flight" | "road" };
};

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
/**
 * Named the three roads it knew about, on every trek, including the ones that
 * use none of them. It names this trek's own road now.
 */
const ROAD_CONTINGENCY = (facts: TrekFacts): Contingency => ({
  id: "road-closure",
  trigger: "A landslide or road closure blocks the route in or out.",
  likelihood: `Occasional outside monsoon; expected during and shortly after it. On this trip the exposed stretch is the road ${facts.disruption.kind === "road" ? `through ${facts.disruption.place}` : `out of ${facts.gateway}`}.`,
  whatWeDo:
    "We reroute, and where the detour is walkable we walk it. Extra vehicle hire and any additional nights on our itinerary are ours.",
  whoPays: "us",
  coveredByInsurance: "usually not",
});

const ALTITUDE_CONTINGENCY = (facts: TrekFacts): Contingency => ({
  id: "altitude-descent",
  trigger:
    "You develop altitude sickness and the guide decides you must go down.",
  /*
   * Two numbers, stated as two numbers.
   *
   * The sleeping altitude is what governs altitude illness and the day maximum
   * is what people remember, and they are usually different — on this trek by
   * nearly a kilometre. Saying only the higher one overstates the risk of the
   * nights; saying only the lower one understates the day. Both, labelled.
   */
  likelihood: `Some symptoms are common above 3,000 m. The highest night on this trek is ${facts.highestSleepM.toLocaleString("en-GB")} m${
    facts.maxAltitudeM > facts.highestSleepM
      ? `, and the highest point reached on a walking day is ${facts.maxAltitudeM.toLocaleString("en-GB")} m`
      : ""
  }.`,
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
        label: "Lukla return flight",
        amountUSD: 440,
        note: "$220 each way at peak-season fares. From mid-March to May and from October to November this flight departs from RAMECHHAP, not Kathmandu — see the ground transfer below. It is the single largest line here and the one most often left out of an 'all-inclusive' quote.",
        payableTo: "the airline",
      },
      {
        label: "Ramechhap ground transfer, both directions",
        amountUSD: 55,
        note: "Peak season only, and this departure falls inside it. Ramechhap is four to five hours from Kathmandu by road and the flights leave at first light, so the drive starts at around 1am. Private vehicle, both directions, included here rather than sprung on you at the hotel desk the night before.",
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
    reserveUSD: 150,
    licencesUSD: 34,
    mealDays: 12,
    perDayUSD: 34,
    mealsNote:
      "Three meals a day on the trail. Food above Namche costs roughly twice what it does in Kathmandu because it arrives on a porter's back or a mule.",
    trekkersPerPorter: 2,
    assistantGuideDays: 6,
    equipmentUSD: 48,
    equipmentNote:
      "Duffel, four-season sleeping bag, group first aid, pulse oximeter, and a portable altitude chamber carried above 4,000 m.",
    extras: [
      {
        id: "heli-out",
        label: "Helicopter seat out of Lukla, shared",
        amountUSD: 650,
        note: "Arranged at cost if you want to guarantee getting out on a fixed day rather than wait for the weather. We take no commission on it. Price moves with demand; this is the middle of the range.",
      },
    ],
    gateway: "Kathmandu",
    disruption: { place: "Lukla", kind: "flight" },
    namedPlaces: [
      "Lukla",
      "Ramechhap",
      "Khumbu",
      "Sagarmatha",
      "Everest",
      "Salleri",
      "Kala Patthar",
    ],
    contingencies: (facts) => [
      ...LUKLA_CONTINGENCIES,
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 28,
    mealDays: 9,
    perDayUSD: 24,
    mealsNote: "Three meals a day on the trail, plus breakfast in Pokhara.",
    trekkersPerPorter: 2,
    assistantGuideDays: 4,
    equipmentUSD: 38,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    gateway: "Pokhara",
    disruption: { place: "Beni", kind: "road" },
    namedPlaces: ["Annapurna", "Deurali", "Machhapuchhre", "Pokhara", "Beni"],
    contingencies: (facts) => [
      ROAD_CONTINGENCY(facts),
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 32,
    mealDays: 14,
    perDayUSD: 26,
    mealsNote:
      "Three meals a day. Prices climb steadily towards Thorong Phedi and fall again on the Mustang side.",
    trekkersPerPorter: 2,
    assistantGuideDays: 7,
    equipmentUSD: 52,
    equipmentNote:
      "Duffel, four-season sleeping bag, group first aid, pulse oximeter, and a portable altitude chamber for the Thorong La crossing.",
    gateway: "Pokhara",
    disruption: { place: "Besisahar", kind: "road" },
    namedPlaces: [
      "Annapurna",
      "Thorong La",
      "Thorong",
      "Mustang",
      "Pokhara",
      "Besisahar",
      // The escape route when the pass is closed, so the contingency names it.
      "Jomsom",
    ],
    contingencies: (facts) => [
      ROAD_CONTINGENCY(facts),
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 24,
    mealDays: 7,
    perDayUSD: 23,
    mealsNote: "Three meals a day on the trail.",
    trekkersPerPorter: 2,
    assistantGuideDays: 3,
    equipmentUSD: 36,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    gateway: "Kathmandu",
    disruption: { place: "Dhunche", kind: "road" },
    namedPlaces: ["Langtang", "Dhunche"],
    contingencies: (facts) => [
      ROAD_CONTINGENCY(facts),
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 30,
    mealDays: 13,
    perDayUSD: 27,
    mealsNote:
      "Three meals a day. Everything north of Kagbeni arrives by road from Jomsom or over the Chinese border.",
    trekkersPerPorter: 2,
    equipmentUSD: 44,
    equipmentNote:
      "Duffel, sleeping bag, group first aid, pulse oximeter and wind shell for the valley afternoons.",
    gateway: "Pokhara",
    disruption: { place: "Jomsom", kind: "flight" },
    namedPlaces: ["Mustang", "Kali Gandaki", "Pokhara", "Annapurna", "Jomsom"],
    contingencies: (facts) => [
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
      ROAD_CONTINGENCY(facts),
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 20,
    mealDays: 5,
    perDayUSD: 22,
    mealsNote: "Three meals a day on the trail.",
    trekkersPerPorter: 3,
    equipmentUSD: 24,
    equipmentNote: "Duffel, sleeping bag and group first aid.",
    gateway: "Pokhara",
    disruption: { place: "Beni", kind: "road" },
    namedPlaces: ["Annapurna", "Poon Hill", "Ghorepani", "Pokhara", "Beni"],
    contingencies: (facts) => [
      ROAD_CONTINGENCY(facts),
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
    licencesUSD: 24,
    mealDays: 7,
    perDayUSD: 24,
    mealsNote:
      "Three meals a day. The high camps carry everything up a single ridge, and charge accordingly.",
    trekkersPerPorter: 2,
    assistantGuideDays: 2,
    equipmentUSD: 34,
    equipmentNote:
      "Duffel, sleeping bag, group first aid and a pulse oximeter.",
    gateway: "Pokhara",
    disruption: { place: "Kande", kind: "road" },
    namedPlaces: ["Annapurna", "Mardi", "Pokhara", "Kande", "Machhapuchhre"],
    contingencies: (facts) => [
      ROAD_CONTINGENCY(facts),
      ALTITUDE_CONTINGENCY(facts),
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
    licencesUSD: 20,
    mealDays: 5,
    perDayUSD: 34,
    mealsNote: "Full board at the lodge.",
    trekkersPerPorter: 0,
    equipmentUSD: 20,
    equipmentNote: "Binoculars, group first aid and leech socks in season.",
    gateway: "Kathmandu",
    disruption: { place: "Mugling", kind: "road" },
    namedPlaces: ["Chitwan", "Rapti", "Terai", "Tharu", "Mugling", "Bardia"],
    contingencies: (facts) => [
      WILDLIFE_CONTINGENCY,
      ROAD_CONTINGENCY(facts),
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
    licencesUSD: 22,
    mealDays: 6,
    perDayUSD: 34,
    mealsNote: "Full board at the lodge.",
    trekkersPerPorter: 0,
    equipmentUSD: 24,
    equipmentNote: "Binoculars, group first aid and leech socks in season.",
    gateway: "Kathmandu",
    disruption: { place: "Nepalgunj", kind: "flight" },
    namedPlaces: ["Bardia", "Karnali", "Nepalgunj", "Terai", "Chitwan"],
    contingencies: (facts) => [
      WILDLIFE_CONTINGENCY,
      ROAD_CONTINGENCY(facts),
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
    licencesUSD: 18,
    mealDays: 4,
    perDayUSD: 22,
    mealsNote:
      "Breakfast every day and lunch on walking days. Dinners in Kathmandu are yours, because you will want to choose.",
    trekkersPerPorter: 0,
    equipmentUSD: 12,
    equipmentNote: "Group first aid and a day pack if you need one.",
    gateway: "Kathmandu",
    disruption: { place: "Sundarijal", kind: "road" },
    namedPlaces: [
      "Kathmandu",
      "Shivapuri",
      "Nagarjun",
      "Bhaktapur",
      "Changu Narayan",
      "Thamel",
      "Sundarijal",
    ],
    contingencies: (facts) => [
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
      ROAD_CONTINGENCY(facts),
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
  input: {
    priceUSD: number;
    days: number;
    groupSizeMax: number;
    singleSupplementUSD: number;
  },
): CostSheet {
  const costs = TREK_COSTS[trekId];
  if (!costs) throw new Error(`no cost profile for trek "${trekId}"`);

  /*
   * Read off the itinerary, not typed.
   *
   * `highestSleepM` is the maximum of the nights; `maxAltitudeM` is the highest
   * point on a walking day. On Mardi Himal those are 3,580 m and 4,500 m, and
   * the old hand-written contingency used the second while calling it the
   * first. Deriving both removes the chance to confuse them again.
   */
  const facts: TrekFacts = {
    highestSleepM: Math.max(...trek.itinerary.map((day) => day.sleepAltitudeM)),
    maxAltitudeM: trek.maxAltitudeM,
    gateway: costs.gateway,
    disruption: costs.disruption,
  };

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
    unitAmountUSD: costs.perNightUSD,
    unitCount: costs.nights,
    unitLabel: "night",
    included: true,
    note: "Twin share. A single room is an optional extra, not a surcharge.",
    payableTo: "the teahouses and lodges, by us",
  });

  if (costs.cityNights && costs.perCityNightUSD) {
    add({
      id: "accommodation-city",
      label: costs.cityLabel ?? "Hotel accommodation, twin share",
      category: "accommodation",
      amountUSD: round(costs.cityNights * costs.perCityNightUSD),
      basis: "per-day",
      unitAmountUSD: costs.perCityNightUSD,
      unitCount: costs.cityNights,
      unitLabel: "night",
      included: true,
    });
  }

  /* -------------------------------------------------------------- meals */

  add({
    id: "meals",
    label: "Meals",
    category: "meals",
    amountUSD: round(costs.mealDays * costs.perDayUSD),
    basis: "per-day",
    unitAmountUSD: costs.perDayUSD,
    unitCount: costs.mealDays,
    unitLabel: "day",
    included: true,
    note: costs.mealsNote,
    payableTo: "the teahouses and lodges, by us",
  });

  /* -------------------------------------------------------------- staff */

  add({
    id: "staff-guide",
    label: "Guide",
    category: "staff",
    amountUSD: round((STAFF_DAY_USD.guide * input.days) / perGuide),
    basis: "per-group",
    unitAmountUSD: STAFF_DAY_USD.guide,
    unitCount: input.days,
    unitLabel: "day",
    dividedBy: perGuide,
    included: true,
    note: `Paid at $${STAFF_DAY_USD.guide} a day, above the government minimum and above the common market rate.`,
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
      unitAmountUSD: STAFF_DAY_USD.assistantGuide,
      unitCount: costs.assistantGuideDays,
      unitLabel: "day",
      dividedBy: perGuide,
      included: true,
      note: "Carried for the days spent high, so one person can descend without the group turning back.",
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
      unitAmountUSD: STAFF_DAY_USD.porter,
      unitCount: input.days,
      unitLabel: "day",
      dividedBy: costs.trekkersPerPorter,
      included: true,
      note: `Paid at $${STAFF_DAY_USD.porter} a day, one porter to ${costs.trekkersPerPorter} trekkers, load capped at 20kg.`,
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
    // Stated as what the kit costs the group and what that is each, rather than
    // as a bare per-head figure: the sleeping bags and the altitude chamber are
    // bought once for everybody.
    unitAmountUSD: costs.equipmentUSD * input.groupSizeMax,
    unitCount: 1,
    unitLabel: "set",
    dividedBy: input.groupSizeMax,
    included: true,
    note: costs.equipmentNote,
  });

  /* -------------------------------------------------------------- admin */

  /*
   * Four lines, not one.
   *
   * This was a single "Operating margin, office, licences and guarantee" line,
   * and on a short trek it came to a third of the price sitting beside a staff
   * total of five per cent. That reads as five per cent to the people who walk
   * with you and thirty-three to the office — which is the accusation this
   * company exists to answer, printed in our own typeface.
   *
   * The number was not wrong. The presentation was: it bundled three genuine
   * costs with the profit and then called the whole thing margin, which is both
   * inaccurate and the least flattering possible reading of it. Split apart,
   * each line has to justify itself, and the last one is called what it is.
   */
  add({
    id: "reserve",
    label: "Contingency reserve",
    category: "admin",
    amountUSD: costs.reserveUSD,
    basis: "per-person",
    included: true,
    note: "Pays for the delays, reroutes and extra nights under 'When things go wrong' on a trip that does run. Held against this departure rather than pooled.",
  });

  add({
    id: "guarantee-reserve",
    label: "Guarantee reserve",
    category: "admin",
    amountUSD: round(input.priceUSD * GUARANTEE_RESERVE_SHARE),
    basis: "per-person",
    included: true,
    note: "Held to refund you in full if this departure does not reach its minimum by the decision date. Held against this departure, not pooled — the refund does not depend on next month's bookings.",
  });

  add({
    id: "licences",
    label: "Licences, company insurance and registrations",
    category: "admin",
    amountUSD: costs.licencesUSD,
    basis: "per-person",
    included: true,
    note: "Trekking agency licence, TAAN and NMA membership, company liability insurance, annual registration and audit. The first thing an unregistered operator saves by not paying.",
  });

  add({
    id: "office",
    label: "Kathmandu office and coordination",
    category: "admin",
    amountUSD: round(OFFICE_DAY_USD * input.days),
    basis: "per-day",
    unitAmountUSD: OFFICE_DAY_USD,
    unitCount: input.days,
    unitLabel: "day",
    included: true,
    note: "Permits filed in person, flights held and re-held as the weather moves, beds booked ahead where they run out, and somebody reachable at two in the morning when something goes wrong.",
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
    id: "fee",
    label: "Our fee",
    category: "admin",
    amountUSD: margin,
    basis: "per-person",
    included: true,
    note: `${Math.round((margin / input.priceUSD) * 100)}% of the price. What the company keeps once everything above is paid. Not called margin, because margin is a word that means several things and this means one.`,
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

  /*
   * The single supplement is a priced option, not a surcharge, so it belongs in
   * a table with the other options rather than in a sentence under the total.
   * `check:departures` fails if the card advertises one and this list does not
   * carry it at the same figure.
   */
  const optionalExtras: OptionalExtra[] = [
    ...(input.singleSupplementUSD > 0
      ? [
          {
            id: "single-room",
            label: "Single room throughout",
            amountUSD: input.singleSupplementUSD,
            note: "A room to yourself every night the accommodation allows one. On the high teahouse sections there are nights where nobody gets one, and you are not charged for those.",
          },
        ]
      : []),
    {
      id: "extra-kathmandu-night",
      label: "Extra night in Kathmandu, per night",
      amountUSD: 48,
      note: "Twin share, at the hotel we use. Worth one either side if your international flight is tight.",
    },
    {
      id: "gear-rental",
      label: "Gear rental package",
      amountUSD: 65,
      note: "Down jacket, four-season sleeping bag and duffel for the trip. Cheaper than buying if you will not use them again.",
    },
    ...(costs.extras ?? []),
  ];

  return {
    lines,
    contingencies: costs.contingencies(facts),
    optionalExtras,
    /*
     * We absorb it. If five people book a departure costed at fourteen, the
     * guide's day rate is split five ways instead and the difference is ours —
     * the published price is what you pay. This is stated rather than implied
     * because the alternative practice, quietly recalculating on a small group,
     * is common enough that a traveller is right to ask.
     */
    sharedCostPolicy: "we-absorb",
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
      /*
       * Names this trek's own weather-exposed leg.
       *
       * This sentence said "a cancelled Lukla flight" on every departure,
       * including the ones that never go near Lukla. It was written once for
       * Everest and reused, which is the same fault as the Ramechhap season
       * claim in step 7a: shared prose that names a place.
       */
      weatherDelayNote: `Most policies cover medical evacuation and do not cover weather delay. ${
        costs.disruption.kind === "flight"
          ? `A cancelled ${costs.disruption.place} flight is not a medical event`
          : `A road closed at ${costs.disruption.place} is not a medical event`
      }, and a policy sold as trekking cover will often pay nothing towards a missed connection or an extra night. If that matters to you, look for travel disruption cover specifically, and read what it excludes rather than what it advertises.`,
    },
  };
}

/**
 * Places each trek may legitimately name, beyond its own overnight stops.
 *
 * Read by `check:departures`, which fails on any rendered sentence naming a
 * place outside this set plus the itinerary. Gateways, ranges and the road or
 * airstrip that weather actually threatens all live here.
 */
export const TREK_NAMED_PLACES: Record<string, string[]> = Object.fromEntries(
  Object.entries(TREK_COSTS).map(([id, costs]) => [
    id,
    costs.namedPlaces ?? [],
  ]),
);
