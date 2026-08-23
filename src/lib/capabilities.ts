/**
 * What the site is currently allowed to do.
 *
 * One flag today and it is the one that matters. `BOOKING_ENABLED` gates
 * anything that takes money: a checkout route, a payment element, a button
 * that does more than open an enquiry.
 *
 * It is a constant rather than an environment variable on purpose. An env var
 * can be flipped on a deploy dashboard by somebody who has not read this file,
 * at which point the guard below never runs — the whole value of the check is
 * that turning booking on requires editing a tracked file and therefore
 * passing a build that refuses to complete while any binding policy is a
 * draft.
 *
 * To enable booking: get /cancellation through legal review, set its
 * `reviewStatus` to `approved` with an `approvedBy` and `approvedOn`, and only
 * then change this. `check:policies` fails in the other order, which is the
 * point of it.
 */
export const BOOKING_ENABLED = false;

/**
 * Everything a booking flow would need before it could be honest.
 *
 * Listed rather than implied so that turning the flag on is a decision against
 * a checklist rather than an experiment. The guard enforces the first line;
 * the rest are here because the person who flips the flag should see them.
 */
export const BOOKING_PREREQUISITES = [
  "Every binding policy approved — enforced by check:policies.",
  "PSP-hosted payment fields, so the application never sees a card number.",
  "The passport-data rules in SECURITY.md implemented, not just written.",
  "A refund path that works before the first payment is taken, not after.",
] as const;
