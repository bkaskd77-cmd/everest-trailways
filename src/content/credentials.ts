/*
 * ============================================================================
 * NOT ONE NUMBER IN THIS FILE IS REAL. EVERY `number` FIELD IS "—".
 * ============================================================================
 *
 * This is the hardest rule in the project and the easiest to break, because a
 * plausible registration number is four digits and a hyphen and nobody checks
 * it. A fabricated credential on the page that argues for verifiability is the
 * worst single failure available to this site — worse than a missing page,
 * worse than a broken build, because it converts the whole argument into its
 * opposite and does so quietly.
 *
 * So: the structure is real, the credentials are placeholders, and every one
 * renders as "—" with status `pending` until somebody holds the document.
 * `check:credentials` fails on any number present without status `verified`.
 * ============================================================================
 */

export type CredentialStatus = "verified" | "pending";

export type Credential = {
  id: string;
  name: string;
  issuingBody: string;
  /** "—" until verified. A string, because registrations are not integers. */
  number: string;
  issuedOn?: string;
  expiresOn?: string;
  /** Where a reader checks it themselves, without asking us. */
  verifyUrl?: string;
  /** A scan, once we hold one. */
  documentImage?: string;
  status: CredentialStatus;
  /** What holding this actually establishes. */
  whatItMeans: string;
  /**
   * REQUIRED. What it does not establish.
   *
   * A licence proves registration, not competence. Operators publish the first
   * half of that sentence and stop, which lets a reader infer the second. This
   * field exists so the page cannot do that: every credential has to say what
   * somebody would be wrong to conclude from it.
   */
  whatItDoesNotMean: string;
  /** How a traveller confirms it without taking our word for it. */
  howToVerify: string;
};

export const CREDENTIALS: Credential[] = [
  {
    id: "company-registration",
    name: "Company registration",
    issuingBody: "Office of the Company Registrar, Nepal",
    number: "—",
    status: "pending",
    whatItMeans:
      "The company exists as a legal entity in Nepal, with named directors and a registered address that can be served with legal process.",
    whatItDoesNotMean:
      "It says nothing about whether we are any good at running treks. A registered company can be a bad operator; an unregistered one cannot be held to anything at all.",
    howToVerify:
      "The registrar maintains a public register searchable by company name. Ask us for the registration number and check it there rather than here.",
  },
  {
    id: "trekking-agency-licence",
    name: "Trekking agency licence",
    issuingBody: "Department of Tourism, Nepal",
    number: "—",
    status: "pending",
    whatItMeans:
      "We are licensed to sell and operate trekking trips. Operating without one is illegal, and a company that cannot show you one is either new, informal, or working under somebody else's licence.",
    whatItDoesNotMean:
      "It is not a safety rating and not a quality mark. It does not mean anybody has inspected a trip we ran, spoken to a client of ours, or checked the qualifications of the guide you will actually walk with.",
    howToVerify:
      "The Department of Tourism publishes licensed agencies. Match the licence number to the company name, and check the name is the one on your invoice.",
  },
  {
    id: "taan-membership",
    name: "TAAN membership",
    issuingBody: "Trekking Agencies' Association of Nepal",
    number: "—",
    status: "pending",
    whatItMeans:
      "Membership of the industry association, which sets a code of conduct and provides a complaints route that is not us.",
    whatItDoesNotMean:
      "TAAN is a trade association, not a regulator. Membership is not an audit, and it does not mean TAAN has verified how we pay porters or how we handle an evacuation.",
    howToVerify:
      "TAAN publishes a member directory. Search the company name; the record shows the membership number and status.",
  },
  {
    id: "nma-membership",
    name: "NMA membership",
    issuingBody: "Nepal Mountaineering Association",
    number: "—",
    status: "pending",
    whatItMeans:
      "Membership of the body that issues permits for trekking peaks and runs mountaineering training in Nepal.",
    whatItDoesNotMean:
      "It is not a climbing qualification held by any particular guide, and none of the trips we currently sell is a climbing trip.",
    howToVerify:
      "The NMA maintains a member list. Ask us for the number and check it against the company name.",
  },
  {
    id: "tax-registration",
    name: "Tax registration (PAN/VAT)",
    issuingBody: "Inland Revenue Department, Nepal",
    number: "—",
    status: "pending",
    whatItMeans:
      "We are registered for tax and issue receipts that are valid documents. It also means our turnover is visible to somebody other than us.",
    whatItDoesNotMean:
      "It is not evidence of financial health, and it does not protect your deposit if the company fails.",
    howToVerify:
      "The registration number appears on every invoice we issue. It can be checked against the Inland Revenue register.",
  },
  {
    id: "liability-insurance",
    name: "Company liability insurance",
    issuingBody: "—",
    number: "—",
    status: "pending",
    whatItMeans: "Cover for claims arising from our operation of a trip.",
    whatItDoesNotMean:
      "It is not your travel insurance and does not replace it. It does not pay for your helicopter, your hospital, or your cancelled flight. You are required to hold your own policy and every departure page says what it must cover.",
    howToVerify:
      "Ask us for the policy number, the insurer, the cover limit and the expiry date. Any of those alone is not an answer.",
  },
  {
    id: "staff-insurance",
    name: "Staff insurance — guides and porters",
    issuingBody: "—",
    number: "—",
    status: "pending",
    whatItMeans:
      "Medical and accident cover for the people who work on your trip. This is the credential travellers ask about least and porters need most.",
    whatItDoesNotMean:
      "A policy existing is not the same as it being adequate, current, or covering the altitude your trip reaches. The cover limit and the altitude ceiling are the numbers that matter, and both are on this page once verified.",
    howToVerify:
      "Ask for the insurer, the per-person limit and the altitude ceiling. Compare the ceiling with the maximum altitude on your departure page.",
  },
];

export const credentialById = (id: string) =>
  CREDENTIALS.find((c) => c.id === id);

/**
 * What the footer prints.
 *
 * Driven from this file rather than typed into the footer, so the two cannot
 * drift — the footer used to carry its own "TAAN Member No. —" and would have
 * gone on saying it after the real number arrived here.
 */
export const footerCredentials = () =>
  ["taan-membership", "trekking-agency-licence"]
    .map((id) => credentialById(id))
    .filter((c): c is Credential => Boolean(c))
    .map((c) => ({
      label:
        c.id === "taan-membership" ? "TAAN Member No." : "Tourism Licence No.",
      number: c.number,
    }));

export const verifiedCount = () =>
  CREDENTIALS.filter((c) => c.status === "verified").length;
