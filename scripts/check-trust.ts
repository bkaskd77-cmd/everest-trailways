/**
 * Trust-claim guard.
 *
 *     pnpm check:trust
 *
 * Stops us shipping an unearned trust signal by accident. Three checks:
 *
 *   1. A point marked `verified` must not still carry a placeholder in its
 *      figure or its verify link. That combination is how a fabricated
 *      credential reaches production — someone flips the status while the
 *      number is still a dash.
 *   2. `body` must not contain a marketing adjective.
 *   3. Every point needs a real verify href and label.
 *
 * Exits non-zero on any failure, so CI blocks the deploy.
 */

import { CREDENTIALS } from "../src/content/credentials.ts";
import {
  BANNED_ADJECTIVES,
  PLACEHOLDERS,
  trustPoints,
} from "../src/content/trust-points.ts";

type Problem = { id: string; rule: string; detail: string };

const isPlaceholder = (value: string) =>
  PLACEHOLDERS.includes(value.trim()) || value.trim().length === 0;

const problems: Problem[] = [];

for (const point of trustPoints()) {
  const { id, figure, body, verify, status } = point;

  if (status === "verified") {
    if (isPlaceholder(figure)) {
      problems.push({
        id,
        rule: "verified-with-placeholder",
        detail: `figure is "${figure}" — a verified claim needs a real value`,
      });
    }
    if (isPlaceholder(verify.href)) {
      problems.push({
        id,
        rule: "verified-with-placeholder",
        detail: `verify.href is "${verify.href}" — a verified claim needs somewhere to check`,
      });
    }
  }

  if (!verify.href.trim() || !verify.label.trim()) {
    problems.push({
      id,
      rule: "missing-proof",
      detail: "every point needs a verify label and href",
    });
  }

  if (verify.external && !/^https?:\/\//.test(verify.href)) {
    problems.push({
      id,
      rule: "missing-proof",
      detail: `verify.external is true but href "${verify.href}" is not absolute`,
    });
  }

  const lower = body.toLowerCase();
  for (const word of BANNED_ADJECTIVES) {
    // Word-boundary match so "bestseller" does not trip on "best".
    const pattern = new RegExp(`(^|[^a-z])${escapeRegExp(word)}([^a-z]|$)`);
    if (pattern.test(lower)) {
      problems.push({
        id,
        rule: "marketing-adjective",
        detail: `body contains "${word}" — say something checkable instead`,
      });
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------- a link must not overstate its proof */

/*
 * A verify link pointing at a public register while the record is not in it.
 *
 * The registrations point linked straight to the TAAN member directory while
 * our TAAN credential was pending and its number read "-". Follow it, search,
 * find nothing: a reader concludes we are lying, and that is a reasonable
 * conclusion from what they were shown. "Not yet listed" is a fine thing to
 * say; being caught not saying it is not.
 */
const PENDING_FRAMING =
  /not yet|pending|still to|what we do not|awaiting|once (we|the)/i;

for (const point of trustPoints()) {
  const credentialId = point.verify.confirms;
  if (!credentialId) continue;

  const credential = CREDENTIALS.find((c) => c.id === credentialId);
  if (!credential) {
    problems.push({
      id: point.id,
      rule: "verify-names-unknown-credential",
      detail: `its verify link names "${credentialId}", which is not a credential`,
    });
    continue;
  }

  if (credential.status === "verified") continue;

  if (point.verify.external) {
    problems.push({
      id: point.id,
      rule: "verify-overstates-proof",
      detail: `links out to a public register while "${credential.name}" is ${credential.status} — a reader who searches and finds nothing concludes we are lying`,
    });
  }
  if (!PENDING_FRAMING.test(point.verify.label)) {
    problems.push({
      id: point.id,
      rule: "verify-overstates-proof",
      detail: `its link reads "${point.verify.label}" while "${credential.name}" is ${credential.status}, without saying so`,
    });
  }
}

const pending = trustPoints().filter((p) => p.status === "pending").length;
const verified = trustPoints().length - pending;

console.log("\n  Trust claims\n");
for (const point of trustPoints()) {
  const flag = problems.some((p) => p.id === point.id) ? "FAIL" : "ok";
  console.log(
    `  ${flag.padEnd(5)} ${point.id.padEnd(16)} ${point.status.padEnd(9)} ${point.figure.padEnd(6)} → ${point.verify.href}`,
  );
}

if (problems.length) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    [${p.rule}] ${p.id}: ${p.detail}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${trustPoints().length} claims · ${verified} verified · ${pending} pending · no problems\n`,
  );
}
