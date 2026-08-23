/**
 * Policy review state, and the one thing it must make impossible.
 *
 *     pnpm check:policies
 *
 * The rule this file exists for is a single line: booking cannot be enabled
 * while a binding policy is a draft. Selling a trip on top of a refund policy
 * that is admittedly invented would be the worst thing this codebase could
 * ship, and it is not the kind of thing anybody decides to do — it is the kind
 * of thing that happens because a payment integration lands on a Friday and
 * nobody rereads a comment written in August.
 *
 * A comment is not a mechanism. This is.
 */

import { readFile } from "node:fs/promises";

import { callsFunction, executable } from "./lib/source.ts";
import path from "node:path";

import { BOOKING_ENABLED } from "../src/lib/capabilities.ts";
import {
  POLICIES,
  blockingPolicies,
  citationFor,
  isApproved,
} from "../src/content/policies.ts";
import { departures } from "../src/content/departures.ts";

const root = process.cwd();

type Problem = { id: string; rule: string; detail: string };
const problems: Problem[] = [];
const fail = (id: string, rule: string, detail: string) =>
  problems.push({ id, rule, detail });

/* ------------------------------------------------- the capability gate */

const blocking = blockingPolicies();

if (BOOKING_ENABLED && blocking.length) {
  fail(
    "booking",
    "booking-on-a-draft-policy",
    `booking is enabled while ${blocking.length} binding polic${blocking.length === 1 ? "y is" : "ies are"} unapproved: ${blocking
      .map((p) => `${p.path} (${p.reviewStatus})`)
      .join(
        ", ",
      )} — take payment on a draft refund policy and the terms a customer agreed to do not exist`,
  );
}

/* ------------------------------------------------------ record coherence */

for (const p of POLICIES) {
  if (isApproved(p) && (!p.approvedBy || !p.approvedOn)) {
    fail(
      p.id,
      "approved-without-approver",
      "is marked approved with nobody and no date attached, which is not an approval",
    );
  }
  if (!isApproved(p) && (p.approvedBy || p.approvedOn)) {
    fail(
      p.id,
      "unapproved-with-approver",
      "carries an approver while still unapproved",
    );
  }
  if (!isApproved(p) && !p.note) {
    fail(
      p.id,
      "draft-without-reason",
      "is unapproved and does not say why, so the banner has nothing to tell a reader",
    );
  }
  if (p.approvedOn && p.approvedOn < p.lastReviewed) {
    fail(
      p.id,
      "approval-predates-review",
      `was approved ${p.approvedOn} and last reviewed ${p.lastReviewed}, so the approval is for an older version`,
    );
  }
}

/* -------------------------------------------------- pages that cite them */

/*
 * A page citing an unapproved policy must not lend it authority.
 *
 * The departure FAQ said "our cancellation terms are published in full and not
 * summarised here in a way that could differ from them" — which reads as a
 * pointer to a settled document and pointed at a draft. `citationFor` composes
 * the right sentence for the state; this checks nobody has typed one instead.
 */
const SETTLED_PHRASES = [
  /published in full and not summarised/i,
  /our (cancellation|refund) terms are published/i,
  /as set out in our (cancellation|refund) policy/i,
];

for (const d of departures) {
  for (const faq of d.faqs) {
    const mentionsCancelling = /cancel|refund/i.test(faq.answer);
    if (!mentionsCancelling) continue;
    const cancellationApproved = isApproved(
      POLICIES.find((p) => p.id === "cancellation")!,
    );
    if (cancellationApproved) continue;

    for (const phrase of SETTLED_PHRASES) {
      if (!phrase.test(faq.answer)) continue;
      fail(
        d.id,
        "cites-a-draft-as-settled",
        `an answer cites the cancellation policy as settled while it is a draft — use citationFor("cancellation")`,
      );
    }
  }
}

/* Whatever `citationFor` produces has to be honest about the state. */
for (const p of POLICIES) {
  const c = citationFor(p.id);
  if (c.settled !== isApproved(p)) {
    fail(
      p.id,
      "citation-state-mismatch",
      "citationFor disagrees with the record",
    );
  }
  if (!isApproved(p) && !/draft|not yet approved/i.test(c.sentence)) {
    fail(
      p.id,
      "citation-state-mismatch",
      "the composed citation does not say the policy is unapproved",
    );
  }
}

/* ------------------------------------------- noindex and sitemap absence */

for (const p of POLICIES) {
  const file = path.join(root, `src/app${p.path}/page.tsx`);
  const source = await readFile(file, "utf8").catch(() => "");
  if (!source) {
    fail(p.id, "missing-page", `no page at src/app${p.path}/page.tsx`);
    continue;
  }
  /*
   * The `robots` directive itself has to be gated, not merely the helper
   * present somewhere in the file.
   *
   * This looked for the name anywhere in the source, which the helper's own
   * declaration satisfies — so removing the gate from `robots` and leaving the
   * function defined passed the check. The mutation caught it, which is the
   * second time on this project that a rule has been satisfiable by a leftover
   * definition rather than a use.
   */
  /*
   * The gate on `robots`, through the shared reader.
   *
   * The first version looked for the helper's name anywhere in the file, which
   * its own declaration satisfied. The second pinned the exact `robots:`
   * shape, which worked and was brittle. This asks the real question — is the
   * helper called at all, and is the robots directive the thing calling it.
   */
  if (
    !callsFunction(source, "policyIsApproved") ||
    !/robots:\s*policyIsApproved\(/.test(executable(source))
  ) {
    fail(
      p.id,
      "index-not-gated",
      "does not gate its robots directive on the review state, so a draft could be indexed",
    );
  }
  if (!source.includes(`policyId="${p.id}"`)) {
    fail(
      p.id,
      "banner-not-wired",
      "does not pass its policyId to the document template, so it cannot render the draft banner",
    );
  }
}

const sitemapSource = await readFile(
  path.join(root, "src/app/sitemap.ts"),
  "utf8",
).catch(() => "");

if (!sitemapSource) {
  fail("sitemap", "no-sitemap", "there is no sitemap");
} else if (!/POLICIES\.filter\(isApproved\)/.test(sitemapSource)) {
  fail(
    "sitemap",
    "sitemap-lists-drafts",
    "does not filter policies to approved ones — a sitemap entry is an invitation, and a draft refund policy must not be one",
  );
}

/* ------------------------------------------------------------------ report */

console.log("\n  Policy review state\n");
for (const p of POLICIES) {
  const mark = isApproved(p) ? "ok   " : "DRAFT";
  console.log(
    `  ${mark} ${p.path.padEnd(16)} ${p.reviewStatus.padEnd(14)} ${p.binding ? "binding" : "descriptive"}`,
  );
}
console.log(
  `\n  ok    booking ${BOOKING_ENABLED ? "ENABLED" : "disabled"}, ${blocking.length} binding polic${blocking.length === 1 ? "y" : "ies"} unapproved`,
);

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
