/**
 * What a first-timer actually wants to know, and what operators do not show.
 *
 * ============================================================================
 * PLACEHOLDER PHOTOGRAPHY AND PLACEHOLDER DETAIL. Replace the image ids with
 * your own photographs and check every practicality against how you actually
 * run the trip before this site takes a booking.
 * ============================================================================
 *
 * Three things live here, and they exist for the same reason.
 *
 * GALLERY. Most operators publish summits. A person deciding whether to spend
 * two thousand dollars and twelve days of their life is not asking what the
 * mountain looks like — they have seen the mountain. They are asking what room
 * they are sleeping in and what is on the plate. So every departure must carry
 * at least one `accommodation` and one `food` image, and the guard fails
 * without them. "Teahouse" means nothing to somebody who has never been in one.
 *
 * PRACTICALITIES. Squat toilets, cold water above a certain height, paying to
 * charge a phone, no signal for days. All true, all normal, and all of it
 * routinely left for people to discover. Written plainly here, because a person
 * who knows what is coming copes with it and a person who does not feels lied
 * to.
 *
 * FAQS. The uncomfortable questions, answered before they are asked: what if I
 * cannot keep up, what if I do not get on with the group, what happens to my
 * money. An FAQ that only answers the easy ones is marketing with a chevron on
 * it.
 */

import type { Departure } from "./departures.ts";
import type { Focal } from "../lib/image-slots.ts";

export type GalleryImage = {
  /**
   * Absent until a photograph has been checked to show what the caption says.
   *
   * The first version of this file invented Unsplash ids from memory and used
   * them without looking at them. One was a house cat on a sofa, captioned as a
   * teahouse room. Others were a European apartment, a fine-dining plate, a
   * rock climber in Thailand and two African rhinos on a page about Nepal's
   * one-horned rhino.
   *
   * The cat was funny. The apartment was the actual problem: it is plausible,
   * so nobody catches it, and a photograph captioned as something it is not is
   * precisely the practice this company exists to argue against. An image with
   * no `src` renders as a captioned placeholder, which is honest about being
   * unfinished. A wrong photograph is not.
   */
  src?: string;
  alt: string;
  /**
   * Where to hold on when a crop has to lose something.
   *
   * Left unset the site keeps the middle of the frame, slightly high, which is
   * right for most photographs. Set it when the subject is at an edge — one
   * field, and it fixes the crop in every slot at once rather than per place.
   */
  focal?: Focal;
  /** Factual. What the traveller is looking at, not how to feel about it. */
  caption: string;
  category:
    "trail" | "accommodation" | "food" | "transport" | "people" | "landscape";
};

export type Practicalities = {
  accommodation: string;
  /**
   * How rooms are shared.
   *
   * Built per departure rather than stored, because it has to agree with
   * `singleSupplementUSD`. It previously said "unless you have taken the single
   * room option" on departures that have no such option and include a single
   * room in the price — three sections of one page contradicting each other
   * about the same thing.
   */
  roomSharing: string;
  toilets: string;
  showers: string;
  food: string;
  dietary: string;
  water: string;
  electricity: string;
  signal: string;
  luggage: string;
  laundry: string;
};

export type Faq = { question: string; answer: string };

