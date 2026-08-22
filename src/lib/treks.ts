import {
  type CancelledDate,
  type Departure,
  cancelledFor,
  departures,
  formatDate,
  isBookable,
} from "@/content/departures";
import { type Trek, TREK_PAGES, trekById } from "@/content/trek-pages";

/*
 * `cancelledFor` is re-exported rather than defined here.
 *
 * It lives in the content layer because the guard has to import the same
 * function this page renders, and the guard runs under Node's TypeScript
 * stripping, which cannot resolve the `@/` alias.
 */
export { cancelledFor, type CancelledDate };

/**
 * Everything a trek page shows that is not written down.
 *
 * The rule the rest of this codebase already runs on: if a number can be
 * derived from the departures, it is derived. A trek page carrying its own
 * "from $690" would be wrong the first time a price moved, and wrong silently,
 * because nothing on the site would contradict it.
 */

export const trekDepartures = (trekId: string): Departure[] =>
  departures
    .filter((d) => d.trekId === trekId)
    .sort((a, b) => a.departsOn.localeCompare(b.departsOn));

export const bookableFor = (trekId: string, now: Date = new Date()) =>
  trekDepartures(trekId).filter((d) => isBookable(d, now));

/**
 * What the trek costs, from the dates themselves.
 *
 * Bookable dates when there are any, because quoting a price nobody can take
 * is a bait price. When there are none the whole set is used and the caller is
 * told, so the page can say the range is historical rather than imply it is
 * still on sale.
 */
export function priceRange(trekId: string, now: Date = new Date()) {
  const open = bookableFor(trekId, now);
  const set = open.length ? open : trekDepartures(trekId);
  if (!set.length) return null;
  const prices = set.map((d) => d.priceUSD);
  const supplements = set.map((d) => d.singleSupplementUSD);
  return {
    from: Math.min(...prices),
    to: Math.max(...prices),
    singleSupplement: Math.max(...supplements),
    bookable: open.length > 0,
    count: set.length,
  };
}

export const regionSlug = (region: string) =>
  region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const REGIONS = [...new Set(TREK_PAGES.map((t) => t.region))].sort();

export const treksInRegion = (region: string) =>
  TREK_PAGES.filter((t) => t.region === region);

export const regionBySlug = (slug: string) =>
  REGIONS.find((r) => regionSlug(r) === slug);

/* --------------------------------------------------------------------- FAQ */

