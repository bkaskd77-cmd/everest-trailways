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
  };
  status: "verified" | "pending";
};

export const trustPoints: TrustPoint[] = [
  {
    id: "registrations",
    figure: "2",
    figureLabel: "public registrations",
    body: "We hold registrations with the Nepal Tourism Board and TAAN, and both numbers are published here in full.",
    verify: {
      label: "Check the TAAN member directory",
      href: "https://www.taan.org.np/members",
      external: true,
    },
    status: "pending",
  },
  {
    id: "guide-ratio",
    figure: "1:4",
    figureLabel: "maximum guide ratio",
    body: "Every departure publishes its guide-to-trekker ratio and does not exceed it, counting assistant guides on high-altitude routes.",
    verify: {
      label: "Read the safety standard",
      href: "/safety",
      external: false,
    },
    status: "pending",
  },
  {
    id: "cost-sheet",
    figure: "100%",
    figureLabel: "of your price, itemised",
    body: "Permits, domestic flights, insurance, guide and porter wages and our tipping policy are listed line by line before you pay.",
    verify: {
      label: "See a sample cost sheet",
      href: "/pricing",
      external: false,
    },
    status: "pending",
  },
  {
    id: "no-middlemen",
    figure: "0",
    figureLabel: "middlemen",
    body: "You book the team that runs your trek; no departure is subcontracted to an operator we do not name.",
    verify: {
      label: "Meet the guiding team",
      href: "/team",
      external: false,
    },
    status: "pending",
  },
];

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
