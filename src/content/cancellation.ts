/*
 * ============================================================================
 * PLACEHOLDER COMMERCIAL TERMS. REQUIRES LEGAL REVIEW BEFORE LAUNCH.
 * ============================================================================
 *
 * This page is legally binding on the company. What is built here is the
 * STRUCTURE — the shape of a cancellation policy and the mechanics that keep
 * every other page from contradicting it. The commercial figures are invented
 * and collected in ONE block below so they can be replaced in a single edit.
 *
 * Nothing in this file has been drafted or reviewed by a lawyer. "Force
 * majeure" in particular is a term with a specific legal meaning that varies
 * by jurisdiction, and the wording here is a placeholder for wording that a
 * lawyer writes. Publishing this as-is would be binding the company to terms
 * nobody qualified has read.
 * ============================================================================
 */

/**
 * EVERY commercial figure on the cancellation page, in one place.
 *
 * Collected deliberately. Sliding-scale percentages scattered through prose
 * are how a policy ends up saying 50% in one paragraph and half in another,
 * and how a departure FAQ ends up quoting a band that no longer exists.
 */
export const CANCELLATION_TERMS = {
  placeholder: true,
  lastReviewed: "2026-08-23",
  /** Days before departure → what the traveller gets back. */
  slidingScale: [
    { fromDaysBefore: 60, refundPercent: 100, note: "PLACEHOLDER" },
    { fromDaysBefore: 45, refundPercent: 75, note: "PLACEHOLDER" },
    { fromDaysBefore: 30, refundPercent: 50, note: "PLACEHOLDER" },
    { fromDaysBefore: 14, refundPercent: 25, note: "PLACEHOLDER" },
    { fromDaysBefore: 0, refundPercent: 0, note: "PLACEHOLDER" },
  ],
  /** Refunded in full when WE cancel, whatever the notice. Not a placeholder. */
  weCancelRefundPercent: 100,
  depositPercent: 20,
  refundWithinDays: 14,
  transferFeeUSD: 0,
  transfersAllowedUntilDaysBefore: 30,
  /** What is never refundable, and why. */
  nonRefundable: [
    {
      item: "PLACEHOLDER — permits already issued",
      why: "Issued in your name and not returnable to the issuing body once bought.",
    },
    {
      item: "PLACEHOLDER — domestic flights already ticketed",
      why: "Nepali domestic carriers do not refund these to us either.",
    },
  ],
} as const;

export type CancellationTerms = typeof CANCELLATION_TERMS;

/**
 * The refund a traveller would get, from the scale rather than from prose.
 *
 * Exported so a departure FAQ can quote the policy instead of restating it.
 * The guard fails if a departure page states a term this function would not
 * produce — which is the whole reason it is a function.
 */
export function refundPercentFor(daysBefore: number): number {
  const band = [...CANCELLATION_TERMS.slidingScale]
    .sort((a, b) => b.fromDaysBefore - a.fromDaysBefore)
    .find((b) => daysBefore >= b.fromDaysBefore);
  return band?.refundPercent ?? 0;
}