const MONTH_LONG = [
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
 * The trek-level FAQ, derived rather than written.
 *
 * Every answer quotes a number that lives somewhere else in the repository —
 * the altitudes, the permit list, the price range, the months rated "avoid".
 * Writing them out by hand is how a page ends up saying 4,200 m six months
 * after the itinerary changed, which is the exact failure the departure pages
 * already carry guards against.
 */
export function trekFaqs(trek: Trek): { question: string; answer: string }[] {
  const range = priceRange(trek.id);
  const open = bookableFor(trek.id);
  const [minDays, maxDays] = trek.typicalDays;
  const avoid = trek.seasonality.filter((m) => m.rating === "avoid");
  const best = trek.seasonality.filter((m) => m.rating === "best");
  const monthList = (set: typeof trek.seasonality) =>
    set.map((m) => MONTH_LONG[m.month - 1]).join(", ");

  const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

  const faqs = [
    {
      question: `How long is ${trek.name}?`,
      answer:
        minDays === maxDays
          ? `${minDays} days, counted from arrival in Nepal to the end of the trip rather than from the trailhead.`
          : `Between ${minDays} and ${maxDays} days depending on the date, counted from arrival in Nepal to the end of the trip rather than from the trailhead. Every departure states its own length.`,
    },
    {
      question: `How high does ${trek.name} go?`,
      answer: `The highest point on a walking day is ${trek.maxAltitudeM.toLocaleString("en-GB")} m. The highest night on the route is ${trek.highestSleepM.toLocaleString("en-GB")} m, which is the number that governs altitude illness and the one worth comparing between operators.`,
    },
    {
      question: `When should I walk ${trek.name}?`,
      answer: best.length
        ? `${monthList(best)} are the months we rate highest. The table on this page rates all twelve, including the ones we tell people to stay away from.`
        : `No single month stands above the rest on this route. The table on this page rates all twelve and says why.`,
    },
    {
      question: `Are there months to avoid?`,
      answer: avoid.length
        ? `Yes — ${monthList(avoid)}. We mostly do not run dates in those months rather than quietly selling them, which is why the list of dates on this page has gaps in it.`
        : `No month on this route is bad enough that we would tell you not to come.`,
    },
    {
      question: `What permits does ${trek.name} need?`,
      answer: `${trek.permitsRequired.join("; ")}. All of them are inside the price and itemised line by line on each departure's cost sheet.`,
    },
    {
      question: `What does ${trek.name} cost?`,
      answer: range
        ? `${
            range.from === range.to
              ? `${money(range.from)} per person`
              : `${money(range.from)} to ${money(range.to)} per person depending on the date`
          }, all in.${
            range.singleSupplement > 0
              ? ` A single room is ${money(range.singleSupplement)} more where one is available.`
              : " There is no single supplement."
          } Every departure publishes its full itemised cost sheet, including what we keep.`
        : `No dates are published for this trek at the moment.`,
    },
    {
      question: `Will my departure actually run?`,
      answer: `Each date publishes a minimum number of travellers and the date by which run or no-run is decided. Below the minimum on that date it is cancelled and refunded in full.${
        cancelledFor(trek.id).length
          ? " The dates on this trek that did not reach their minimum are listed further up this page."
          : ""
      }`,
    },
    {
      question: `Who is ${trek.name} wrong for?`,
      answer: `${trek.notForYouIf[0]} The section above lists the rest, in full and unsoftened.`,
    },
  ];

  if (open.length) {
    faqs.push({
      question: `How many dates are open?`,
      answer: `${open.length} ${
        open.length === 1 ? "date is" : "dates are"
      } open for booking, listed on this page with the seats left on each.`,
    });
  }

  return faqs;
}

/* -------------------------------------------------------- structured data */

export function trekJsonLd(trek: Trek, siteUrl: string) {
  const url = `${siteUrl}/treks/${trek.slug}`;
  const open = bookableFor(trek.id);

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": url,
    name: trek.name,
    description: trek.summary,
    url,
    touristType: trek.suitsYouIf,
    itinerary: {
      "@type": "ItemList",
      numberOfItems: open.length,
      itemListElement: open.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TouristTrip",
          name: `${d.trekName}, ${formatDate(d.departsOn)}`,
          url: `${siteUrl}/departures/${d.slug}`,
          offers: {
            "@type": "Offer",
            price: d.priceUSD,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: `${siteUrl}/departures/${d.slug}`,
          },
        },
      })),
    },
    ...(open.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: Math.min(...open.map((d) => d.priceUSD)),
            highPrice: Math.max(...open.map((d) => d.priceUSD)),
            offerCount: open.length,
          },
        }
      : {}),
    subjectOf: {
      "@type": "TouristAttraction",
      name: trek.region,
      url: `${siteUrl}/regions/${regionSlug(trek.region)}`,
    },
  };
}

export function trekBreadcrumbJsonLd(trek: Trek, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Treks",
        item: `${siteUrl}/treks`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: trek.region,
        item: `${siteUrl}/regions/${regionSlug(trek.region)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: trek.name,
        item: `${siteUrl}/treks/${trek.slug}`,
      },
    ],
  };
}

export function trekFaqJsonLd(trek: Trek, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/treks/${trek.slug}#faq`,
    mainEntity: trekFaqs(trek).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** The trek a departure belongs to, for the link back up. */
export const trekForDeparture = (d: Departure) => trekById(d.trekId);
