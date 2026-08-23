/*
 * ============================================================================
 * SAFETY POLICY AS DATA. PLACEHOLDER FIGURES ARE MARKED.
 * ============================================================================
 *
 * Structured rather than written as prose, for one reason: `check:safety`
 * fails the build if any departure's ratio, staffing or required certification
 * contradicts what this page says. A page of paragraphs cannot be checked
 * against nineteen departures. A table can.
 * ============================================================================
 */

import { CERTIFICATION_TIERS } from "./certification.ts";

export type RatioBand = {
  /** Inclusive floor, in metres. */
  aboveM: number;
  /** "1:4" — one guide to four trekkers. */
  guideRatio: string;
  /** The certification tier a guide must hold to work this band. */
  requiresTierAtLeastM: number;
  note: string;
};

/**
 * Guide ratios by altitude band.
 *
 * The guard reads this and every departure's own `guideRatio`, and fails if a
 * departure promises a thinner ratio than its altitude band requires. That is
 * the contradiction worth catching: a page saying 1:4 above 4,000 m while a
 * 5,364 m departure quietly runs 1:8.
 */
export const RATIO_BANDS: RatioBand[] = [
  {
    aboveM: 0,
    guideRatio: "1:8",
    requiresTierAtLeastM: 3000,
    note: "Below 3,000 m the limit on group size is the trail and the lodge, not altitude.",
  },
  {
    aboveM: 3000,
    guideRatio: "1:8",
    requiresTierAtLeastM: 4500,
    note: "Above 3,000 m the guide is watching for altitude illness daily, and the certification band steps up.",
  },
  {
    aboveM: 4500,
    guideRatio: "1:8",
    requiresTierAtLeastM: 6000,
    note: "Above 4,500 m a second guide joins the group so that one can descend with somebody without the rest of the group stopping.",
  },
];

/**
 * Strictly above, because the tiers are "valid up to".
 *
 * With `>=` a route reaching exactly 4,500 m fell into the above-4,500 band
 * and was required to hold a tier valid to 6,000 m — while the tier lookup,
 * reading "valid up to 4,500 m", correctly gave it the 4,500 m tier. Mardi
 * Himal tops out at exactly 4,500 m and the two rules disagreed about it.
 * One boundary convention has to win, and "valid up to" is the one the
 * certification data is written in.
 */
export const bandFor = (maxAltitudeM: number) =>
  [...RATIO_BANDS]
    .sort((a, b) => b.aboveM - a.aboveM)
    .find((b) => maxAltitudeM > b.aboveM) ?? RATIO_BANDS[0];

export const certificationTierSet = () => CERTIFICATION_TIERS;

/* --------------------------------------------------------------- policies */

export type Policy = { id: string; title: string; body: string; note?: string };

export const DESCENT_RULE: Policy = {
  id: "descent",
  title: "The guide's decision to descend is final",
  body: "If the guide judges that you need to go down, you go down. That decision is not negotiable, it is not appealable to the office, and it cannot be bought out at any price. Nobody on our staff is permitted to accept money, pressure or a signed waiver to continue up with somebody they have decided should descend.",
  note: "This is written down because the pressure is real and it comes from travellers who have spent a great deal to be there. Making the rule absolute is what protects the guide from having to argue it at 4,900 m.",
};

export const ACCLIMATISATION_POLICY: Policy = {
  id: "acclimatisation",
  title: "Acclimatisation",
  body: "Itineraries above 3,000 m carry rest days at altitude rather than at the bottom, and the sleeping altitude is what the schedule is built around — not the highest point of the day. Every departure page plots the sleeping altitude of every night, so you can see the profile before you book rather than discover it on day six.",
};

export const EQUIPMENT_AT_ALTITUDE: Policy = {
  id: "equipment",
  title: "What the group carries above 3,000 m",
  body: "PLACEHOLDER — the equipment list is operational data and will be published here once it is confirmed rather than described from memory. What is settled: the guide carries a means of summoning help that does not depend on mobile coverage, and a pulse oximeter used daily above 3,500 m.",
  note: "PLACEHOLDER. Do not publish without confirming against what is actually in the bag.",
};

export const RESCUE_COORDINATION: Policy = {
  id: "rescue",
  title: "Rescue coordination is an obligation we hold, not a service we sell",
  body: "We are not a rescue service. We hold no helicopter, employ no pilot and have no aircraft on standby. What we hold is the obligation to coordinate: to call it, to give the operator a position and a condition, to reach your insurer and your emergency contact, and to keep doing that until you are out. That obligation does not depend on whether your insurer has confirmed cover.",
  note: "Stated as an obligation rather than a service because operators routinely describe the second while providing the first, and a traveller cannot tell the difference until the day it matters.",
};

