// Relative with an explicit extension, not the `@/` alias: scripts/ runs this
// module through Node's bare TypeScript stripping, which has no path mapping.
import {
  departureStatus,
  departures,
  formatDate,
  highestSleep,
  isBookable,
  lifecycle,
  seatsRemaining,
  seatsToGuarantee,
  type Lifecycle,
} from "../content/departures.ts";

/**
 * The public departures feed.
 *
 * A small operator with no brand recognition gets found by being machine
 * readable. This is the endpoint an AI assistant or a channel partner reads, so
 * it is deliberately boring: ISO dates, integer minor units, no nesting games,
 * and a `docs` object so a consumer never has to guess what a field means.
 */

export type FeedDeparture = {
  id: string;
  slug: string;
  lifecycle: string;
  bookable: boolean;
  trekId: string;
  trekName: string;
  region: string;
  days: number;
  maxAltitudeMetres: number;
  difficulty: string;
  departsOn: string;
  returnsOn: string;
  status: string;
  seatsTotal: number;
  seatsBooked: number;
  seatsRemaining: number;
  minimumToRun: number;
  seatsToGuarantee: number;
  guaranteedAt: string | null;
  decisionDate: string;
  guideRatio: string;
  assistantGuideAboveMetres: number | null;
  priceMinorUnits: number;
  priceCurrency: string;
  singleSupplementMinorUnits: number;
  priceIncludes: string[];
  priceExcludes: string[];
  costSheetUrl: string;
  bookingUrl: string;
  groupSoFar: { country: string; count: number }[];
};

const DOCS: Record<string, string> = {
  id: "Stable identifier for this departure. Never reused.",
  slug: "The public URL segment for this departure. Use bookingUrl to link.",
  lifecycle:
    "open, closed, cancelled, departed or completed. Derived from the dates and the booking count, never set by hand.",
  bookable:
    "True only when lifecycle is open. Anything else cannot be bought at any price.",
  trekId: "Identifier of the trek this departure belongs to.",
  trekName: "Human-readable trek name.",
  region: "Region of Nepal, e.g. Khumbu, Annapurna, Langtang, Mustang, Terai.",
  days: "Total trip length in days, arrival to departure.",
  maxAltitudeMetres: "Highest point reached, in metres.",
  difficulty: "One of: moderate, challenging, strenuous.",
  departsOn: "ISO 8601 date the departure begins.",
  returnsOn: "ISO 8601 date the departure ends.",
  status:
    "Derived. guaranteed = confirmed to run; needs-n = below the published minimum; filling = guaranteed with 3 or fewer seats left; full = no seats; closed = decision date passed without reaching the minimum.",
  seatsTotal: "Maximum group size.",
  seatsBooked: "Seats currently booked.",
  seatsRemaining: "seatsTotal minus seatsBooked.",
  minimumToRun:
    "Published number of bookings at which the departure is guaranteed to run. Public by policy.",
  seatsToGuarantee:
    "Bookings still needed to reach minimumToRun. 0 once guaranteed.",
  guaranteedAt: "ISO 8601 date the guarantee was reached, or null.",
  decisionDate:
    "ISO 8601 date by which run / no-run is decided. Always before departsOn.",
  guideRatio: "Maximum guides-to-trekkers ratio, e.g. 1:4.",
  assistantGuideAboveMetres:
    "Altitude in metres above which a second guide joins, or null.",
  priceMinorUnits:
    "All-in price for one solo traveller, in minor units (cents). Not a 'from' price.",
  priceCurrency: "ISO 4217 currency code for priceMinorUnits.",
  singleSupplementMinorUnits:
    "Single supplement in minor units. 0 means there is none. Always present.",
  priceIncludes: "What the price covers.",
  priceExcludes: "What the price does not cover. Never empty.",
  costSheetUrl: "Absolute URL to the itemised cost sheet for this departure.",
  bookingUrl: "Absolute URL to the departure page.",
  groupSoFar:
    "Anonymised composition of those already booked: country and count only.",
};

