/**
 * The evergreen layer: a trek as a route, not as a date.
 *
 * ============================================================================
 * PLACEHOLDER CONTENT. Every seasonality note, comparison and disqualifier
 * needs checking against how you actually run these trips before launch.
 * ============================================================================
 *
 * A departure page answers "should I book 14 October". It will never rank for
 * "Everest Base Camp trek" and it cannot answer "which Nepal trek should I do",
 * because it is one date and the question is about a route. These pages are the
 * other half: the thing somebody finds in a search, and the thing an assistant
 * quotes when asked to compare.
 *
 * WHY THIS FILE IS NOT `treks.ts`
 *
 * `treks.ts` already exists and holds the operational profile — itinerary,
 * altitudes, physical demand, guide ratios. It is read by the cost sheet, the
 * altitude profile, the route map and three guards. Merging twelve months of
 * seasonality and a set of comparisons into it would make one file that two
 * unrelated jobs both depend on. The two are joined by `trekId`, and
 * `check:treks` fails if either side has an id the other does not.
 *
 * THE TWO SECTIONS THAT MAKE THESE PAGES WORTH CITING
 *
 * `notForYouIf` and `comparedTo`. An operator that cannot say who a trek is
 * wrong for is selling rather than advising, and a comparison that concludes
 * "choose ours" on both sides is not a comparison. Both are guarded: the first
 * must be non-empty, and the second must give a real reason to choose the other
 * trek.
 */

import type { Focal } from "../lib/image-slots.ts";

export type MonthRating = {
  /** 1–12. All twelve, including the ones where the answer is "do not". */
  month: number;
  rating: "best" | "good" | "possible" | "avoid";
  /** What actually happens on THIS route that month. Never a regional average. */
  note: string;
};

export type TrekComparison = {
  otherTrekId: string;
  chooseThisIf: string;
  /** A real reason to book the other one. The guard checks this is not a hedge. */
  chooseOtherIf: string;
};

export type Trek = {
  id: string;
  slug: string;
  name: string;
  region: string;
  /** Two or three sentences. Factual — the banned adjective list applies. */
  summary: string;
  typicalDays: [number, number];
  /** The highest point reached on a walking day. */
  maxAltitudeM: number;
  /**
   * The highest night spent on the route itself.
   *
   * Stated separately and always, because it is the number that governs
   * altitude illness and the one operators quietly replace with the day
   * maximum. Travel-day nights are excluded: nobody counts the Kathmandu hotel
   * as part of a trek's altitude, and including it would make a lowland safari
   * appear to sleep higher than it climbs.
   */
  highestSleepM: number;
  difficulty: "moderate" | "challenging" | "strenuous";
  permitsRequired: string[];
  seasonality: MonthRating[];
  suitsYouIf: string[];
  /** REQUIRED, non-empty. Real disqualifiers, not softened ones. */
  notForYouIf: string[];
  comparedTo: TrekComparison[];
  /**
   * Rivers, passes, ranges and peoples the route is genuinely associated with
   * but never sleeps at, so they are absent from the itinerary.
   *
   * They have to be declared rather than assumed. The place-name guard reads
   * the itinerary to decide what a page may name, and a river is not a
   * stop — so without this the trail that follows the Dudh Koshi for three
   * days cannot say so. Declaring them keeps the guard's real job intact:
   * writing "Namche" onto an Annapurna page still requires putting Namche in
   * this list, which is a visible act in review rather than prose drift.
   */
  routeFeatures?: string[];
  routeOverview: string;
  heroImage: { src?: string; alt: string; focal?: Focal };
};

/* ------------------------------------------------------------- seasonality */

/**
 * Shorthand for a twelve-month table.
 *
 * Written as twelve entries per trek rather than a shared "Himalaya" calendar,
 * because the shared calendar is exactly the shape this codebase keeps having
 * to un-write. Poon Hill in October is a busy ridge at 3,210 m; Everest in
 * October is a cancelled flight and a full teahouse at 4,400 m. The same word
 * would be doing two different jobs.
 */
const months = (entries: [number, MonthRating["rating"], string][]) =>
  entries.map(([month, rating, note]) => ({ month, rating, note }));

/* ------------------------------------------------------------------ treks */

