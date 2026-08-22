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

export type GalleryImage = {
  src: string;
  alt: string;
  /** Factual. What the traveller is looking at, not how to feel about it. */
  caption: string;
  category:
    "trail" | "accommodation" | "food" | "transport" | "people" | "landscape";
};

export type Practicalities = {
  accommodation: string;
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
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=900&q=70`;

/* --------------------------------------------------------------- galleries */

const IMG = {
  teahouseRoom: shot("photo-1518791841217-8f162f1e1131"),
  dalBhat: shot("photo-1585937421612-70a008356fbe"),
  teahouseDining: shot("photo-1414235077428-338989a2e8c0"),
  lodgeRoom: shot("photo-1522708323590-d24dbb6b0267"),
  breakfast: shot("photo-1533089860892-a7c6f0a88666"),
  jeep: shot("photo-1533473359331-0135ef1b58bf"),
  bus: shot("photo-1544620347-c4fd4a3d5957"),
  planeSmall: shot("photo-1436491865332-7a61a109cc05"),
  suspensionBridge: shot("photo-1544735716-392fe2489ffa"),
  trailStone: shot("photo-1551632811-561732d1e306"),
  porters: shot("photo-1522163182402-834f871fd851"),
  guideGroup: shot("photo-1517457373958-b7bdd4587205"),
  prayerFlags: shot("photo-1526772662000-3f88f10405ff"),
  ridgeMorning: shot("photo-1464822759023-fed622ff2c3b"),
  village: shot("photo-1544735716-392fe2489ffa"),
  terraces: shot("photo-1470071459604-3b5ec3a7fe05"),
  forestTrail: shot("photo-1441974231531-c6227db76b6e"),
  riverGrass: shot("photo-1500534314209-a25ddb2bd429"),
  rhino: shot("photo-1547970810-dc1eac37d174"),
  sunriseHills: shot("photo-1506905925346-21bda4d32df4"),
} as const;

/**
 * The shared spine of every gallery.
 *
 * Accommodation and food first, because they answer the questions people are
 * too embarrassed to ask. The scenery is last, which is the opposite of how
 * this is normally ordered and the point.
 */
function baseGallery(opts: {
  room: string;
  roomAlt: string;
  roomCaption: string;
  meal: string;
  mealAlt: string;
  mealCaption: string;
}): GalleryImage[] {
  return [
    {
      src: opts.room,
      alt: opts.roomAlt,
      caption: opts.roomCaption,
      category: "accommodation",
    },
    {
      src: opts.meal,
      alt: opts.mealAlt,
      caption: opts.mealCaption,
      category: "food",
    },
  ];
}

const TEAHOUSE_ROOM = {
  room: IMG.teahouseRoom,
  roomAlt: "A twin teahouse room with two single beds and a small window.",
  roomCaption:
    "A standard twin teahouse room. Two beds, a thin mattress, a window, no heating. You sleep in the bag you carry.",
};

const DAL_BHAT = {
  meal: IMG.dalBhat,
  mealAlt: "A metal plate of rice, lentil soup, curried vegetables and pickle.",
  mealCaption:
    "Dal bhat: rice, lentil soup, a vegetable curry and pickle. Refills are free and it is what the guides eat twice a day.",
};

export const GALLERIES: Record<string, GalleryImage[]> = {
  "everest-base-camp": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.teahouseDining,
      alt: "A teahouse dining room with benches around a central stove.",
      caption:
        "The dining room is the only heated room in the building, and the stove is lit in the evening. Everyone sits in it until bed.",
      category: "accommodation",
    },
    {
      src: IMG.planeSmall,
      alt: "A small twin-propeller aircraft on a mountain airstrip.",
      caption:
        "The aircraft that flies to Lukla. Sixteen seats, no toilet, thirty-five minutes when it goes.",
      category: "transport",
    },
    {
      src: IMG.suspensionBridge,
      alt: "A steel suspension bridge hung with prayer flags over a gorge.",
      caption:
        "One of five suspension bridges between Phakding and Namche. They move underfoot and they are the only way across.",
      category: "trail",
    },
    {
      src: IMG.porters,
      alt: "Porters carrying loads on a stone trail.",
      caption:
        "Porters carry a maximum of 20kg on this trip, which is below the legal limit and below what is common.",
      category: "people",
    },
    {
      src: IMG.prayerFlags,
      alt: "Prayer flags strung across a high ridge with peaks behind.",
      caption:
        "The ridge above Namche at around 3,800 m. Most groups walk this twice, once on an acclimatisation day.",
      category: "landscape",
    },
  ],

  "annapurna-base-camp": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.trailStone,
      alt: "A stone staircase climbing through terraced hillside.",
      caption:
        "The stone stairs above Chhomrong. Around 2,500 steps down and then the same back up on the return.",
      category: "trail",
    },
    {
      src: IMG.bus,
      alt: "A tourist coach on a hill road.",
      caption:
        "The Kathmandu to Pokhara coach. Seven hours, one meal stop, a seat each.",
      category: "transport",
    },
    {
      src: IMG.forestTrail,
      alt: "A path through dense rhododendron forest.",
      caption:
        "Rhododendron forest between Bamboo and Deurali. In leech season the guides carry salt.",
      category: "trail",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide talking to a small group beside a trail.",
      caption:
        "The morning briefing. Route, weather, and the turnaround time for the day.",
      category: "people",
    },
    {
      src: IMG.ridgeMorning,
      alt: "The Annapurna sanctuary rim at first light.",
      caption:
        "The sanctuary at first light, 4,130 m. Most groups are here for one morning.",
      category: "landscape",
    },
  ],

  "annapurna-circuit": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.teahouseDining,
      alt: "A teahouse dining room with benches around a central stove.",
      caption:
        "Dining rooms on the circuit are large and shared with every other group in the village.",
      category: "accommodation",
    },
    {
      src: IMG.jeep,
      alt: "A four-wheel-drive vehicle on a rough mountain road.",
      caption:
        "The jeep sections. The road now runs a long way up both sides and we drive the parts that are no longer worth walking.",
      category: "transport",
    },
    {
      src: IMG.village,
      alt: "A stone village below high peaks.",
      caption:
        "Manang at 3,540 m, where the itinerary stops for an acclimatisation day before the pass.",
      category: "trail",
    },
    {
      src: IMG.porters,
      alt: "Porters on a high trail.",
      caption:
        "Loads are capped at 20kg and split between porters rather than piled on one.",
      category: "people",
    },
    {
      src: IMG.prayerFlags,
      alt: "Prayer flags at a high pass.",
      caption:
        "Thorong La, 5,416 m. Crossed before dawn because the wind rises through the morning.",
      category: "landscape",
    },
  ],

  "langtang-valley": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.forestTrail,
      alt: "A trail through mossy forest beside a river.",
      caption:
        "The lower valley below Lama Hotel. Two days of forest before the valley opens.",
      category: "trail",
    },
    {
      src: IMG.jeep,
      alt: "A vehicle on a rough hill road.",
      caption:
        "The road to Syabrubesi. Seven hours, and genuinely poor for the last two.",
      category: "transport",
    },
    {
      src: IMG.village,
      alt: "A rebuilt stone village on a valley floor.",
      caption:
        "Langtang village, rebuilt after the 2015 earthquake destroyed it. The memorial is on the trail.",
      category: "trail",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide with a small group on a valley trail.",
      caption: "Groups here are small. This trek runs at one guide to four.",
      category: "people",
    },
    {
      src: IMG.ridgeMorning,
      alt: "A glaciated valley head under morning light.",
      caption:
        "The valley head above Kyanjin Gompa, 3,870 m. The high point is walked from here and back the same day.",
      category: "landscape",
    },
  ],

  "upper-mustang": [
    ...baseGallery({
      room: IMG.lodgeRoom,
      roomAlt: "A simple guesthouse room with two beds and whitewashed walls.",
      roomCaption:
        "Guesthouse rooms north of Kagbeni. Thicker walls than a teahouse, and colder, because the wind does not stop.",
      ...DAL_BHAT,
    }),
    {
      src: IMG.planeSmall,
      alt: "A small aircraft on a valley airstrip.",
      caption:
        "The Jomsom flight. Morning only — the valley wind closes the strip by about 11am most days.",
      category: "transport",
    },
    {
      src: IMG.terraces,
      alt: "Irrigated barley fields against bare hillsides.",
      caption:
        "Irrigated fields at Ghami. Everything green here is watered by hand from a channel.",
      category: "trail",
    },
    {
      src: IMG.village,
      alt: "A walled town on a high desert plateau.",
      caption:
        "Lo Manthang, 3,840 m. The walled town is the reason the permit costs $500.",
      category: "landscape",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide and travellers outside a monastery wall.",
      caption:
        "Several gompas charge a photography fee at the door, paid on the spot to the monastery.",
      category: "people",
    },
  ],

  "poon-hill": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.trailStone,
      alt: "A long stone staircase climbing through forest.",
      caption:
        "The Ulleri stairs. Around 3,300 steps in one climb, and the hardest ninety minutes of the trip.",
      category: "trail",
    },
    {
      src: IMG.bus,
      alt: "A tourist coach on a hill road.",
      caption: "Kathmandu to Pokhara by coach. Seven hours each way.",
      category: "transport",
    },
    {
      src: IMG.sunriseHills,
      alt: "Layered ridges under early light.",
      caption:
        "Poon Hill at 3,210 m before sunrise. Clouded out roughly one morning in four outside the driest months.",
      category: "landscape",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide with a small group at a trail junction.",
      caption: "One guide to six on this trek, and a porter to every three.",
      category: "people",
    },
    {
      src: IMG.forestTrail,
      alt: "A path through rhododendron forest.",
      caption:
        "The forest between Ghorepani and Tadapani, which flowers in late March and April.",
      category: "trail",
    },
  ],

  "mardi-himal": [
    ...baseGallery({ ...TEAHOUSE_ROOM, ...DAL_BHAT }),
    {
      src: IMG.forestTrail,
      alt: "A narrow ridge path through moss and rhododendron.",
      caption:
        "The ridge below Low Camp. The trail follows one spur for two days with no side valleys.",
      category: "trail",
    },
    {
      src: IMG.jeep,
      alt: "A jeep at a hill trailhead.",
      caption: "The jeep from Pokhara to the trailhead, both directions.",
      category: "transport",
    },
    {
      src: IMG.teahouseDining,
      alt: "A small dining room in a ridge lodge.",
      caption:
        "High Camp has four lodges and no alternative within two hours, so we book ahead and send a porter up early.",
      category: "accommodation",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide pointing out a route from a ridge.",
      caption:
        "One guide to six, with an assistant for the two days spent high.",
      category: "people",
    },
    {
      src: IMG.ridgeMorning,
      alt: "A high viewpoint under morning cloud.",
      caption:
        "The high point at 4,500 m, walked from High Camp and back before the cloud comes up.",
      category: "landscape",
    },
  ],

  "chitwan-safari": [
    ...baseGallery({
      room: IMG.lodgeRoom,
      roomAlt: "A lodge room with a double bed, fan and mosquito net.",
      roomCaption:
        "Lodge rooms at Sauraha. Private bathroom, hot water, fan, and a net over the bed.",
      meal: IMG.breakfast,
      mealAlt: "A buffet breakfast laid out on a table.",
      mealCaption:
        "Full board at the lodge. Buffet breakfast and dinner, packed lunch on park days.",
    }),
    {
      src: IMG.jeep,
      alt: "An open safari jeep on a forest track.",
      caption:
        "Two jeep drives inside the park with a licensed naturalist. Open sided, and dusty in the dry season.",
      category: "transport",
    },
    {
      src: IMG.riverGrass,
      alt: "A slow river running between grassland and forest.",
      caption:
        "The Rapti river. The canoe stretch is a dugout, sitting low, about forty minutes.",
      category: "trail",
    },
    {
      src: IMG.rhino,
      alt: "A one-horned rhinoceros standing in tall grass.",
      caption:
        "Greater one-horned rhino. Commonly seen at Chitwan; nothing is promised.",
      category: "landscape",
    },
    {
      src: IMG.guideGroup,
      alt: "A naturalist talking to a small group at the park edge.",
      caption:
        "Walking inside the park is done with a park guard, which the park requires.",
      category: "people",
    },
  ],

  "bardia-wildlife": [
    ...baseGallery({
      room: IMG.lodgeRoom,
      roomAlt: "A simple lodge room with a bed, net and shuttered window.",
      roomCaption:
        "Lodge rooms at Thakurdwara. Private bathroom, solar hot water, and a net over the bed.",
      meal: IMG.breakfast,
      mealAlt: "A plate of rice, dal and vegetables at a lodge table.",
      mealCaption:
        "Full board at the lodge, mostly Nepali. Packed lunch on full days in the park.",
    }),
    {
      src: IMG.planeSmall,
      alt: "A propeller aircraft at a regional airport.",
      caption:
        "The Nepalgunj flight. Bardia is a fifteen-hour drive otherwise, which is why this costs more than Chitwan.",
      category: "transport",
    },
    {
      src: IMG.riverGrass,
      alt: "A wide river channel with grassland beyond.",
      caption:
        "The Karnali. Much of the tiger tracking is sitting still beside water and waiting.",
      category: "trail",
    },
    {
      src: IMG.forestTrail,
      alt: "A track through sal forest.",
      caption:
        "Sal forest on foot with an armed park guard. Full days, and often nothing seen.",
      category: "trail",
    },
    {
      src: IMG.guideGroup,
      alt: "A naturalist and a small group at the forest edge.",
      caption:
        "Groups are capped at eight here. Bardia's tiger sighting rate is roughly one trip in three.",
      category: "people",
    },
  ],

  "kathmandu-valley-rim": [
    ...baseGallery({
      room: IMG.lodgeRoom,
      roomAlt: "A hotel room with two beds and a window onto hills.",
      roomCaption:
        "Hotel and lodge rooms on the rim. Private bathroom, hot shower, heating in winter.",
      meal: IMG.breakfast,
      mealAlt: "Breakfast on a terrace table.",
      mealCaption:
        "Breakfast every day and lunch on walking days. Dinners in Kathmandu are yours to choose.",
    }),
    {
      src: IMG.terraces,
      alt: "Terraced fields falling away from a ridge path.",
      caption:
        "Terraces below the Shivapuri rim. The walking is on farm tracks and footpaths, not mountain trail.",
      category: "trail",
    },
    {
      src: IMG.village,
      alt: "Brick and timber buildings around a temple square.",
      caption:
        "Bhaktapur. The heritage entry is included, so there is nothing to pay at the gate.",
      category: "trail",
    },
    {
      src: IMG.sunriseHills,
      alt: "Layered hills under morning haze.",
      caption:
        "The rim at Nagarkot. From late December to March the valley air is often thick enough to lose the view entirely.",
      category: "landscape",
    },
    {
      src: IMG.guideGroup,
      alt: "A guide with a group on a ridge track.",
      caption:
        "One guide to eight on this trip, and no porters — you carry a day pack.",
      category: "people",
    },
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
    "Charging is available at most lodges and it usually costs money — $2–4 an hour above Namche or equivalent. Plugs are shared and there may be one socket for the room. Bring a power bank; it is cheaper and it works when the lodge solar does not.",
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
 * Built per departure, not per trek.
 *
 * The answers quote this date's price, this date's supplement and this date's
 * minimum, so an FAQ can never drift out of step with the cost sheet on the
 * same page. `check:departures` re-reads the numbers out of the answers and
 * fails if any of them contradicts the departure.
 */
export function buildFaqs(d: Departure): Faq[] {
  const single = d.costSheet.optionalExtras.find((e) => e.id === "single-room");
  const teahouse = [
    "chitwan-safari",
    "bardia-wildlife",
    "kathmandu-valley-rim",
  ].includes(d.trekId)
    ? false
    : true;

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
      answer: `We do not screen by age and we do not publish other travellers' details. What we can say about this departure: it is ${d.difficulty}, walking ${d.physicalDemand.walkingHoursPerDay} a day for ${d.physicalDemand.consecutiveDays} consecutive days on ${d.physicalDemand.terrain}. ${d.physicalDemand.preparationNote} Groups on this kind of trip usually run from late twenties to sixties, with most people in their thirties and forties.`,
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
      answer: `Fit enough to walk ${d.physicalDemand.walkingHoursPerDay} a day, ${d.physicalDemand.consecutiveDays} days running, carrying only a day pack. ${d.physicalDemand.preparationNote} This is not a technical trip — there is no climbing, no rope and no equipment to learn. The people who struggle are usually the ones who did no hill walking beforehand rather than the ones who are not athletic.`,
    },
    {
      question: "Do I need to tip, and how much?",
      answer: `Tipping is customary in Nepal and it is not included in the price. We do not collect it, we do not add it to an invoice, and no member of staff will ask you for it. Groups on a trip this length commonly give ${money(d.costSheet.tipping.typicalRangeUSD[0])}–${money(d.costSheet.tipping.typicalRangeUSD[1])} per person in total, pooled and divided between the guides and porters at the end.`,
    },
  ];
}
