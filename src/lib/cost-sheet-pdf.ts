import type { Departure } from "../content/departures.ts";
import { formatDateRange } from "../content/departures.ts";
import { A4, PdfDocument, textWidth, wrap } from "./pdf.ts";
import { siteConfig } from "./site.ts";

/**
 * The cost sheet as a document you can send to somebody else.
 *
 * This is the artefact a traveller forwards to whoever is actually paying —
 * a parent, a partner, a finance department. That reader will never see the
 * page it came from, so the PDF has to stand alone: the departure it belongs
 * to, the dates, every line, the total, and enough of the contingency position
 * that the awkward part is not left behind on the website.
 *
 * Typographically restrained on purpose. One face in two weights, one rule
 * weight, no colour, no logo block. A cost sheet that looks designed looks
 * like it is selling; this should look like it was produced by whoever does
 * the accounts.
 *
 * The total is computed from the same array the page renders, so the two cannot
 * disagree — and `check:departures` asserts the PDF's total equals the page's.
 */

const M = { left: 48, right: 48, top: 52, bottom: 44 };
const RIGHT = A4.width - M.right;
const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

const CATEGORY_LABEL: Record<string, string> = {
  permits: "Permits and fees",
  transport: "Transport",
  accommodation: "Accommodation",
  meals: "Meals",
  staff: "Staff",
  equipment: "Equipment",
  admin: "Operating",
};

const ORDER = [
  "permits",
  "transport",
  "accommodation",
  "meals",
  "staff",
  "equipment",
  "admin",
];

const WHO_PAYS: Record<string, string> = {
  us: "We pay",
  you: "You pay",
  shared: "Shared",
};

