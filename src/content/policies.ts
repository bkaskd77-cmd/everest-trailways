/**
 * The review state of every policy document on the site.
 *
 * This exists because of one page. /cancellation was built with invented
 * commercial terms and a note in the commit saying it should not go live —
 * which is a warning in a place nobody reads, protecting nothing. A note is
 * not a mechanism. The state below is.
 *
 * The distinction that decides everything here is `binding`: does this
 * document create obligations a lawyer needs to have read? A refund scale is a
 * contract term and does. A page describing how we price, or listing which
 * registrations we hold, describes rather than binds — those can carry
 * placeholders honestly labelled inline, and do, without needing counsel to
 * approve the sentence structure.
 *
 * The safety page sits closest to the line. It makes operational commitments
 * rather than contractual ones, and every unconfirmed figure on it is marked
 * PLACEHOLDER in place rather than presented as settled. If that ever stops
 * being true it should be reclassified here, not argued about in a review.
 */

export type ReviewStatus = "draft" | "legal-review" | "approved";

export type PolicyDocument = {
  id: string;
  /** The route it lives at. Used by the sitemap and the citation rules. */
  path: string;
  title: string;
  /**
   * Does this document create obligations that need legal review?
   *
   * Only `binding` documents block the booking capability. Getting this wrong
   * in the permissive direction is the dangerous one, so the default when
   * unsure is `true`.
   */
  binding: boolean;
  /** How another page refers to it in a sentence. "our cancellation policy". */
  citedAs: string;
  reviewStatus: ReviewStatus;
  approvedBy?: string;
  approvedOn?: string;
  /** ISO date. Rendered on the page whatever the state. */
  lastReviewed: string;
  /** Why it is in this state. Shown in the banner when unapproved. */
  note?: string;
};

export const POLICIES: PolicyDocument[] = [
  {
    id: "cancellation",
    citedAs: "cancellation policy",
    path: "/cancellation",
    title: "Cancellation and refunds",
    binding: true,
    reviewStatus: "draft",
    lastReviewed: "2026-08-23",
    note: "Every percentage, day count and deposit figure on this page is invented. The structure and the mechanics are real; the terms are not, and they bind the company once they are. Nothing here has been drafted or reviewed by a lawyer.",
  },
  {
    id: "safety",
    citedAs: "safety standards",
    path: "/safety",
    title: "Safety",
    binding: false,
    /*
     * Not approved, and it should never have been.
     *
     * It rendered "Approved by Operations" over four unwritten sections — the
     * equipment list, the evacuation commission position, porter load and
     * insurance figures, and incident reporting. One of those carries a note
     * saying it "must not ship vague", which is a document arguing with its
     * own status line. Approval is a claim like any other and has to be earned
     * by the content; `check:policies` now fails an approved document that
     * still renders a placeholder.
     */
    reviewStatus: "draft",
    lastReviewed: "2026-08-23",
    note: "Four sections are still unwritten: the equipment carried at altitude, our position on evacuation commission, porter load limits and insurance figures, and incident reporting. What is settled — the descent rule, the ratios, acclimatisation, rescue coordination and the limits of what we do — is written in full and is not waiting on those.",
  },
  {
    id: "pricing",
    citedAs: "pricing methodology",
    path: "/pricing",
    title: "How we price",
    binding: false,
    reviewStatus: "approved",
    approvedBy: "Operations",
    approvedOn: "2026-08-23",
    lastReviewed: "2026-08-23",
    note: "Describes the method behind the cost sheets. Every figure on it is computed from the published ledgers rather than stated.",
  },
  {
    id: "licences",
    citedAs: "licences page",
    path: "/licences",
    title: "Licences and registrations",
    binding: false,
    reviewStatus: "approved",
    approvedBy: "Operations",
    approvedOn: "2026-08-23",
    lastReviewed: "2026-08-23",
    note: "A statement of what we hold. Every credential renders “—” until a document exists, which the page says in its own banner.",
  },
];

export const policyById = (id: string) => POLICIES.find((p) => p.id === id);
export const policyByPath = (path: string) =>
  POLICIES.find((p) => p.path === path);

export const isApproved = (p: PolicyDocument) => p.reviewStatus === "approved";

/** Unapproved documents are kept out of the index and the sitemap. */
export const unapprovedPolicies = () => POLICIES.filter((p) => !isApproved(p));

/**
 * Binding documents nobody has approved.
 *
 * The set that blocks checkout. Selling a trip on top of a refund policy that
 * is admittedly invented would be the single worst thing this codebase could
 * ship, and it is exactly the kind of thing that happens because a payment
 * integration lands on a Friday and nobody rereads a comment written in
 * August.
 */
export const blockingPolicies = () =>
  POLICIES.filter((p) => p.binding && !isApproved(p));

/**
 * How a page should refer to a policy it cites.
 *
 * The departure FAQ said "our cancellation terms are published in full and not
 * summarised here in a way that could differ from them" — which reads as a
 * pointer to a settled document, and points at a draft. While a policy is
 * unapproved the citing page has to say so, in the same sentence, rather than
 * lending it authority it has not earned.
 */
export function citationFor(id: string): {
  settled: boolean;
  sentence: string;
} {
  const policy = policyById(id);
  if (!policy) {
    return {
      settled: false,
      sentence: "That policy is not published yet.",
    };
  }
  if (isApproved(policy)) {
    return {
      settled: true,
      sentence: `Our ${policy.citedAs} is published in full and not summarised here in a way that could differ from it.`,
    };
  }
  return {
    settled: false,
    sentence: `Our ${policy.citedAs} is still in draft and not yet approved, so nothing here or there is a final term — what follows is what we intend and what we will be bound by once it is signed off.`,
  };
}