export const EVACUATION_COMMISSION: Policy = {
  id: "commission",
  title: "Evacuation commission",
  body: "PLACEHOLDER — pending. Helicopter evacuation in Nepal has a documented history of operators taking a commission on the flight, which creates an incentive to evacuate somebody who does not need it. Our position on this will be stated here in full, including whether we accept any payment from any operator, and it will be stated before it is asked for.",
  note: "PLACEHOLDER. This section must not ship vague.",
};

/* ---------------------------------------------------------- porter welfare */

export type PorterCommitment = {
  id: string;
  commitment: string;
  note?: string;
};

/**
 * Porter welfare, itemised.
 *
 * The International Porter Protection Group has published what porters
 * actually need for decades, and the reason it still needs publishing is that
 * the failures are ordinary rather than dramatic: a load that is too heavy, no
 * shelter at the pass, being sent down alone and unpaid after an injury.
 *
 * PLACEHOLDER weights and figures below are marked. The commitments are not
 * placeholders in kind — only in number.
 */
export const PORTER_WELFARE: PorterCommitment[] = [
  {
    id: "load",
    commitment:
      "PLACEHOLDER — a maximum load per porter, in kilograms, weighed at the trailhead rather than estimated. The figure goes here once set.",
    note: "PLACEHOLDER FIGURE PENDING.",
  },
  {
    id: "clothing",
    commitment:
      "Clothing and footwear adequate for the altitude the trip reaches, provided by us where the porter does not own it. A porter in trainers above the snow line is our failure, not theirs.",
  },
  {
    id: "shelter",
    commitment:
      "Shelter and a bed indoors every night of the trip, in the same settlement as the group. Not a dormitory floor at a lower village while the group sleeps higher.",
  },
  {
    id: "food",
    commitment: "Three meals a day, paid by us, at the lodge the group uses.",
  },
  {
    id: "medical",
    commitment:
      "The same access to medical care and evacuation as any traveller on the trip, at our cost, decided on the same medical grounds.",
  },
  {
    id: "insurance",
    commitment:
      "PLACEHOLDER — insurance covering the altitude the trip reaches, with the cover limit and the altitude ceiling published on the licences page once verified.",
    note: "PLACEHOLDER FIGURE PENDING.",
  },
  {
    id: "injury",
    commitment:
      "If a porter is injured they are treated, evacuated if needed, and paid for the whole trip they were engaged for. They are not sent down alone and they are not paid off at the point of injury.",
  },
];

export const IPPG_REFERENCE =
  "These commitments follow the guidelines published by the International Porter Protection Group, which is the reference we hold ourselves to and the one a traveller can check us against.";

/* ------------------------------------------------------------- incidents */

export const INCIDENT_REPORTING: Policy = {
  id: "incidents",
  title: "Incident reporting",
  body: "PLACEHOLDER — every incident involving injury, evacuation or a night not spent where the itinerary said will be recorded and the anonymised record published here annually. The format and the first period are not yet set.",
  note: "PLACEHOLDER. An operator publishing zero incidents is either very small or not counting.",
};

/* --------------------------------------------------------- what we do not */

/**
 * REQUIRED section. The one most operators omit.
 *
 * A safety page that only lists what a company does reads as a guarantee, and
 * a guarantee is precisely what nobody can give at altitude. These are the
 * limits, stated plainly, because a traveller who books believing the first
 * list is the whole story has been misled by omission.
 */
export const WHAT_WE_DO_NOT_DO: string[] = [
  "We are not a rescue service. We coordinate a rescue; we do not perform one, and we do not control how long a helicopter takes to arrive or whether weather allows it to fly at all.",
  "We carry no doctor. Our guides hold wilderness first aid, which is training to recognise a problem and to get somebody down — not to treat them.",
  "We cannot make altitude safe. Acclimatisation schedules reduce the risk of altitude illness and do not remove it. Fit young people get it; people who have been high before get it.",
  "We do not screen you medically. We tell you what the trip demands and what it reaches; deciding whether you should be there is between you and a doctor who knows your history.",
  "We do not control the weather, the flights, the roads or the lodges. What we control is what we do when those fail, and that is written into every departure's cost sheet as a contingency with a named cost and who pays it.",
  "We cannot guarantee a summit, a view, or a sighting. No operator can, and one that implies otherwise is telling you something about how they work.",
];