export function buildFeed(origin: string) {
  const now = new Date();
  const absolute = (path: string) => new URL(path, origin).toString();

  const entries: FeedDeparture[] = departures.map((d) => ({
    id: d.id,
    slug: d.slug,
    /*
     * Kept in the feed, marked for what it is.
     *
     * Removing cancelled dates would hide the only evidence that the published
     * minimum is a real threshold. A reader — human or machine — gets the whole
     * set and an explicit field saying which are on sale.
     */
    lifecycle: lifecycle(d, now),
    bookable: isBookable(d, now),
    trekId: d.trekId,
    trekName: d.trekName,
    region: d.region,
    days: d.days,
    maxAltitudeMetres: d.maxAltitudeM,
    difficulty: d.difficulty,
    departsOn: d.departsOn,
    returnsOn: d.returnsOn,
    status: departureStatus(d, now),
    seatsTotal: d.seatsTotal,
    seatsBooked: d.seatsBooked,
    seatsRemaining: seatsRemaining(d),
    minimumToRun: d.minimumToRun,
    seatsToGuarantee: seatsToGuarantee(d),
    guaranteedAt: d.guaranteedAt ?? null,
    decisionDate: d.decisionDate,
    guideRatio: d.guideRatio,
    assistantGuideAboveMetres: d.assistantGuideAbove ?? null,
    priceMinorUnits: Math.round(d.priceUSD * 100),
    priceCurrency: "USD",
    singleSupplementMinorUnits: Math.round(d.singleSupplementUSD * 100),
    priceIncludes: d.priceIncludes,
    priceExcludes: d.priceExcludes,
    costSheetUrl: absolute(d.costSheetHref),
    // Built from the slug, which is what the route actually is. This was `d.id`
    // and every bookingUrl in the public feed was a 404 — `check:links` reads
    // hrefs out of components and never saw a URL assembled in a library.
    bookingUrl: absolute(`/departures/${d.slug}`),
    /*
     * Country and count, listed field by field.
     *
     * Deliberately not `d.groupSoFar` passed through: that publishes whatever
     * the type happens to hold on the day someone adds a field to it. These are
     * real customers who agreed to none of this, and the safe shape for a
     * public feed is one that has to be edited to widen.
     */
    groupSoFar: d.groupSoFar.map((g) => ({
      country: g.country,
      count: g.count,
    })),
  }));

  return {
    feed: "everest-trailways-departures",
    version: 1,
    lastUpdated: now.toISOString(),
    license: "Free to read, cache and republish with attribution.",
    /*
     * A page, not a mailbox.
     *
     * The address is on the site for people to use; putting it in a
     * machine-readable file that invites republication is how it ends up in
     * every scraped address list there is. Anyone with a real question can
     * follow the link.
     */
    contact: absolute("/plan"),
    docs: DOCS,
    departures: entries,
  };
}

/**
 * Availability, from the lifecycle.
 *
 * A cancelled date emitted `InStock` alongside a full price and a cost sheet,
 * which is a machine-readable claim that it can be bought. It cannot: the
 * minimum was not met and everybody was refunded. Schema.org has words for
 * this and we should use them.
 */
function availabilityFor(state: Lifecycle): string | null {
  switch (state) {
    case "open":
      return "https://schema.org/InStock";
    case "closed":
      return "https://schema.org/SoldOut";
    case "cancelled":
      // No offer at all. There is nothing on sale and nothing that was.
      return null;
    default:
      // Departed or completed: it existed, it is over.
      return "https://schema.org/Discontinued";
  }
}

/** schema.org TouristTrip + Offer for one departure. */
/**
 * The full structured record for one departure page.
 *
 * The itinerary is an ItemList of TouristDestination entries carrying the
 * sleeping altitude of each night, because that is the fact a machine would
 * otherwise have to read off an SVG polyline — which it cannot. Everything
 * here also exists as literal text on the page; this is a second copy in a
 * shape a parser can use, never the only copy.
 */
