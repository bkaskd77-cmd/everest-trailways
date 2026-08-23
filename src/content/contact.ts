/*
 * ============================================================================
 * PLACEHOLDER ADDRESS AND NUMBER. NEITHER IS REAL.
 * ============================================================================
 */

import { RESPONSE_COMMITMENT, WHATSAPP_NUMBER } from "./ask-source.ts";

/**
 * One source for the things that appear in more than one place.
 *
 * The response commitment is already quoted by the ask panel on every
 * departure page; the contact page quotes the same constant rather than its
 * own copy, because two versions of "we reply within four hours" is how a site
 * ends up promising three hours somewhere nobody looks.
 */
export const CONTACT = {
  responseCommitment: RESPONSE_COMMITMENT,
  whatsappNumber: WHATSAPP_NUMBER,
  email: "hello@everest-trailways.example",
  /** 24-hour NPT. Used to compute the reader's local equivalent. */
  hours: { fromHourNPT: 6, toHourNPT: 22 },
  /** Nepal is UTC+05:45. The forty-five minutes are the point. */
  utcOffsetMinutes: 345,
  office: {
    line1: "PLACEHOLDER — street address",
    line2: "PLACEHOLDER — ward and district",
    city: "Kathmandu",
    country: "Nepal",
    note: "PLACEHOLDER ADDRESS. The office is real and visitable; this text is not the address and must be replaced before launch.",
  },
} as const;

export { RESPONSE_COMMITMENT, WHATSAPP_NUMBER };

/**
 * What we can answer now, and what needs somebody to check.
 *
 * Published because the alternative is a contact page implying every question
 * gets the same four-hour answer, and then a traveller waiting a day for a
 * permit question while wondering whether they have been forgotten. Saying
 * which is which costs nothing and removes the wondering.
 */
export const ANSWER_SPEED: { immediate: string[]; needsADay: string[] } = {
  immediate: [
    "Anything already on the site — a price, a date, what is included, how high a route sleeps.",
    "Whether a departure has space, and how many bookings it needs to run.",
    "What your insurance has to cover for a particular trip.",
    "Whether a date can be moved, and what that would cost.",
  ],
  needsADay: [
    "Anything that depends on a permit office, which keeps its own hours and its own pace.",
    "A private departure on dates we do not currently run — we have to check staff and lodges before answering.",
    "Whether a specific guide is available, because that depends on a roster we do not edit at midnight.",
    "Anything medical. We are not qualified to answer it and will say so rather than guess.",
  ],
};

/**
 * The office hours in the reader's own time.
 *
 * Nepal is UTC+05:45 and the forty-five minutes are exactly the detail that
 * makes a reader mis-time a message. Computed in the browser from the reader's
 * own offset rather than guessed on the server, and rendered beside the NPT
 * figure rather than instead of it — the NPT hours are the fact, the local
 * ones are the convenience.
 */
export function localHours(readerOffsetMinutes: number) {
  const shift = (readerOffsetMinutes - CONTACT.utcOffsetMinutes) / 60;
  const wrap = (h: number) => ((h % 24) + 24) % 24;
  const fmt = (h: number) => {
    const whole = Math.floor(wrap(h));
    const minutes = Math.round((wrap(h) - whole) * 60);
    return `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  return {
    from: fmt(CONTACT.hours.fromHourNPT + shift),
    to: fmt(CONTACT.hours.toHourNPT + shift),
    /* True when the window crosses midnight where the reader is. */
    crossesMidnight:
      wrap(CONTACT.hours.fromHourNPT + shift) >
      wrap(CONTACT.hours.toHourNPT + shift),
  };
}

/**
 * What the form is allowed to ask for.
 *
 * The step 6a rule, applied at the point it is easiest to break. A contact
 * form is where "while we have them, let us also collect…" happens, and every
 * field added here is a field that has to be stored, secured, and deleted on a
 * schedule. Passport, date of birth and address are collected after a
 * confirmed booking, uploaded directly to encrypted storage, and never through
 * a form on a public page.
 */
export const CONTACT_FIELDS = [
  { name: "subject", label: "What is this about?", kind: "select" },
  { name: "message", label: "Your question", kind: "textarea" },
  {
    name: "reply",
    label: "Email or WhatsApp number to reply to",
    kind: "text",
  },
] as const;

/** Never, on any public form. The guard reads this list. */
export const FORBIDDEN_FIELDS = [
  "passport",
  "passportNumber",
  "dateOfBirth",
  "dob",
  "address",
  "postcode",
  "nationality",
  "cardNumber",
  "emergencyContact",
] as const;

export const SUBJECTS = [
  "A departure on the site",
  "A private or custom trip",
  "An activity",
  "Something about an existing booking",
  "Something else",
] as const;