export function costSheetPdf(
  departure: Departure,
  generatedAt: Date,
): Uint8Array {
  const doc = new PdfDocument(A4);
  const included = departure.costSheet.lines.filter((l) => l.included);
  const excluded = departure.costSheet.lines.filter((l) => !l.included);
  const total = included.reduce((sum, l) => sum + l.amountUSD, 0);

  let y = A4.height - M.top;

  /**
   * Move down, starting a new page when the next block would not fit.
   *
   * Everything below asks for space before it writes, so a line and its note
   * can never be split across a page break. A ledger with an orphaned amount at
   * the top of page two is the kind of small wrongness that makes a reader
   * doubt the arithmetic.
   */
  const space = (needed: number) => {
    if (y - needed < M.bottom) {
      doc.newPage();
      y = A4.height - M.top;
      return true;
    }
    return false;
  };

  /* ------------------------------------------------------------- header */

  doc.text("EVEREST TRAILWAYS", M.left, y, { size: 9, face: "bold" });
  doc.textRight("COST SHEET", RIGHT, y, { size: 9, face: "bold", grey: 0.4 });
  y -= 22;

  doc.text(departure.trekName, M.left, y, { size: 18, face: "bold" });
  y -= 16;

  doc.text(
    `${formatDateRange(departure.departsOn, departure.returnsOn)} · ${departure.days} days · ${departure.region}`,
    M.left,
    y,
    { size: 9, grey: 0.35 },
  );
  y -= 11;
  doc.text(
    `Maximum altitude ${departure.maxAltitudeM.toLocaleString("en-GB")} m · Guide ratio ${departure.guideRatio} · Departure ${departure.id}`,
    M.left,
    y,
    { size: 9, grey: 0.35 },
  );
  y -= 16;

  doc.rule(M.left, RIGHT, y, 1, 0.15);
  y -= 18;

  doc.text(
    "Every line below is per person. The included lines add up to the total exactly.",
    M.left,
    y,
    { size: 9 },
  );
  y -= 20;

  /* ------------------------------------------------------------- ledger */

  const amountX = RIGHT;

  for (const category of ORDER) {
    const lines = included.filter((l) => l.category === category);
    if (!lines.length) continue;

    const subtotal = lines.reduce((sum, l) => sum + l.amountUSD, 0);

    space(40);
    doc.text(CATEGORY_LABEL[category].toUpperCase(), M.left, y, {
      size: 8,
      face: "bold",
      grey: 0.35,
    });
    doc.textRight(money(subtotal), amountX, y, { size: 8, grey: 0.45 });
    y -= 5;
    doc.rule(M.left, RIGHT, y, 0.5, 0.8);
    y -= 12;

    for (const line of lines) {
      // The label wraps within the column that stops short of the amount.
      const labelWidth = amountX - M.left - 70;
      const labelLines = wrap(line.label, 9.5, "regular", labelWidth);
      const noteLines = line.note
        ? wrap(line.note, 7.5, "regular", labelWidth)
        : [];

      space(labelLines.length * 11 + noteLines.length * 9 + 6);

      for (const [i, text] of labelLines.entries()) {
        doc.text(text, M.left, y, { size: 9.5 });
        if (i === 0) {
          doc.textRight(money(line.amountUSD), amountX, y, {
            size: 9.5,
            face: "bold",
          });
        }
        y -= 11;
      }
      for (const text of noteLines) {
        doc.text(text, M.left, y, { size: 7.5, grey: 0.45 });
        y -= 9;
      }
      y -= 4;
    }
    y -= 2;
  }

  /* -------------------------------------------------------------- total */

  space(46);
  y -= 2;
  doc.rule(M.left, RIGHT, y, 1.2, 0);
  y -= 18;
  doc.text("TOTAL, PER PERSON", M.left, y, { size: 11, face: "bold" });
  doc.textRight(money(total), amountX, y, { size: 15, face: "bold" });
  y -= 16;

  if (departure.singleSupplementUSD > 0) {
    doc.text(
      `Single supplement, optional: ${money(departure.singleSupplementUSD)}`,
      M.left,
      y,
      { size: 8, grey: 0.4 },
    );
    y -= 10;
  }
  doc.text("There is nothing to pay on arrival.", M.left, y, {
    size: 8,
    grey: 0.4,
  });
  y -= 22;

  /* ------------------------------------------------------- not included */

  space(56);
  doc.text("NOT INCLUDED", M.left, y, { size: 8, face: "bold", grey: 0.35 });
  y -= 5;
  doc.rule(M.left, RIGHT, y, 0.5, 0.8);
  y -= 12;

  for (const line of excluded) {
    const labelLines = wrap(line.label, 9.5, "regular", amountX - M.left - 70);
    space(labelLines.length * 11 + 3);
    for (const [i, text] of labelLines.entries()) {
      doc.text(text, M.left, y, { size: 9.5 });
      if (i === 0) {
        doc.textRight(
          line.amountUSD > 0 ? `${money(line.amountUSD)} est.` : "varies",
          amountX,
          y,
          { size: 9.5, grey: 0.35 },
        );
      }
      y -= 11;
    }
    y -= 1;
  }
  y -= 14;

  /* ------------------------------------------------- when things go wrong */

  space(62);
  doc.text("WHEN THINGS GO WRONG", M.left, y, {
    size: 8,
    face: "bold",
    grey: 0.35,
  });
  y -= 5;
  doc.rule(M.left, RIGHT, y, 0.5, 0.8);
  y -= 13;

  for (const item of departure.costSheet.contingencies) {
    const width = RIGHT - M.left;
    const triggerLines = wrap(item.trigger, 9, "bold", width);
    const doLines = wrap(`What we do: ${item.whatWeDo}`, 7.5, "regular", width);

    space(triggerLines.length * 10.5 + doLines.length * 9 + 20);

    for (const text of triggerLines) {
      doc.text(text, M.left, y, { size: 9, face: "bold" });
      y -= 10.5;
    }
    for (const text of doLines) {
      doc.text(text, M.left, y, { size: 7.5, grey: 0.4 });
      y -= 9;
    }

    const cost = Array.isArray(item.estimatedCostUSD)
      ? `${money(item.estimatedCostUSD[0])}–${money(item.estimatedCostUSD[1])}`
      : item.estimatedCostUSD !== undefined
        ? money(item.estimatedCostUSD)
        : "";
    doc.text(
      [WHO_PAYS[item.whoPays], cost, `Insurance: ${item.coveredByInsurance}`]
        .filter(Boolean)
        .join("   ·   "),
      M.left,
      y,
      { size: 7.5, face: "bold", grey: 0.2 },
    );
    y -= 15;
  }

  /* ---------------------------------------------------------- insurance */

  const ins = departure.costSheet.insuranceRequirement;
  space(70);
  doc.text("INSURANCE YOU MUST HAVE", M.left, y, {
    size: 8,
    face: "bold",
    grey: 0.35,
  });
  y -= 5;
  doc.rule(M.left, RIGHT, y, 0.5, 0.8);
  y -= 13;
  doc.text(
    `Minimum medical cover ${money(ins.minimumMedicalCoverUSD)}   ·   Helicopter evacuation ${ins.mustCoverHelicopterEvacuation ? "required" : "not required"}   ·   Must cover you to ${ins.mustCoverAltitudeM.toLocaleString("en-GB")} m`,
    M.left,
    y,
    { size: 8.5, face: "bold" },
  );
  y -= 13;
  for (const text of wrap(
    ins.weatherDelayNote,
    7.5,
    "regular",
    RIGHT - M.left,
  )) {
    doc.text(text, M.left, y, { size: 7.5, grey: 0.4 });
    y -= 9;
  }
  y -= 12;

  /* ------------------------------------------------------------ tipping */

  const [tipLow, tipHigh] = departure.costSheet.tipping.typicalRangeUSD;
  space(28);
  doc.text(
    `Tipping is not included and not compulsory. Typical for this trip: ${money(tipLow)}–${money(tipHigh)} per person across all staff.`,
    M.left,
    y,
    { size: 8.5 },
  );
  y -= 20;

  /* ------------------------------------------------------------- footer */

  space(34);
  doc.rule(M.left, RIGHT, y, 0.5, 0.8);
  y -= 12;
  const stamp = generatedAt.toISOString().replace("T", " ").slice(0, 16);
  doc.text(
    `Generated ${stamp} UTC. Figures are per person in US dollars.`,
    M.left,
    y,
    { size: 8, grey: 0.45 },
  );
  const url = `${siteConfig.url}/departures/${departure.slug}#cost-sheet`;
  const urlText = url.replace(/^https:\/\//, "");
  if (textWidth(urlText, 8, "regular") < RIGHT - M.left - 260) {
    doc.textRight(urlText, RIGHT, y, { size: 8, grey: 0.45 });
  }

  /*
   * Numbered, because this document runs to two pages and it gets forwarded.
   *
   * The brief asked for one page. It does not fit on one, and the two candidates
   * for deletion were the per-line arithmetic and the contingency section —
   * that is, the two things that make it worth sending. A cost sheet trimmed to
   * a page count is a cost sheet with something quietly left out, which is the
   * practice this whole section exists to argue against. So: all of it, on as
   * many pages as it takes, with "Page 1 of 2" so nobody prints half of it and
   * believes they have the whole thing.
   */
  doc.stampPageNumbers(RIGHT, M.bottom - 20);

  return doc.toBytes();
}

/** The figure the page must agree with. Used by the guard and by the route. */
export function pdfLedgerTotal(departure: Departure): number {
  return departure.costSheet.lines
    .filter((l) => l.included)
    .reduce((sum, l) => sum + l.amountUSD, 0);
}
