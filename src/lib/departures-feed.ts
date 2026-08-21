// Relative with an explicit extension, not the `@/` alias: scripts/ runs this
// module through Node's bare TypeScript stripping, which has no path mapping.
import {
  departureStatus,
  departures,
  formatDate,
  highestSleep,
  seatsRemaining,
  seatsToGuarantee,
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
    bookingUrl: absolute(`/departures/${d.id}`),
    groupSoFar: d.groupSoFar,
  }));

  return {
    feed: "everest-trailways-departures",
    version: 1,
    lastUpdated: now.toISOString(),
    license: "Free to read, cache and republish with attribution.",
    contact: "hello@everesttrailways.com",
    docs: DOCS,
    departures: entries,
  };
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
  const status = departureStatus(d);
  const availability =
    status === "full" || status === "closed"
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock";

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
