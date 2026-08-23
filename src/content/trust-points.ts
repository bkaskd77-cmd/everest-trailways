/**
 * The trust strip's claims.
 *
 * Everest Trailways is new, and Nepal's trekking market has a fraud pattern
 * that looks exactly like a new company: a polished site, good prices, a
 * deposit taken, nobody reachable on arrival. On landing we are
 * indistinguishable from that. Generic assurance is worthless here — every
 * scam site claims transparent pricing and licensed guides.
 *
 * So this file holds only claims a stranger can check without asking us.
 *
 * THE RULES. These are not style preferences; they are the entire point.
 *
 *   1. `verify` is required by the type. A claim with no external proof does
 *      not belong on this page. If you cannot link to something that settles
 *      it, delete the point.
 *
 *   2. NEVER invent a registration, licence or membership number, not even as
 *      a realistic-looking placeholder, and not even temporarily. A fabricated
 *      number is the single most damaging thing this site could ship: it is
 *      indistinguishable from fraud and it is checkable. Placeholders are "—".
 *
 *   3. `status: "pending"` is the honest default until a real document exists.
 *      Flip to "verified" only when the linked source actually resolves to
 *      proof. `pnpm check:trust` fails the build if a "verified" point still
 *      carries a placeholder.
 *
 *   4. `body` is one factual, checkable sentence. No adjectives — no "expert",
 *      "world-class", "trusted", "leading". Those are the vocabulary of the
 *      thing we are distinguishing ourselves from. `pnpm check:trust` enforces
 *      a banned list.
 *
 * Full guidance in trust-points.README.md.
 */

import { departures } from "./departures.ts";
import { CREDENTIALS } from "./credentials.ts";

export type TrustPoint = {
  id: string;
  /** The headline value. Kept as a string: "1:4" and "100%" are not numbers. */
  figure: string;
  /** What the figure means. Set small, uppercase, tracked. */
  figureLabel: string;
  /** One sentence. Factual and checkable. No adjectives. */
  body: string;
  /** Required. No proof, no claim. */
  verify: {
    label: string;
    href: string;
    external: boolean;
    /**
     * The credential this link would confirm, when it is one.
     *
     * The registrations point used to link straight out to the TAAN member
     * directory while our TAAN record was pending and its number read "-". A
     * visitor who followed it, searched, and found nothing does not conclude
     * "not yet listed" — they conclude we are lying, and they are being
     * reasonable. Naming the credential lets the label be composed from its
     * status, so the link says what it can actually prove today and corrects
     * itself the moment the record is verified.
     */
    confirms?: string;
  };
  status: "verified" | "pending";
};

/**
 * Every figure on the trust strip, composed from the catalogue.
 *
 * These were typed, and one of them was the most serious untruth on the site.
 * The strip advertised "1:4 — MAXIMUM GUIDE RATIO" while eight departures ran
 * at 1:5, 1:6 and 1:8. A maximum is a ceiling; publishing the best case under
 * that word says the opposite of what is true, and it survived because the
 * guard only asked whether any departure EXCEEDED the published band — which
 * the weakest possible band always satisfies.
 *
 * So no figure here is written down. Each is read from the same data the rest
 * of the site renders, which means a headline cannot outlive the fact it was
 * true of, and the strip corrects itself when the catalogue changes.
 */