/** Same swap-a-string pattern as the hero and the departure cards. */
const shot = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&h=1000&q=70`;

/**
 * Photographs that have been opened and looked at.
 *
 * Every id below was downloaded and viewed before it was used, and the note
 * says what is actually in the frame. Nothing goes in this object on the
 * strength of what an id sounds like it should be.
 *
 * Three of these are recognisably Nepal. The rest are honest about being
 * generic — a forest path is a forest path — and their captions say only what
 * the picture shows. None of them claims a place it is not.
 */
const VERIFIED = {
  /** Checked: curry and rice in metal bowls. */
  riceAndCurry: shot("photo-1585937421612-70a008356fbe"),
  /** Checked: fried egg, toast, bacon and tomato on a plate. */
  cookedBreakfast: shot("photo-1533089860892-a7c6f0a88666"),
  /** Checked: a stupa on a forested ridge below high snow peaks. Nepal. */
  stupaRidge: shot("photo-1544735716-392fe2489ffa"),
  /** Checked: a trekker standing at a cairn above a Himalayan valley. Nepal. */
  cairnTrekker: shot("photo-1526772662000-3f88f10405ff"),
  /** Checked: a coach parked at dusk below snow mountains. */
  nightCoach: shot("photo-1544620347-c4fd4a3d5957"),
  /** Checked: snow peaks standing above a sea of cloud at sunrise. */
  peaksAboveCloud: shot("photo-1506905925346-21bda4d32df4"),
  /** Checked: layered blue ridges fading into haze. */
  layeredRidges: shot("photo-1500534314209-a25ddb2bd429"),
  /** Checked: a dirt path through tall forest. */
  forestPath: shot("photo-1441974231531-c6227db76b6e"),
} as const;

/**
 * A slot with no photograph yet.
 *
 * Rendered as a captioned panel rather than filled with something approximate.
 * The caption is the part that matters here — it is what a first-timer is
 * actually reading — and it is true whether or not the picture behind it
 * exists.
 */
const pending = (
  category: GalleryImage["category"],
  caption: string,
): GalleryImage => ({ alt: "", caption, category });

/* --------------------------------------------------------------- galleries */

const TEAHOUSE_ROOM = pending(
  "accommodation",
  "A standard twin teahouse room: two beds, a thin mattress, a window, no heating. You sleep in the bag you carry.",
);

const TEAHOUSE_DINING = pending(
  "accommodation",
  "The dining room is the only heated room in the building and the stove is lit in the evening. Everyone sits in it until bed.",
);

const LODGE_ROOM = pending(
  "accommodation",
  "A lodge room with a private bathroom, a fan and a net over the bed. This is a hotel, not a teahouse.",
);

const PORTERS = pending(
  "people",
  "Porters carry a maximum of 20kg on our trips, which is below the legal limit and below what is common.",
);

const GUIDE_BRIEFING = pending(
  "people",
  "The morning briefing: the route, the weather, and the turnaround time for the day.",
);

const DAL_BHAT: GalleryImage = {
  src: VERIFIED.riceAndCurry,
  alt: "Rice with lentil and vegetable curry served in metal bowls.",
  caption:
    "Dal bhat: rice, lentil soup, a vegetable curry and pickle. Refills are free and it is what the guides eat twice a day.",
  category: "food",
};

const LODGE_BREAKFAST: GalleryImage = {
  src: VERIFIED.cookedBreakfast,
  alt: "A cooked breakfast of egg, toast, bacon and tomato on a plate.",
  caption:
    "Full board at the lodge. A cooked breakfast, dinner at the lodge, and a packed lunch on full days out.",
  category: "food",
};

const FOREST_PATH: GalleryImage = {
  src: VERIFIED.forestPath,
  alt: "A dirt path running through tall forest.",
  caption:
    "Long stretches of the lower route are forest walking on a made path, in shade, with no view out.",
  category: "trail",
};

const CAIRN: GalleryImage = {
  src: VERIFIED.cairnTrekker,
  alt: "A trekker standing beside a stone cairn above a Himalayan valley.",
  caption:
    "Cairns mark the line where the trail is faint. The guide walks in front of the group on any section like this.",
  category: "trail",
};

const COACH: GalleryImage = {
  src: VERIFIED.nightCoach,
  alt: "A coach parked at dusk below snow-covered mountains.",
  caption:
    "The long road transfers are by coach or private vehicle, with a seat each and a meal stop.",
  category: "transport",
};

const STUPA_RIDGE: GalleryImage = {
  src: VERIFIED.stupaRidge,
  alt: "A stupa on a forested ridge below high snow peaks.",
  caption:
    "A stupa on the ridge, with the high peaks behind it. Most of the walking days end somewhere like this.",
  category: "landscape",
};

export const GALLERIES: Record<string, GalleryImage[]> = {
  "everest-base-camp": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    TEAHOUSE_DINING,
    pending(
      "transport",
      "The aircraft that flies to Lukla. Sixteen seats, no toilet, thirty-five minutes when it goes.",
    ),
    pending(
      "trail",
      "One of five suspension bridges between Phakding and Namche. They move underfoot and they are the only way across.",
    ),
    PORTERS,
    STUPA_RIDGE,
  ],

  "annapurna-base-camp": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    pending(
      "trail",
      "The stone stairs above Chhomrong. Around 2,500 steps down, and the same back up on the return.",
    ),
    COACH,
    FOREST_PATH,
    GUIDE_BRIEFING,
    CAIRN,
  ],

  "annapurna-circuit": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    TEAHOUSE_DINING,
    pending(
      "transport",
      "The jeep sections. The road now runs a long way up both sides and we drive the parts that are no longer worth walking.",
    ),
    pending(
      "trail",
      "Manang at 3,540 m, where the itinerary stops for an acclimatisation day before the pass.",
    ),
    PORTERS,
    CAIRN,
  ],

  "langtang-valley": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    FOREST_PATH,
    pending(
      "transport",
      "The road to Syabrubesi. Seven hours, and genuinely poor for the last two.",
    ),
    pending(
      "trail",
      "Langtang village, rebuilt after the 2015 earthquake destroyed it. The memorial is on the trail.",
    ),
    CAIRN,
  ],

  "upper-mustang": [
    pending(
      "accommodation",
      "Guesthouse rooms north of Kagbeni. Thicker walls than a teahouse, and colder, because the wind does not stop.",
    ),
    DAL_BHAT,
    pending(
      "transport",
      "The Jomsom flight. Morning only — the valley wind closes the strip by about 11am most days.",
    ),
    pending(
      "trail",
      "Irrigated fields at Ghami. Everything green here is watered by hand from a channel.",
    ),
    pending(
      "landscape",
      "Lo Manthang at 3,840 m. The walled town is the reason the permit costs $500.",
    ),
    GUIDE_BRIEFING,
  ],

  "poon-hill": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    pending(
      "trail",
      "The Ulleri stairs. Around 3,300 steps in one climb, and the hardest ninety minutes of the trip.",
    ),
    COACH,
    FOREST_PATH,
    {
      src: VERIFIED.peaksAboveCloud,
      alt: "Snow peaks standing above a sea of cloud at sunrise.",
      caption:
        "Poon Hill at 3,210 m before sunrise. Clouded out roughly one morning in four outside the driest months.",
      category: "landscape",
    },
  ],

  "mardi-himal": [
    TEAHOUSE_ROOM,
    DAL_BHAT,
    pending(
      "trail",
      "The ridge below Low Camp. The trail follows one spur for two days with no side valleys.",
    ),
    pending(
      "accommodation",
      "High Camp has four lodges and no alternative within two hours, so we book ahead and send a porter up early.",
    ),
    GUIDE_BRIEFING,
    CAIRN,
  ],

  "chitwan-safari": [
    LODGE_ROOM,
    LODGE_BREAKFAST,
    pending(
      "transport",
      "Two jeep drives inside the park with a licensed naturalist. Open sided, and dusty in the dry season.",
    ),
    pending(
      "trail",
      "The Rapti river. The canoe stretch is a dugout, sitting low, about forty minutes.",
    ),
    pending(
      "landscape",
      "Greater one-horned rhino, which is a different animal from the African species. Commonly seen at Chitwan; nothing is promised.",
    ),
    pending(
      "people",
      "Walking inside the park is done with a park guard, which the park requires.",
    ),
  ],

  "bardia-wildlife": [
    LODGE_ROOM,
    LODGE_BREAKFAST,
    pending(
      "transport",
      "The Nepalgunj flight. Bardia is a fifteen-hour drive otherwise, which is why this costs more than Chitwan.",
    ),
    pending(
      "trail",
      "The Karnali. Much of the tiger tracking is sitting still beside water and waiting.",
    ),
    pending(
      "trail",
      "Sal forest on foot with an armed park guard. Full days, and often nothing seen.",
    ),
    pending(
      "people",
      "Groups are capped at eight here. Bardia's tiger sighting rate is roughly one trip in three.",
    ),
  ],

  "kathmandu-valley-rim": [
    pending(
      "accommodation",
      "Hotel and lodge rooms on the rim. Private bathroom, hot shower, heating in winter.",
    ),
    LODGE_BREAKFAST,
    pending(
      "trail",
      "Terraces below the Shivapuri rim. The walking is on farm tracks and footpaths, not mountain trail.",
    ),
    pending(
      "trail",
      "Bhaktapur. The heritage entry is included, so there is nothing to pay at the gate.",
    ),
    {
      src: VERIFIED.layeredRidges,
      alt: "Layered ridges fading into haze.",
      caption:
        "The rim at Nagarkot. From late December to March the valley air is often thick enough to lose the view entirely.",
      category: "landscape",
    },
    GUIDE_BRIEFING,
  ],
};

/* ---------------------------------------------------------- practicalities */

const TEAHOUSE_PRACTICALITIES: Practicalities = {
  accommodation:
    "Teahouses: family-run lodges with plywood-walled rooms, two single beds and a window. No heating in the rooms. The dining room has a stove lit in the evening and is the only warm room in the building.",
  roomSharing:
    "Twin share with someone of the same sex from the group unless you have taken the single room option. On the two or three busiest nights high on the route there may be no single available at any price, and you are not charged for those nights.",
  toilets:
    "Mixed. Lower down most lodges have a Western seat; above roughly 3,500 m expect a squat toilet, often outside the building, sometimes shared between twenty people. Bring your own paper — it is not provided and it is not flushed, it goes in the bin.",
  showers:
    "A hot shower is available most nights below 4,000 m and costs $3–6, paid to the lodge. Above that it is a bucket of warm water if anything. Most people wash properly every third day and use wet wipes in between.",
  food: "Dal bhat twice a day is the reliable choice and refills are free. Menus also carry fried rice, noodles, potatoes, soup, porridge and eggs. The higher you go the smaller the menu and the higher the price, because everything arrives on a porter's back or a mule.",
  dietary:
    "Vegetarian is easy and normal — most of the food is vegetarian anyway. Vegan is workable with notice. Gluten-free is difficult above the road head and we will tell you honestly what you can expect rather than promising it. Tell us at booking, not on day one.",
  water:
    "We provide treated water at every stop, either boiled or filtered and chemically treated. Do not drink untreated tap or stream water. Bottled water is sold and we ask you not to buy it: there is no way to remove the plastic from the valley.",
  electricity:
    "Charging is available at most lodges and it usually costs money once you are above about 3,000 m — $2–4 an hour is normal. Plugs are shared and there may be one socket for the room. Bring a power bank; it is cheaper and it works when the lodge solar does not.",
  signal:
    "Patchy. Ncell and NTC cover parts of the main valleys and there are stretches of a day or more with nothing. Lodge wifi exists higher up and is sold by the hour or by the device, usually $3–5, and is often too slow to load a photograph.",
  luggage:
    "One duffel of up to 12kg carried by a porter, plus a day pack you carry yourself with water, layers and camera. Anything beyond 12kg stays in the hotel store in Kathmandu at no charge. The 20kg porter cap is per porter, not per trekker.",
  laundry:
    "Nothing dependable on the trail. Some lower lodges will wash clothes for a fee and there is no guarantee it dries. Plan on hand-washing socks and underwear in a sink and carrying enough of everything else.",
};

export const PRACTICALITIES: Record<string, Practicalities> = {
  "everest-base-camp": {
    ...TEAHOUSE_PRACTICALITIES,
    toilets:
      "Western seats as far as Namche. From Tengboche upward expect squat toilets, frequently outside the building and shared. At Gorak Shep they are basic and cold. Bring your own paper; it goes in the bin, not down the pan.",
    showers:
      "Hot showers to Dingboche at $4–6, paid to the lodge. At Lobuche and Gorak Shep there is no shower worth the name. Most people last wash at Dingboche and go four days without.",
    electricity:
      "Charging costs $2–5 an hour above Namche and is metered by the lodge. Cold flattens batteries fast, so a power bank is not optional at this altitude.",
  },
  "annapurna-base-camp": TEAHOUSE_PRACTICALITIES,
  "annapurna-circuit": {
    ...TEAHOUSE_PRACTICALITIES,
    signal:
      "Better than most treks — the road brought towers with it. Expect coverage in Chame, Pisang and Manang, and nothing for the day either side of Thorong La.",
  },
  "langtang-valley": TEAHOUSE_PRACTICALITIES,
  "upper-mustang": {
    ...TEAHOUSE_PRACTICALITIES,
    accommodation:
      "Guesthouses rather than teahouses: thicker mud-brick walls, small windows, and colder rooms than the Annapurna trails because the wind does not stop. Rooms are twin, plain, and clean.",
    water:
      "Treated water provided at every stop. Water is scarce here in a way it is not elsewhere in Nepal — villages irrigate by hand from a single channel, so do not run taps.",
    signal:
      "Almost none north of Kagbeni. Assume you are uncontactable for the middle week of the trip and tell people at home before you go.",
  },
  "poon-hill": {
    ...TEAHOUSE_PRACTICALITIES,
    toilets:
      "Mostly Western seats on this route — it is low and well-travelled. A squat toilet at one or two of the lodges. Bring your own paper.",
    luggage:
      "One duffel of up to 12kg carried by a porter shared between three trekkers, plus your own day pack.",
  },
  "mardi-himal": {
    ...TEAHOUSE_PRACTICALITIES,
    accommodation:
      "Teahouses low down, and small ridge lodges at Low and High Camp with four or five rooms each. High Camp is basic: plywood, no heating, and everything carried up one spur.",
    water:
      "Treated water provided. Above Low Camp water is carried up, so it is rationed and there is no shower.",
  },
  "chitwan-safari": {
    accommodation:
      "A lodge at Sauraha with private rooms, en-suite bathrooms, fans and mosquito nets. This is a hotel, not a teahouse.",
    roomSharing:
      "Twin share unless you have taken the single room option, which is always available here.",
    toilets:
      "Western, en-suite, in your own room. Flushing, with paper provided.",
    showers: "Hot shower in your own bathroom every day.",
    food: "Full board at the lodge. Buffet breakfast and dinner with Nepali and Western options, and a packed lunch on full days in the park.",
    dietary:
      "Vegetarian, vegan and most allergies are straightforward here — it is a lodge kitchen with a supply chain. Tell us at booking.",
    water:
      "Filtered drinking water provided at the lodge and in the jeeps. Do not drink from the river.",
    electricity:
      "Mains power in the room at no charge. Cuts happen; the lodge has a generator.",
    signal:
      "Good mobile coverage at the lodge and in Sauraha. Wifi included, and it works well enough for messages rather than video.",
    luggage:
      "No limit beyond what fits in the vehicle. There are no porters on this trip and you carry nothing.",
    laundry: "Same-day laundry at the lodge for a small fee.",
  },
  "bardia-wildlife": {
    accommodation:
      "A lodge at Thakurdwara with private rooms, en-suite bathrooms and mosquito nets. Simpler than Chitwan and much quieter.",
    roomSharing:
      "Twin share unless you have taken the single room option, which is always available here.",
    toilets:
      "Western, en-suite, in your own room, with paper provided. There are no toilets inside the park, so a full day out means the forest and a trowel.",
    showers:
      "Solar hot water in your own bathroom. Late afternoon is warmest; early morning can be cold enough to skip.",
    food: "Full board at the lodge, mostly Nepali home cooking. Packed lunch on full days in the park.",
    dietary:
      "Vegetarian and vegan are straightforward. Bardia is remote, so unusual requirements need notice at booking to be bought in.",
    water:
      "Filtered drinking water provided at the lodge and carried on park days.",
    electricity:
      "Mains power with regular cuts, backed by solar. Charging is free. Bring a power bank for park days.",
    signal:
      "Mobile coverage at the lodge, weak to none inside the park. Wifi is slow and sometimes down for a day.",
    luggage:
      "No limit beyond what fits in the vehicle. No porters on this trip.",
    laundry: "Laundry at the lodge for a small fee, dried in the sun.",
  },
  "kathmandu-valley-rim": {
    accommodation:
      "Hotels and rim lodges with private rooms and en-suite bathrooms. Heating in winter. This is not a teahouse trip.",
    roomSharing:
      "Twin share unless you have taken the single room option, which is available every night on this trip.",
    toilets: "Western, en-suite, in your own room, every night.",
    showers: "Hot shower in your own bathroom every day.",
    food: "Breakfast every day and lunch on walking days, at the hotels and at tea shops on the route. Dinners in Kathmandu are not included, because you will want to choose.",
    dietary:
      "Straightforward — you are in and around a capital city with real kitchens. Tell us at booking.",
    water:
      "Filtered water provided each morning. Do not drink Kathmandu tap water at any point.",
    electricity: "Mains power in the room at no charge, with occasional cuts.",
    signal: "Full coverage throughout. Wifi at every hotel, included.",
    luggage:
      "No limit — the vehicle carries it between hotels. You carry a day pack with water and a layer.",
    laundry: "Same-day laundry in Kathmandu and Dhulikhel for a small fee.",
  },
};

/* ----------------------------------------------------------------- faqs */

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

/**
 * One sentence, ending in exactly one full stop.
 *
 * Joining two stored fields produced "on the same ground.. Five walking days" —
 * the terrain string already ends in a stop and the template added another.
 * Every template that concatenates stored prose goes through here.
 */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Built per departure, not per trek.
 *
 * The answers quote this date's price, this date's supplement and this date's
 * minimum, so an FAQ can never drift out of step with the cost sheet on the
 * same page. `check:departures` re-reads the numbers out of the answers and
 * fails if any of them contradicts the departure.
 */
/**
 * The room-sharing sentence, derived from the supplement.
 *
 * `hasSingleOption` is the single fact everything about single rooms comes
 * from: the practicalities line, the optional extra, and the FAQ answer.
 */
export function roomSharingLine(d: Departure, teahouse: boolean): string {
  if (d.singleSupplementUSD > 0) {
    return teahouse
      ? "Twin share with someone of the same sex from the group unless you take the single room option. On the two or three busiest nights high on the route there may be no single available at any price, and you are not charged for those nights."
      : "Twin share with someone of the same sex from the group unless you take the single room option, which is available every night on this trip.";
  }
  return teahouse
    ? "Twin share with someone of the same sex from the group. There is no single supplement on this departure — where the accommodation has a single room you get one at no extra cost, and on the busiest nights high on the route nobody does."
    : "Twin share with someone of the same sex from the group. There is no single supplement on this departure — a single room is included in the price where the accommodation has one.";
}

/** Whether this trek sleeps in teahouses rather than lodges or hotels. */
export function isTeahouseTrek(trekId: string): boolean {
  return ![
    "chitwan-safari",
    "bardia-wildlife",
    "kathmandu-valley-rim",
  ].includes(trekId);
}

export function buildFaqs(d: Departure): Faq[] {
  const single = d.costSheet.optionalExtras.find((e) => e.id === "single-room");
  const teahouse = isTeahouseTrek(d.trekId);

  return [
    {
      question: "What if I cannot keep up?",
      answer: `The group walks at the pace of its slowest member, and the itinerary is built with enough hours in the day that this is normal rather than a crisis. If you are consistently behind, the assistant guide walks with you and the rest go ahead to the next stop — nobody is left alone and nobody is hurried. If it becomes clear the route is beyond you, we take you down and you keep the guide. We do not charge extra for any of that.`,
    },
    {
      question: "What if I get altitude sickness?",
      answer:
        d.maxAltitudeM >= 3000
          ? `The guide checks symptoms daily and carries a pulse oximeter. Mild symptoms are common and usually pass with a rest day. If the guide decides you must descend, that decision is final and is not negotiable at any price — an assistant guide goes down with you so the group continues. Descent on foot, the escort and your accommodation lower down are ours. A helicopter evacuation, if a doctor calls for one, is billed to your insurer, which is why the cover on this page is mandatory. We take no commission on evacuations.`
          : `This trip reaches ${d.maxAltitudeM.toLocaleString("en-GB")} m, which is below the altitude at which altitude sickness is a normal concern. The guide still checks how everybody is each day.`,
    },
    {
      question: "What if I do not get on with the group?",
      answer: `It happens, and on a ${d.days}-day trip it matters. Groups on this date are capped at ${d.groupSizeMax}, so it is small enough that you are not lost in it and small enough that one difficult person is noticeable. Say something to the guide early — they deal with this more often than you would think and would rather hear it on day two than day eight. You are not obliged to walk beside anyone, and meals are the only fixed group time.`,
    },
    {
      question: "Can I leave early, and what does it cost?",
      answer: `Yes. Tell the guide, and we arrange the way out — which on this route means ${
        d.trekId === "everest-base-camp"
          ? "walking down to Lukla and flying, or a helicopter if you are in a hurry"
          : "a vehicle from the nearest road head"
      }. The cost of getting out is yours unless you are leaving on the guide's medical advice, in which case it is ours. There is no refund of the unused part of the trip: the permits are bought, the beds are booked and the staff are paid whether you finish or not. We would rather say that plainly than imply otherwise.`,
    },
    {
      question: "Who is my guide, and can I see their licence?",
      answer: `You are told your guide's name and licence number once the departure is guaranteed, and you can ask for it earlier. Every guide on this trip holds a current Nepal Academy of Tourism and Hotel Management licence and a wilderness first aid certificate, both of which we will show you. This departure runs at ${d.guideRatio}${d.assistantGuideAbove ? `, with a second guide above ${d.assistantGuideAbove.toLocaleString("en-GB")} m` : ""}.`,
    },
    {
      question: "Can I have a single room, and what does it cost?",
      answer: single
        ? `Yes, for ${money(single.amountUSD)} for the whole trip. ${
            teahouse
              ? "On the busiest nights high on the route there may be no single room available at any price, and you are not charged for those nights."
              : "It is available every night on this trip."
          }`
        : `There is no single supplement on this departure — a single room is included in the ${money(d.priceUSD)} where the accommodation has one.`,
    },
    {
      question: "What age and fitness should I expect on this date?",
      answer: `We do not screen by age and we do not publish other travellers' details. What we can say about this departure: it is ${d.difficulty}, walking ${d.physicalDemand.walkingHoursPerDay} hours a day for ${d.physicalDemand.consecutiveDays} consecutive days. ${sentence(d.physicalDemand.terrain)} ${sentence(d.physicalDemand.preparationNote)} Groups on this kind of trip usually run from late twenties to sixties, with most people in their thirties and forties.`,
    },
    {
      question: "What happens to my money if I cancel?",
      answer: `Our cancellation terms are published in full and not summarised here in a way that could differ from them. What is specific to this date: if we cancel because the departure does not reach ${d.minimumToRun} bookings by ${d.decisionDate}, you get the full ${money(d.priceUSD)} back — the whole amount you paid us, not a credit note — or you move to another date at the same price. If you cancel, the amount you get back depends on how close to departure it is, because the permits and flights are bought in advance and are not refundable to us either.`,
    },
    {
      question: "What happens if the departure does not fill?",
      answer: `We tell you on ${d.decisionDate}, which is ${Math.round((new Date(d.departsOn).getTime() - new Date(d.decisionDate).getTime()) / 86400000)} days before departure, and not later. You then choose a full refund, a transfer to another date at the same price, or running as a smaller group at the same price if we can staff it. The money for that refund is held against this departure rather than pooled, and it is a line in the cost sheet on this page.`,
    },
    {
      question: "Is the price on this page really what I pay?",
      answer: `Yes. ${money(d.priceUSD)} covers everything in the cost sheet above, which itemises where every dollar of it goes, and there is nothing to pay on arrival. What is not included is listed with estimates, and the optional extras are priced separately and are genuinely optional. ${
        single
          ? `The only other thing we would charge you is the ${money(single.amountUSD)} single room, if you want one.`
          : "There is nothing else we would charge you."
      }`,
    },
    {
      question: "How fit do I actually need to be?",
      answer: `Fit enough to walk ${d.physicalDemand.walkingHoursPerDay} hours a day, ${d.physicalDemand.consecutiveDays} days running, carrying only a day pack. ${sentence(d.physicalDemand.preparationNote)} This is not a technical trip — there is no climbing, no rope and no equipment to learn. The people who struggle are usually the ones who did no hill walking beforehand rather than the ones who are not athletic.`,
    },
    {
      question: "Do I need to tip, and how much?",
      answer: `Tipping is customary in Nepal and it is not included in the price. We do not collect it, we do not add it to an invoice, and no member of staff will ask you for it. Groups on a trip this length commonly give ${money(d.costSheet.tipping.typicalRangeUSD[0])}–${money(d.costSheet.tipping.typicalRangeUSD[1])} per person in total, pooled and divided between the guides and porters at the end.`,
    },
  ];
}