export const TREK_PAGES: Trek[] = [
  {
    id: "everest-base-camp",
    slug: "everest-base-camp",
    name: "Everest Base Camp",
    region: "Khumbu",
    summary:
      "Twelve days from Lukla to Everest Base Camp and back, sleeping in teahouses the whole way. The walking is not technical and the altitude is the whole difficulty: two of the twelve days are spent without gaining height, and the schedule is built around them.",
    typicalDays: [12, 14],
    maxAltitudeM: 5364,
    highestSleepM: 5164,
    difficulty: "challenging",
    permitsRequired: [
      "Sagarmatha National Park entry",
      "Khumbu Pasang Lhamu rural municipality fee",
    ],
    routeFeatures: ["Dudh Koshi"],
    routeOverview:
      "A flight to Lukla, then north up the Dudh Koshi through Phakding to Namche Bazaar, where the itinerary stops for a day. From Namche the trail climbs to Tengboche and Dingboche, where it stops again, then follows the moraine through Lobuche to Gorak Shep. Base camp and Kala Patthar are day walks from there. The return is the same trail, walked down in three days rather than seven.",
    suitsYouIf: [
      "You can walk five to seven hours a day for twelve consecutive days.",
      "You have two clear weeks and a spare day either side for the flight.",
      "You want the altitude and the glacier rather than villages and forest.",
      "You are content sleeping in unheated rooms for a fortnight.",
    ],
    notForYouIf: [
      "You have fewer than fourteen days including travel. The acclimatisation days are not optional and the flight moves.",
      "You want to be certain of your dates. Thirty to forty per cent of peak-season Lukla flights are cancelled and no operator can change that.",
      "You have a heart or lung condition, or you have had altitude sickness above 4,000 m before. This route sleeps at 5,164 m.",
      "You want hot showers, heating and a reliable phone signal. Above Namche you get none of the three.",
      "Your budget is under about $1,500. Below that the Lukla flight is being left out of somebody's quote.",
    ],
    comparedTo: [
      {
        otherTrekId: "annapurna-base-camp",
        chooseThisIf:
          "You want to stand on the moraine below the icefall, and the altitude is the point rather than an obstacle.",
        chooseOtherIf:
          "You have nine days rather than fourteen, you would rather not stake the trip on a mountain flight, and 4,130 m is high enough. It is a shorter, greener, cheaper walk with the same guide ratio.",
      },
      {
        otherTrekId: "langtang-valley",
        chooseThisIf:
          "The name matters to you, and you accept a busy trail and an unreliable flight to get it.",
        chooseOtherIf:
          "You want a quiet valley you reach by road, a week rather than a fortnight, and half the price. Langtang is the better walk for most people and almost nobody books it.",
      },
    ],
    seasonality: months([
      [
        1,
        "possible",
        "Cold and clear. Nights at Gorak Shep run to minus twenty and several high teahouses close, so the route runs on fewer beds.",
      ],
      [
        2,
        "possible",
        "Still cold, still clear, and quieter than any other month the route is walkable. Snow on the Namche climb is normal.",
      ],
      [
        3,
        "good",
        "Warming, and the spring crowd has not arrived. Cloud builds in the afternoon from the middle of the month.",
      ],
      [
        4,
        "best",
        "The busiest month with October. Clear mornings, full teahouses, and Lukla flights moved to Ramechhap for the season.",
      ],
      [
        5,
        "good",
        "Warm and increasingly hazy. The mountains are often gone by ten in the morning. Fewer people than April.",
      ],
      [
        6,
        "avoid",
        "Monsoon. Cloud to the valley floor, leeches below Namche, and Lukla flights grounded for days at a time.",
      ],
      [7, "avoid", "The wettest month. We do not run this route in July."],
      [
        8,
        "avoid",
        "Monsoon, with the added risk of landslides on the walk-in. We do not run this route in August.",
      ],
      [
        9,
        "possible",
        "The monsoon withdraws through the month. The last week is often clear and the trail is nearly empty.",
      ],
      [
        10,
        "best",
        "The clearest month of the year and the busiest. Book beds and flights months ahead; expect Ramechhap rather than Kathmandu.",
      ],
      [
        11,
        "best",
        "Clear, cold and thinning out as the month goes on. The last fortnight is the best combination of weather and space on the trail.",
      ],
      [
        12,
        "possible",
        "Very cold and very clear. Some high teahouses have closed for the winter by mid-month.",
      ],
    ]),
    heroImage: {
      alt: "The moraine below the Khumbu icefall on the approach to Everest Base Camp.",
    },
  },

  {
    id: "annapurna-base-camp",
    slug: "annapurna-base-camp",
    name: "Annapurna Base Camp",
    region: "Annapurna",
    summary:
      "Nine days into the Annapurna sanctuary and out again, through terraced villages and rhododendron forest before the valley narrows. It reaches 4,130 m, which is high enough for altitude to matter and low enough that most people who prepare are fine.",
    typicalDays: [9, 11],
    maxAltitudeM: 4130,
    highestSleepM: 4130,
    difficulty: "moderate",
    permitsRequired: ["Annapurna Conservation Area permit", "TIMS card"],
    routeFeatures: ["Modi Khola"],
    routeOverview:
      "Road to Pokhara, then a jeep to the trailhead and two days of terraces and forest to Chhomrong. From there the trail drops into the Modi Khola and follows it north through Bamboo and Dovan, climbing past Machhapuchhre Base Camp into the sanctuary itself. The way out is the same, including the stone stairs above Chhomrong that everybody remembers.",
    suitsYouIf: [
      "You have nine to eleven days and want a high point without a fortnight.",
      "You would rather reach an amphitheatre of peaks than a glacier moraine.",
      "You are happy with stone staircases — there are thousands of steps in both directions.",
      "You want a route reached by road rather than by a mountain flight.",
    ],
    notForYouIf: [
      "Your knees are the thing that stops you. The descent from Chhomrong is around 2,500 steps and it comes at the end.",
      "You want to be alone. This is one of the busiest trails in Nepal in October and April.",
      "You need certainty in winter. The approach between Deurali and Machhapuchhre Base Camp closes for avalanche risk several days most seasons.",
      "You want to sleep above 4,200 m or see a glacier at close range.",
    ],
    comparedTo: [
      {
        otherTrekId: "poon-hill",
        chooseThisIf:
          "You want to get into the sanctuary itself and you have nine days rather than five.",
        chooseOtherIf:
          "You have under a week, you are walking with children or parents, or 3,210 m is as high as you want to sleep. Poon Hill is half the price and most of the same forest.",
      },
      {
        otherTrekId: "mardi-himal",
        chooseThisIf:
          "You want the classic route with lodges every two hours and a well-worn trail.",
        chooseOtherIf:
          "You want the same range with a fraction of the people. Mardi Himal follows one ridge, sleeps lower at 3,580 m, and takes seven days instead of nine.",
      },
    ],
    seasonality: months([
      [
        1,
        "possible",
        "Cold and often clear, with snow on the last two days into the sanctuary. The avalanche section is watched closely.",
      ],
      [
        2,
        "good",
        "Cold, clearing, and quiet. Rhododendron has not started and the forest is bare.",
      ],
      [
        3,
        "best",
        "Rhododendron flowers through the forest from mid-month and the trail is dry. Busy but not at its worst.",
      ],
      [
        4,
        "best",
        "The clearest spring weather and the heaviest traffic. Teahouses in the sanctuary fill by early afternoon.",
      ],
      [
        5,
        "good",
        "Warm, green and increasingly hazy. Afternoon cloud closes the sanctuary most days by two.",
      ],
      [
        6,
        "avoid",
        "Monsoon. Leeches from Bamboo upward, and the Modi Khola crossings run high.",
      ],
      [
        7,
        "avoid",
        "The wettest month, with landslide risk on the jeep road to the trailhead. We do not run this route in July.",
      ],
      [8, "avoid", "Monsoon. We do not run this route in August."],
      [
        9,
        "good",
        "Wet at the start, clear and green by the end, and quiet throughout. Leeches persist in the lower forest.",
      ],
      [
        10,
        "best",
        "The clearest month and the busiest. Beds in the sanctuary need booking days ahead.",
      ],
      [
        11,
        "best",
        "Cold, dry and steadily quieter. The best month for anyone who wants the route without the queue.",
      ],
      [
        12,
        "possible",
        "Cold, short days, and the first serious snow on the upper section.",
      ],
    ]),
    heroImage: {
      alt: "The Annapurna sanctuary rim at first light.",
    },
  },

  {
    id: "annapurna-circuit",
    slug: "annapurna-circuit",
    name: "Annapurna Circuit",
    region: "Annapurna",
    summary:
      "Fourteen days around the Annapurna massif, crossing Thorong La at 5,416 m. The road now reaches a long way up both sides, so the walking is shorter than it was and the sections that remain are the ones worth doing.",
    typicalDays: [14, 18],
    maxAltitudeM: 5416,
    highestSleepM: 4525,
    difficulty: "strenuous",
    permitsRequired: ["Annapurna Conservation Area permit", "TIMS card"],
    routeFeatures: ["Marsyangdi", "Kali Gandaki"],
    routeOverview:
      "Road to Besisahar and jeeps up the Marsyangdi to Chame. From there the trail climbs through Pisang to Manang, where the itinerary stops for a day at 3,540 m. Then Yak Kharka and Thorong Phedi, the pass before dawn, and a long descent to Muktinath. The Mustang side is drier and windier, and the walk out through Marpha and Tatopani is partly by road.",
    suitsYouIf: [
      "You have a clear fortnight and want the crossing rather than an out-and-back.",
      "You can be ready to walk at four in the morning on the pass day.",
      "You want the landscape to change under you — forest, then high desert.",
      "You are content with a route that uses vehicles where the road has taken the trail.",
    ],
    notForYouIf: [
      "You cannot commit to fourteen days. The pass has no shortcut and turning back at Thorong Phedi means retracing a week.",
      "You have not slept above 3,500 m before and are unwilling to take the acclimatisation day at Manang seriously.",
      "You want to avoid roads entirely. Around a third of the original walking route is now driveable and we drive the parts that are not worth walking.",
      "You are walking in winter. Thorong La closes with snow and the itinerary then has no crossing in it.",
    ],
    comparedTo: [
      {
        otherTrekId: "upper-mustang",
        chooseThisIf:
          "You want a high pass and a fortnight of changing country, and you would rather spend the money on days than on a permit.",
        chooseOtherIf:
          "You want the walled town and the high desert without a 5,416 m crossing, and you accept a $650 permit for a route almost nobody walks.",
      },
      {
        otherTrekId: "everest-base-camp",
        chooseThisIf:
          "You want a circuit that changes as you walk it, reached entirely by road.",
        chooseOtherIf:
          "You want the glacier and the name, and you are prepared for the flight to move your dates. Everest sleeps higher; this one climbs higher and comes back down the same day.",
      },
    ],
    seasonality: months([
      [
        1,
        "avoid",
        "Thorong La is usually closed by snow. The route runs as an out-and-back on the Manang side or not at all.",
      ],
      [
        2,
        "possible",
        "The pass opens intermittently late in the month. Cold, clear, and very few people.",
      ],
      [
        3,
        "good",
        "The pass is usually open by mid-month. The lower Marsyangdi is warm and the upper valley is still cold.",
      ],
      [
        4,
        "best",
        "The most reliable crossing weather and the busiest month. Thorong Phedi fills and the pass is walked in single file before dawn.",
      ],
      [
        5,
        "good",
        "Warm and hazy on the Marsyangdi side, dry and windy on the Mustang side. The pass is dependable.",
      ],
      [
        6,
        "avoid",
        "Monsoon on the southern half, with landslide risk on the Besisahar road. We do not run this route in June.",
      ],
      [
        7,
        "avoid",
        "The wettest month on the approach. We do not run this route in July.",
      ],
      [8, "avoid", "Monsoon. We do not run this route in August."],
      [
        9,
        "possible",
        "Clearing through the month. The pass is usually crossable from the middle, and the trail is empty.",
      ],
      [
        10,
        "best",
        "The clearest month, the most reliable pass, and the largest crowd. Manang is full.",
      ],
      [
        11,
        "best",
        "Cold, dry and steadily quieter. The pass stays open most of the month and closes without warning after.",
      ],
      [
        12,
        "possible",
        "Cold and short. The pass may close for the season at any point and we say so before you book.",
      ],
    ]),
    heroImage: {
      alt: "The high crossing on the Annapurna Circuit under clear sky.",
    },
  },

  {
    id: "langtang-valley",
    slug: "langtang-valley",
    name: "Langtang Valley",
    region: "Langtang",
    summary:
      "Seven days up a single glacial valley north of Kathmandu, reached by road rather than by air. The valley was destroyed by a landslide in the 2015 earthquake and rebuilt by the people who survived it; the memorial is on the trail.",
    typicalDays: [7, 9],
    maxAltitudeM: 4984,
    highestSleepM: 3870,
    difficulty: "moderate",
    permitsRequired: ["Langtang National Park entry", "TIMS card"],
    routeOverview:
      "A long road day to Syabrubesi, then two days climbing through forest to Lama Hotel and out into the open valley at Langtang village. Kyanjin Gompa is the last settlement and the base for a day walk to the ridge above it. The return is the same trail in two days.",
    suitsYouIf: [
      "You have a week and want a full valley rather than a taste of one.",
      "You would rather reach the trailhead by road than by a flight that may not go.",
      "You want a trail with a fraction of the traffic of the Annapurna routes.",
      "You are interested in what happened here in 2015 and how the valley was rebuilt.",
    ],
    notForYouIf: [
      "You are unwilling to spend seven hours on a rough road at each end. There is no flight to Syabrubesi.",
      "You want teahouses every hour. The stretch between Syabrubesi and Lama Hotel has few and they fill.",
      "You want a famous name to take home. This route is quiet because it is not fashionable, not because it is inferior.",
      "You are uncomfortable walking through a place where a great many people died, past a memorial listing them.",
    ],
    comparedTo: [
      {
        otherTrekId: "everest-base-camp",
        chooseThisIf:
          "You have a week, you want quiet, and you would rather not gamble the trip on a mountain flight.",
        chooseOtherIf:
          "You have a fortnight and want the altitude and the glacier. Everest sleeps 1,300 m higher and the difficulty is a different order.",
      },
      {
        otherTrekId: "annapurna-base-camp",
        chooseThisIf:
          "You want an empty trail and a valley that ends in a glacier rather than an amphitheatre.",
        chooseOtherIf:
          "You want the better-known route, warmer forest, and lodges close enough together to stop when you like.",
      },
    ],
    seasonality: months([
      [
        1,
        "possible",
        "Cold and clear, with snow above Langtang village. The road is the risk rather than the trail.",
      ],
      [
        2,
        "possible",
        "Cold and quiet. The upper valley holds snow and the day walk above Kyanjin Gompa may not be possible.",
      ],
      [
        3,
        "good",
        "Warming, with rhododendron in the lower forest from late in the month.",
      ],
      [
        4,
        "best",
        "Clear mornings and the valley at its greenest. Busier than usual but still quiet by Nepali standards.",
      ],
      [
        5,
        "good",
        "Warm and hazy, with afternoon cloud filling the valley most days.",
      ],
      [
        6,
        "avoid",
        "Monsoon, and the Syabrubesi road is the first in the country to close. We do not run this route in June.",
      ],
      [
        7,
        "avoid",
        "The wettest month, with active landslide risk on the approach. We do not run this route in July.",
      ],
      [8, "avoid", "Monsoon. We do not run this route in August."],
      [
        9,
        "possible",
        "Clearing late. The road remains the limiting factor into the middle of the month.",
      ],
      [
        10,
        "best",
        "The clearest month. The valley is busier than the rest of the year and still emptier than Annapurna.",
      ],
      [
        11,
        "best",
        "Cold, dry and very quiet. The best month here for anyone who wants the valley to themselves.",
      ],
      [
        12,
        "possible",
        "Cold and short-dayed. Some upper teahouses close for the winter.",
      ],
    ]),
    heroImage: {
      alt: "Trekkers on the valley floor beneath the Langtang range.",
    },
  },

  {
    id: "upper-mustang",
    slug: "upper-mustang",
    name: "Upper Mustang",
    region: "Mustang",
    summary:
      "Thirteen days into the high desert north of the Himalaya, in a restricted area that costs $500 in permits before anything else. It sleeps no higher than 3,840 m, so the difficulty is wind, dust and distance rather than altitude.",
    typicalDays: [13, 15],
    maxAltitudeM: 3840,
    highestSleepM: 3840,
    difficulty: "moderate",
    permitsRequired: [
      "Upper Mustang restricted area permit",
      "Annapurna Conservation Area permit",
    ],
    routeFeatures: ["Kali Gandaki", "Himalaya"],
    routeOverview:
      "Flights to Pokhara and Jomsom, then north to Kagbeni where the restricted area begins. The trail follows the Kali Gandaki and its side valleys through Chele, Chuksang, Ghami and Tsarang to Lo Manthang, with jeep transfers on the sections that are now road. The return is partly the same and partly a western variant through Dhakmar.",
    suitsYouIf: [
      "You are drawn by a walled town and Tibetan-plateau country rather than by peaks.",
      "You would rather walk somewhere almost nobody goes than somewhere famous.",
      "You can accept two weeks of wind and dust with very little shade.",
      "The permit cost is not the deciding factor.",
    ],
    notForYouIf: [
      "You are budget-limited. $650 of the price is permits before a single night is booked, and nothing can reduce it.",
      "You want mountain views as the main event. This is a desert plateau and the peaks are mostly behind you.",
      "You need reliable flights. The Jomsom strip closes to wind by late morning most days and cancels outright several days a month.",
      "You want to be contactable. There is effectively no signal north of Kagbeni for the middle week.",
    ],
    comparedTo: [
      {
        otherTrekId: "annapurna-circuit",
        chooseThisIf:
          "You want the walled town and the plateau, and you would rather not cross a 5,416 m pass.",
        chooseOtherIf:
          "You want a high crossing and changing country, and you would rather put the $650 permit money into a longer trip. The circuit reaches far higher for far less.",
      },
      {
        otherTrekId: "everest-base-camp",
        chooseThisIf:
          "You have walked in Nepal before and want somewhere that does not feel like a trail.",
        chooseOtherIf:
          "This is your first Himalayan trek. Everest is better supported, better known, and half the permit cost, and the altitude is the thing you came for.",
      },
    ],
    seasonality: months([
      [
        1,
        "avoid",
        "Bitter and largely shut. Most guesthouses north of Kagbeni close for the winter.",
      ],
      [
        2,
        "avoid",
        "Still closed in practice. The plateau is cold enough that the villages empty out.",
      ],
      [
        3,
        "possible",
        "Opening up late in the month. Cold, very windy, and almost nobody there.",
      ],
      [
        4,
        "best",
        "The plateau is open, the light is clear, and the Jomsom flights are at their most reliable.",
      ],
      [
        5,
        "best",
        "Warm days, cold nights, and the strongest wind of the year through the Kali Gandaki each afternoon.",
      ],
      [
        6,
        "good",
        "The monsoon largely misses this side of the range, which makes it one of the few routes worth walking now. Getting here is the problem.",
      ],
      [
        7,
        "good",
        "Dry on the plateau and wet on the approach. The Jomsom flight is unreliable and the road alternative is long.",
      ],
      [
        8,
        "good",
        "Dry here, monsoon everywhere between here and Kathmandu. Build in spare days at both ends.",
      ],
      [
        9,
        "good",
        "The approach clears and the plateau is still dry. A good month, and quiet.",
      ],
      [
        10,
        "best",
        "Clear, dry and busy by Mustang standards, which is a handful of groups rather than a queue.",
      ],
      [
        11,
        "good",
        "Cold and clear. Villages begin closing towards the end of the month.",
      ],
      [12, "avoid", "Effectively shut. We do not run this route in December."],
    ]),
    heroImage: {
      alt: "A walled village and terraced fields on the Upper Mustang valley floor.",
    },
  },

  {
    id: "poon-hill",
    slug: "poon-hill",
    name: "Ghorepani and Poon Hill",
    region: "Annapurna",
    summary:
      "Five days on a well-made trail through farming villages and rhododendron forest, with one pre-dawn climb to a viewpoint at 3,210 m. It sleeps no higher than 2,874 m, which puts it below the altitude at which most people have any trouble.",
    typicalDays: [5, 6],
    maxAltitudeM: 3210,
    highestSleepM: 2874,
    difficulty: "moderate",
    permitsRequired: ["Annapurna Conservation Area permit", "TIMS card"],
    routeOverview:
      "Road to Pokhara and a jeep to the trailhead, then a long climb through Ulleri to Ghorepani. The viewpoint is walked before dawn and returned to breakfast. The way out crosses to Tadapani and drops through forest to the road head.",
    suitsYouIf: [
      "You have under a week and want a real trek rather than a day walk.",
      "You are walking with people whose fitness or age you are unsure of.",
      "You want forest and villages rather than moraine and rock.",
      "You would rather not go high enough for altitude to be a consideration.",
    ],
    notForYouIf: [
      "You want solitude. This is the most-walked trail in Nepal and Ghorepani is full most nights in season.",
      "You dislike steps. The Ulleri climb is around 3,300 of them in one go and there is no way around it.",
      "You want to sleep high. Nothing on this route is above 2,874 m and no acclimatisation is involved.",
      "You are booking for the viewpoint alone. It is clouded out roughly one morning in four outside the driest months.",
    ],
    comparedTo: [
      {
        otherTrekId: "annapurna-base-camp",
        chooseThisIf:
          "You have five days rather than nine, or you want a first trek that will not be decided by altitude.",
        chooseOtherIf:
          "You have the time and want to get into the sanctuary. This route stops at the edge of the country the other one walks into.",
      },
      {
        otherTrekId: "mardi-himal",
        chooseThisIf:
          "You want lodges close together, a well-made trail, and a shorter trip.",
        chooseOtherIf:
          "You have seven days and want a quiet ridge instead of the busiest trail in the country. Mardi Himal is harder and emptier.",
      },
    ],
    seasonality: months([
      [
        1,
        "good",
        "Cold mornings and the most reliable views of the year. Frost on the Ghorepani steps before dawn.",
      ],
      [
        2,
        "good",
        "Cold, clear and quiet. The forest is bare and the ridge is sharp.",
      ],
      [
        3,
        "best",
        "Rhododendron in flower through the forest between Ghorepani and Tadapani. The reason to come this month.",
      ],
      [
        4,
        "best",
        "Warm, green and busy. Ghorepani fills every night and the viewpoint is crowded at dawn.",
      ],
      [
        5,
        "possible",
        "Hazy. The viewpoint is often a white sky, and the forest is warm and humid.",
      ],
      [
        6,
        "avoid",
        "Monsoon. Leeches through the forest and no view at all. We do not run this route in June.",
      ],
      [7, "avoid", "The wettest month. We do not run this route in July."],
      [8, "avoid", "Monsoon. We do not run this route in August."],
      [
        9,
        "good",
        "Wet early and clear late, with the forest at its greenest and almost nobody on the trail.",
      ],
      [
        10,
        "best",
        "The clearest month and the busiest. Beds at Ghorepani need booking ahead.",
      ],
      [
        11,
        "best",
        "Clear, cool and thinning through the month. The best combination of view and space.",
      ],
      [
        12,
        "good",
        "Cold and clear with short days. Quiet on the trail and cold on the pre-dawn climb.",
      ],
    ]),
    heroImage: {
      alt: "Layered ridges under early light from the Poon Hill viewpoint.",
    },
  },

  {
    id: "mardi-himal",
    slug: "mardi-himal",
    name: "Mardi Himal",
    region: "Annapurna",
    summary:
      "Seven days along one ridge, with lodges rather than villages and far fewer people than the trails on either side. It tops out at 4,500 m on a day walk from High Camp and sleeps no higher than 3,580 m.",
    typicalDays: [7, 8],
    maxAltitudeM: 4500,
    highestSleepM: 3580,
    difficulty: "moderate",
    permitsRequired: ["Annapurna Conservation Area permit", "TIMS card"],
    routeOverview:
      "Road to Pokhara and a jeep to the trailhead, then up into forest at Forest Camp and along the ridge through Low Camp to High Camp. The high point is walked from High Camp and returned the same day. The descent leaves the ridge at Siding and rejoins the road.",
    suitsYouIf: [
      "You want an Annapurna route without the traffic of the Annapurna routes.",
      "You have a week and are comfortable at 3,580 m overnight.",
      "You are happy on a single ridge with the same view developing for two days.",
      "You would rather stay in a four-room lodge than a forty-room teahouse.",
    ],
    notForYouIf: [
      "You need a bed guaranteed. High Camp has four lodges and no alternative within two hours.",
      "You want variety underfoot. The trail follows one spur for two days with no side valleys and no villages.",
      "You want a hot shower most nights. Water is carried up above Low Camp and there is none for washing.",
      "You are uneasy on an exposed ridge in weather. There is nowhere to drop to quickly.",
    ],
    comparedTo: [
      {
        otherTrekId: "poon-hill",
        chooseThisIf:
          "You have seven days and want the quiet ridge rather than the busy forest.",
        chooseOtherIf:
          "You have five days, or you are walking with somebody who would rather have lodges close together and a trail with people on it. Poon Hill is easier and cheaper.",
      },
      {
        otherTrekId: "annapurna-base-camp",
        chooseThisIf:
          "You want the same range with a fraction of the people and two days less walking.",
        chooseOtherIf:
          "You want to sleep at 4,130 m inside the sanctuary rather than look at it from a ridge, and you want lodges every couple of hours.",
      },
    ],
    seasonality: months([
      [
        1,
        "possible",
        "Cold and clear, with snow on the ridge above Low Camp and the high point often out of reach.",
      ],
      [
        2,
        "possible",
        "Cold and very quiet. High Camp runs on fewer lodges through the winter.",
      ],
      [
        3,
        "good",
        "Rhododendron in the forest below Low Camp from mid-month, and the ridge clearing.",
      ],
      [
        4,
        "best",
        "The clearest spring month. High Camp fills, which on this route means four lodges rather than a village.",
      ],
      [
        5,
        "good",
        "Warm and hazy, with cloud coming up the ridge by late morning most days.",
      ],
      [
        6,
        "avoid",
        "Monsoon. The ridge is in cloud and the forest is leeched. We do not run this route in June.",
      ],
      [7, "avoid", "The wettest month. We do not run this route in July."],
      [8, "avoid", "Monsoon. We do not run this route in August."],
      [9, "possible", "Clearing late in the month, green, and almost empty."],
      [
        10,
        "best",
        "The clearest month and the only one where beds at High Camp genuinely need booking ahead.",
      ],
      [11, "best", "Cold, dry and quiet. The best month on this ridge."],
      [
        12,
        "possible",
        "Cold and short. Snow on the high point becomes likely towards the end of the month.",
      ],
    ]),
    heroImage: {
      alt: "A high viewpoint on the Mardi Himal ridge under morning cloud.",
    },
  },

  {
    id: "chitwan-safari",
    slug: "chitwan-river-and-jungle",
    name: "Chitwan River and Jungle",
    region: "Terai",
    summary:
      "Five days in the lowlands south of Kathmandu, with jeep drives, a dugout canoe and walking inside the park with a guard. It is a wildlife trip rather than a trek, and nothing about the wildlife is promised.",
    typicalDays: [5, 6],
    maxAltitudeM: 415,
    highestSleepM: 415,
    difficulty: "moderate",
    permitsRequired: ["Chitwan National Park entry"],
    routeFeatures: ["Rapti", "Tharu", "Terai"],
    routeOverview:
      "Road south to Sauraha on the edge of the park, then three days of jeep drives, canoe time on the Rapti and walking in the buffer zone and inside the park with a park guard. Nights are at a lodge with private rooms rather than in teahouses.",
    suitsYouIf: [
      "You want wildlife rather than altitude, and a bed with a bathroom.",
      "You have five days and do not want to spend them walking uphill.",
      "You are travelling with somebody who cannot manage a trek.",
      "You are content to see nothing on a given drive and go out again.",
    ],
    notForYouIf: [
      "You want a guaranteed sighting. Nobody can offer one, and an operator who implies otherwise is telling you how they work.",
      "You want to walk for hours. Most of the time inside the park is spent in a vehicle or sitting still.",
      "You are coming in the hot months. April and May here are punishing and the lodge has fans rather than air conditioning.",
      "You expect a wilderness. Sauraha is a busy town and the park boundary runs beside it.",
    ],
    comparedTo: [
      {
        otherTrekId: "bardia-wildlife",
        chooseThisIf:
          "You have five days, want to keep the travel short, and would rather see rhino reliably than tigers rarely.",
        chooseOtherIf:
          "You have six days and want somewhere far quieter with a real chance of tiger. Bardia costs more because of the flight, and it is the better wildlife trip.",
      },
      {
        otherTrekId: "kathmandu-valley-rim",
        chooseThisIf:
          "You want animals and a river rather than temples and ridges.",
        chooseOtherIf:
          "You have four days, want to stay near the capital, and would rather walk than sit in a jeep.",
      },
    ],
    seasonality: months([
      [
        1,
        "best",
        "Cool, dry and clear. Grass is still high early in the month, which makes sighting harder than February.",
      ],
      [
        2,
        "best",
        "Cool days, cut grass, and the best visibility of the year for large animals.",
      ],
      [
        3,
        "good",
        "Warming and dry. Animals concentrate near water, which improves the odds and lengthens the drives.",
      ],
      [
        4,
        "possible",
        "Hot. Sightings are good at water but the middle of the day is hard work and the lodge has no air conditioning.",
      ],
      [
        5,
        "possible",
        "The hottest month before the rain. Excellent at the river, punishing away from it.",
      ],
      [
        6,
        "avoid",
        "The monsoon starts and the park largely closes. We do not run this trip in June.",
      ],
      [
        7,
        "avoid",
        "Flooding on the Rapti. The park is closed. We do not run this trip in July.",
      ],
      [8, "avoid", "Monsoon and flooding. We do not run this trip in August."],
      [
        9,
        "avoid",
        "The park reopens late in the month at best, with grass too high to see through. We do not run this trip in September.",
      ],
      [
        10,
        "good",
        "Reopened, green and humid, with very high grass. Fewer people than the winter.",
      ],
      [
        11,
        "best",
        "Dry, cooling, and the grass beginning to be cut. A strong month.",
      ],
      [
        12,
        "best",
        "Cool and dry with the clearest air of the year. Mornings are cold in an open jeep.",
      ],
    ]),
    heroImage: {
      alt: "A slow river running through sal forest in the Terai lowlands.",
    },
  },

  {
    id: "bardia-wildlife",
    slug: "bardia-national-park",
    name: "Bardia National Park",
    region: "Terai",
    summary:
      "Six days in the far west, reached by flight because the drive is fifteen hours. It is the quietest of Nepal's large parks and the one with a real chance of tiger, which in practice means long days of sitting still beside water.",
    typicalDays: [6, 7],
    maxAltitudeM: 220,
    highestSleepM: 220,
    difficulty: "moderate",
    permitsRequired: ["Bardia National Park entry"],
    routeFeatures: ["Karnali", "Tharu", "Terai"],
    routeOverview:
      "Flight to Nepalgunj and a road transfer to Thakurdwara on the park edge. Four days of jeep drives, canoe time on the Karnali, and full days on foot inside the park with an armed guard, which the park requires. Nights are at a lodge.",
    suitsYouIf: [
      "You want the higher tiger odds of our two safaris and understand they are still low.",
      "You can spend a full day sitting beside a river without seeing anything.",
      "You want somewhere with almost no other visitors.",
      "The flight cost is acceptable to avoid a fifteen-hour drive.",
    ],
    notForYouIf: [
      "You want value measured in sightings. Roughly one trip in three sees tiger, and we will not dress that up.",
      "You are impatient. Much of the day is spent waiting, deliberately.",
      "You need to be certain of your dates in winter. Fog closes the Nepalgunj flight several mornings each December and January.",
      "You want comfort. The lodge is simple, solar-heated, and a long way from anywhere.",
    ],
    comparedTo: [
      {
        otherTrekId: "chitwan-safari",
        chooseThisIf:
          "You want quiet and a real chance of tiger, and you have six days rather than five.",
        chooseOtherIf:
          "You want a shorter, cheaper trip with more reliable rhino sightings and a much shorter journey. Chitwan is the sensible first Nepali park.",
      },
      {
        otherTrekId: "kathmandu-valley-rim",
        chooseThisIf:
          "You are prepared to fly across the country for wildlife.",
        chooseOtherIf:
          "You have four days and want to stay close to the capital. These are not comparable experiences and the deciding factor is time.",
      },
    ],
    seasonality: months([
      [
        1,
        "good",
        "Cool and dry, with morning fog that closes the flight some days. Excellent conditions once you are there.",
      ],
      [
        2,
        "best",
        "Cool, clear and dry, with grass cut and visibility at its best.",
      ],
      [
        3,
        "best",
        "Warming, dry, and the strongest tiger months begin. Animals concentrate on the Karnali.",
      ],
      [
        4,
        "best",
        "Hot and dry, and the best chance of the year at water. Middle of the day is severe.",
      ],
      [
        5,
        "good",
        "The hottest month. Sightings stay good and the heat is genuinely hard.",
      ],
      [
        6,
        "avoid",
        "Monsoon. The park closes and the roads west become unreliable. We do not run this trip in June.",
      ],
      [7, "avoid", "Flooding on the Karnali. We do not run this trip in July."],
      [8, "avoid", "Monsoon. We do not run this trip in August."],
      [
        9,
        "avoid",
        "Grass too high to see through and the park only partly open. We do not run this trip in September.",
      ],
      [
        10,
        "possible",
        "Reopening, green, humid, with very high grass and poor visibility.",
      ],
      [
        11,
        "good",
        "Drying out and cooling. Grass still high early in the month.",
      ],
      [
        12,
        "good",
        "Cool and dry, with fog on the flight some mornings and cold starts in an open jeep.",
      ],
    ]),
    heroImage: {
      alt: "A wide river channel with grassland beyond in Bardia National Park.",
    },
  },

  {
    id: "kathmandu-valley-rim",
    slug: "kathmandu-valley-rim",
    name: "Kathmandu Valley Rim",
    region: "Kathmandu Valley",
    summary:
      "Four days walking the ridges around the capital, sleeping in hotels and lodges rather than teahouses. It tops out at 2,175 m, and the walking is on farm tracks and footpaths rather than mountain trail.",
    typicalDays: [4, 5],
    maxAltitudeM: 2175,
    highestSleepM: 2175,
    difficulty: "moderate",
    permitsRequired: [
      "Shivapuri Nagarjun National Park entry",
      "Heritage site entry at Bhaktapur and Changu Narayan",
    ],
    routeOverview:
      "Out of the city into Shivapuri Nagarjun National Park and along the northern rim to Chisapani, then east and south over Nagarkot to Dhulikhel, with Bhaktapur on the way back in. Nights are at hotels and rim lodges with private bathrooms.",
    suitsYouIf: [
      "You have four days and want walking without leaving the valley.",
      "You want temples and villages as much as ridges.",
      "You would rather sleep in a hotel with heating and a hot shower.",
      "You are adding a short walk to a trip that is mostly about something else.",
    ],
    notForYouIf: [
      "You want mountains. This tops out at 2,175 m and the high peaks are a distant view on a clear day.",
      "You are coming between late December and March expecting that view. Valley air is often thick enough to lose it entirely.",
      "You want to feel remote. You are within an hour of the city for the whole walk.",
      "You want a physical challenge. The days are short and the ground is gentle.",
    ],
    comparedTo: [
      {
        otherTrekId: "poon-hill",
        chooseThisIf:
          "You have four days, want hotels rather than teahouses, and want to stay near the capital.",
        chooseOtherIf:
          "You have five days and want an actual mountain trail with a viewpoint at the end of it. Poon Hill is the better walk if the time exists.",
      },
      {
        otherTrekId: "chitwan-safari",
        chooseThisIf:
          "You would rather walk ridges and see temples than sit in a jeep.",
        chooseOtherIf:
          "You want wildlife and a lodge, and you do not mind six hours on a road to get there.",
      },
    ],
    seasonality: months([
      [
        1,
        "possible",
        "Cold mornings and the worst air of the year. The ridges are pleasant and the view is often gone.",
      ],
      [
        2,
        "possible",
        "Cold and hazy. Air quality is the limiting factor rather than the weather.",
      ],
      [
        3,
        "good",
        "Warming, with the pre-monsoon burning season starting to affect visibility late in the month.",
      ],
      [
        4,
        "good",
        "Warm and green, with better air than winter and afternoon cloud building.",
      ],
      [
        5,
        "possible",
        "Hot and humid on the lower sections, with storms most afternoons.",
      ],
      [
        6,
        "avoid",
        "Monsoon. The tracks turn to mud and there is nothing to see. We do not run this trip in June.",
      ],
      [7, "avoid", "The wettest month. We do not run this trip in July."],
      [8, "avoid", "Monsoon. We do not run this trip in August."],
      [
        9,
        "good",
        "Clearing, green, and the cleanest air of the year as the rain washes the valley.",
      ],
      [
        10,
        "best",
        "The clearest month. Terraces are cut and the high peaks are visible from the rim most mornings.",
      ],
      [
        11,
        "best",
        "Clear, cool and dry, with the best light of the year over the valley.",
      ],
      [
        12,
        "good",
        "Cold and clear early in the month, hazier as the winter inversion settles in.",
      ],
    ]),
    heroImage: {
      alt: "Terraced fields falling away from a ridge path on the Kathmandu valley rim.",
    },
  },
];

export const trekBySlug = (slug: string) =>
  TREK_PAGES.find((t) => t.slug === slug);
export const trekById = (id: string) => TREK_PAGES.find((t) => t.id === id);

export const MONTH_NAME = [
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