export function trustPoints(): TrustPoint[] {
  const ratios = [...new Set(departures.map((d) => d.guideRatio))].sort(
    (a, b) => perGuide(a) - perGuide(b),
  );
  const strictest = ratios[0] ?? "1:1";
  const loosest = ratios[ratios.length - 1] ?? "1:1";

  /* The bands where a second guide joins, from the departures themselves. */
  const withSecondGuide = departures.filter((d) => d.assistantGuideAbove);
  const highest = departures.filter((d) => d.maxAltitudeM > 4500);
  const highestRatios = [...new Set(highest.map((d) => d.guideRatio))].sort(
    (a, b) => perGuide(a) - perGuide(b),
  );

  const verifiedCredentials = CREDENTIALS.filter(
    (c) => c.status === "verified",
  ).length;
  const publishedNumbers = CREDENTIALS.filter((c) => c.number !== "—").length;

  return [
    {
      id: "registrations",
      /*
       * The count of credentials we have actually verified, which is zero.
       *
       * The old figure was "2" beside a body claiming both numbers were
       * published in full. Neither number exists: all seven read "—". A trust
       * strip asserting a count it cannot show is the fault this whole page
       * argues against, and it was on the page arguing it.
       */
      figure: String(verifiedCredentials),
      figureLabel:
        verifiedCredentials === 1
          ? "verified registration"
          : "verified registrations",
      body:
        verifiedCredentials === 0
          ? `We list ${CREDENTIALS.length} registrations, memberships and insurances, and have verified none of them yet — every number reads "—" until we hold the document. The list and how to check each one are published now; the numbers follow.`
          : `${verifiedCredentials} of ${CREDENTIALS.length} verified, with ${publishedNumbers} number${publishedNumbers === 1 ? "" : "s"} published in full and a route to check each one yourself.`,
      verify: verifyFor("taan-membership", {
        confirmed: {
          label: "Check us in the TAAN member directory",
          href: "https://www.taan.org.np/members",
          external: true,
        },
        pending: {
          label: "See what we hold, and what is not yet listed",
          href: "/licences",
          external: false,
        },
      }),
      status: verifiedCredentials > 0 ? "verified" : "pending",
    },
    {
      id: "guide-ratio",
      /*
       * The LOOSEST ratio on sale, because the label says maximum.
       *
       * Publishing the strictest under the word "maximum" was the untruth.
       * The worst case is the number a reader is entitled to, and the body
       * carries the rest of the picture rather than hiding it.
       */
      figure: loosest,
      figureLabel: "most trekkers per guide, anywhere on sale",
      body: `Ratios run from ${strictest} to ${loosest} depending on the route${
        highestRatios.length
          ? `; every departure above 4,500 m runs ${highestRatios.join(" or ")}`
          : ""
      }${
        withSecondGuide.length
          ? `, and ${withSecondGuide.length} of them carry a second guide from a stated altitude`
          : ""
      }. Each departure publishes its own ratio and does not exceed it.`,
      verify: {
        label: "Read the ratio by altitude band",
        href: "/safety#ratios",
        external: false,
      },
      status: "verified",
    },
    {
      id: "cost-sheet",
      /*
       * Derived from the ledgers rather than asserted. Every departure's
       * provided lines sum exactly to its published price, and the build fails
       * if they do not — so this figure is a measurement of that, not a claim
       * about it.
       */
      figure: `${itemisedShare()}%`,
      figureLabel: "of your price, itemised",
      body: `Permits, transport, accommodation, staff wages, insurance and our own fee are published line by line on every one of the ${departures.length} departures, with who receives each amount.`,
      verify: {
        label: "See how the numbers are built",
        href: "/pricing",
        external: false,
      },
      status: "verified",
    },
    {
      id: "no-middlemen",
      /*
       * A positive count rather than a zero.
       *
       * "0 middlemen" cannot be derived — it is the absence of a thing we do
       * not record, which is not evidence. The number of departures we operate
       * ourselves is a count of something that exists.
       */
      figure: String(departures.length),
      figureLabel: "departures, all run by us",
      body: "You book the team that runs your trek. Every departure is staffed and operated by us rather than sold on to an operator we do not name.",
      verify: {
        label: "Meet the guiding team",
        href: "/team",
        external: false,
      },
      status: "pending",
    },
  ];
}

/** "1:4" → 4. The number of trekkers each guide is responsible for. */
/**
 * The verify link a credential can currently support.
 *
 * A link out to a public register is the strongest proof on the site when the
 * record is there, and the weakest thing on it when the record is not: the
 * reader searches, finds nothing, and concludes we are lying rather than that
 * we are new. So while the credential is pending the link points inward, to
 * the page that says plainly what we hold and what we do not, and the label
 * says "not yet listed" rather than "check us".
 *
 * It flips on its own when the record is verified. Nobody has to remember.
 */
export function verifyFor(
  credentialId: string,
  options: {
    confirmed: TrustPoint["verify"];
    pending: TrustPoint["verify"];
  },
): TrustPoint["verify"] {
  const credential = CREDENTIALS.find((c) => c.id === credentialId);
  const isVerified = credential?.status === "verified";
  return {
    ...(isVerified ? options.confirmed : options.pending),
    confirms: credentialId,
  };
}

export const perGuide = (ratio: string) => Number(ratio.split(":")[1]) || 0;

/**
 * The share of a published price that appears as itemised lines.
 *
 * 100 by construction — `sheetPrice` IS the sum of the provided lines and
 * `check:departures` fails otherwise — but measured rather than asserted, so
 * that if the two ever part company the strip says so instead of insisting.
 */
export function itemisedShare(): number {
  const totals = departures.map((d) => {
    const itemised = d.costSheet.lines
      .filter((l) => l.disposition === "provided")
      .reduce((sum, l) => sum + (l.amountUSD ?? 0), 0);
    return d.priceUSD === 0 ? 1 : itemised / d.priceUSD;
  });
  const worst = Math.min(...totals);
  return Math.floor(worst * 100);
}

/**
 * Words that turn a checkable statement into a marketing one. Extend freely —
 * `pnpm check:trust` reads this list.
 */
export const BANNED_ADJECTIVES = [
  "expert",
  "world-class",
  "world class",
  "unbeatable",
  "best",
  "premier",
  "leading",
  "luxury",
  "ultimate",
  "unrivalled",
  "unrivaled",
  "exceptional",
  "amazing",
  "incredible",
  "trusted",
  "renowned",
  "award-winning",
  "top-rated",
  "seamless",
  "hassle-free",
  "authentic",
  "breathtaking",
  "unforgettable",
];

/** Values that mean "not filled in yet". */
export const PLACEHOLDERS = ["—", "-", "TBD", "tbd", "", "#"];