export function departureJsonLd(
  d: (typeof departures)[number],
  origin: string,
) {
  const absolute = (path: string) => new URL(path, origin).toString();
  const url = absolute(`/departures/${d.slug}`);
  const state = lifecycle(d);
  const availability = availabilityFor(state);

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": url,
    name: `${d.trekName} — departs ${d.departsOn}`,
    description: `${d.days}-day ${d.difficulty} trek in ${d.region}, Nepal. Maximum altitude ${d.maxAltitudeM} m, highest night ${highestSleep(d).sleepAltitudeM} m. Guide ratio ${d.guideRatio}, maximum group ${d.groupSizeMax}. Guaranteed to run at ${d.minimumToRun} bookings; run or no-run decided by ${d.decisionDate}.`,
    url,
    touristType: "Trekker",
    subjectOf: {
      "@type": "CreativeWork",
      name: "Published cost sheet",
      url: absolute(d.costSheetHref),
    },
    itinerary: {
      "@type": "ItemList",
      name: `${d.trekName} day-by-day itinerary`,
      numberOfItems: d.itinerary.length,
      itemListElement: d.itinerary.map((day) => ({
        "@type": "ListItem",
        position: day.day,
        item: {
          "@type": "TouristDestination",
          name: day.toPlace,
          description: day.title,
          // The sleeping altitude, not the day's peak. See treks.ts.
          geo: {
            "@type": "GeoCoordinates",
            elevation: `${day.sleepAltitudeM} m`,
            addressCountry: "NP",
          },
        },
      })),
    },
    /*
     * A cancelled date has no offer at all.
     *
     * Not an offer marked unavailable — none. The trip did not reach its
     * minimum, everybody was refunded, and there is no price at which it can be
     * bought. Publishing a priced Offer with an "out of stock" flag would still
     * be telling an aggregator this is a product.
     */
    ...(availability === null
      ? {}
      : {
          offers: {
            "@type": "Offer",
            "@id": `${url}#offer`,
            price: d.priceUSD.toFixed(2),
            priceCurrency: "USD",
            availability,
            inventoryLevel: {
              "@type": "QuantitativeValue",
              value: seatsRemaining(d),
              unitText: "seats",
            },
            url,
            validFrom: d.guaranteedAt ?? d.decisionDate,
            validThrough: d.departsOn,
            priceSpecification: {
              "@type": "PriceSpecification",
              price: d.priceUSD.toFixed(2),
              priceCurrency: "USD",
              valueAddedTaxIncluded: true,
            },
          },
        }),
    /*
     * The lifecycle, stated. An aggregator that ignores availability can still
     * read this and know the trip did not run.
     */
    additionalProperty: {
      "@type": "PropertyValue",
      name: "lifecycle",
      value: state,
    },
    provider: {
      "@type": "Organization",
      name: "Everest Trailways",
      url: origin,
    },
  };
}

/** Breadcrumbs for the detail page. Home / Departures / this departure. */
export function breadcrumbJsonLd(
  d: (typeof departures)[number],
  origin: string,
) {
  const absolute = (path: string) => new URL(path, origin).toString();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: origin },
      {
        "@type": "ListItem",
        position: 2,
        name: "Departures",
        item: absolute("/departures"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${d.trekName}, ${formatDate(d.departsOn)}`,
        item: absolute(`/departures/${d.slug}`),
      },
    ],
  };
}

/**
 * FAQPage structured data.
 *
 * This is how an AI planner quotes us. Somebody asking an assistant "what
 * happens if I get altitude sickness on an Everest trek" gets an answer
 * assembled from whatever the assistant can parse, and an operator whose
 * answers are only in an accordion is an operator that does not appear in it.
 *
 * Every answer here also exists as literal text on the page — the accordion
 * keeps its panels mounted for exactly this reason. This is a second copy in a
 * shape a parser can use, never the only copy.
 */
export function faqJsonLd(d: (typeof departures)[number], origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": new URL(`/departures/${d.slug}#faq`, origin).toString(),
    mainEntity: d.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
