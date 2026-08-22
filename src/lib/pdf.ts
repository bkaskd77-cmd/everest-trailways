/**
 * A very small PDF writer.
 *
 * Enough of PDF 1.4 to set text in the two base-14 Helvetica faces, draw rules,
 * and paginate. No dependency, which is deliberate: a PDF library is a large
 * amount of code running on our server to produce a document that is, in this
 * case, forty lines of text and a few horizontal rules. Step 6a pinned every
 * dependency and wrote down why; adding one the week after to draw a table
 * would be answering a different question than the one that was asked.
 *
 * What it does not do: images, embedded fonts, compression, unicode beyond
 * WinAnsi. If any of those are ever needed, that is the moment to reach for a
 * real library rather than to grow this one.
 */

/* ------------------------------------------------------- font metrics */

/**
 * Glyph widths in 1/1000 em, for the two faces used here.
 *
 * Needed because the amounts in a ledger are right-aligned, and right-aligning
 * text means knowing how wide it is. These are the published Adobe metrics for
 * Helvetica and Helvetica-Bold; base-14 fonts are guaranteed present in every
 * PDF reader, which is why no font has to be embedded.
 */
const HELVETICA =
  "278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584"
    .split(" ")
    .map(Number);

const HELVETICA_BOLD =
  "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584"
    .split(" ")
    .map(Number);

export type Face = "regular" | "bold";

/**
 * WinAnsi replacements for the characters this site's prose actually uses.
 *
 * The content is written for the web and contains en dashes, curly quotes and
 * middots. PDF's WinAnsiEncoding has all of them at high code points, so they
 * are mapped rather than stripped — a cost sheet that renders "500ï¿½1,000"
 * would undermine the document more than a plain hyphen would.
 */
const WIN_ANSI: Record<string, number> = {
  "–": 0x96, // –
  "—": 0x97, // —
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "·": 0xb7,
  " ": 0x20,
  "…": 0x85,
};

function widthOf(char: string, face: Face): number {
  const table = face === "bold" ? HELVETICA_BOLD : HELVETICA;
  const code = char.charCodeAt(0);
  if (code >= 32 && code <= 126) return table[code - 32];
  // Mapped characters are all punctuation of roughly this width; anything else
  // has been replaced by a question mark, which is 556/611.
  return face === "bold" ? 556 : 556;
}

/** Width of a string at a given size, in points. */
export function textWidth(text: string, size: number, face: Face): number {
  let total = 0;
  for (const char of text) total += widthOf(char, face);
  return (total * size) / 1000;
}

/** Wrap to a pixel width, breaking on spaces. */
export function wrap(
  text: string,
  size: number,
  face: Face,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, face) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Escape and re-encode one string for a PDF text object. */
function pdfString(text: string): string {
  let out = "";
  for (const char of text) {
    const mapped = WIN_ANSI[char];
    if (mapped !== undefined) {
      out += `\\${mapped.toString(8).padStart(3, "0")}`;
      continue;
    }
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code >= 32 && code <= 126) out += char;
    else out += "?";
  }
  return out;
}

/* ---------------------------------------------------------- the writer */

export type PageSize = { width: number; height: number };
/** A4, in points. */
export const A4: PageSize = { width: 595.28, height: 841.89 };

export class PdfDocument {
  private pages: string[] = [];
  private current: string[] = [];

  // Written out rather than a parameter property: `check:departures` loads this
  // through Node's type stripping to run the generator for real, and that
  // cannot compile the shorthand.
  readonly size: PageSize;

  constructor(size: PageSize = A4) {
    this.size = size;
  }

  /** Set one run of text with its baseline at (x, y) from the bottom left. */
  text(
    value: string,
    x: number,
    y: number,
    options: { size?: number; face?: Face; grey?: number } = {},
  ): void {
    const { size = 10, face = "regular", grey = 0 } = options;
    const font = face === "bold" ? "/F2" : "/F1";
    this.current.push(
      `BT ${grey.toFixed(2)} g ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(value)}) Tj ET`,
    );
  }

  /** Same, but with the string's right edge at x. */
  textRight(
    value: string,
    x: number,
    y: number,
    options: { size?: number; face?: Face; grey?: number } = {},
  ): void {
    const { size = 10, face = "regular" } = options;
    this.text(value, x - textWidth(value, size, face), y, options);
  }

  rule(x1: number, x2: number, y: number, weight = 0.5, grey = 0.75): void {
    this.current.push(
      `${grey.toFixed(2)} G ${weight} w ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`,
    );
  }

  newPage(): void {
    this.pages.push(this.current.join("\n"));
    this.current = [];
  }

  /**
   * Stamp "Page n of m" on every page, once the document is complete.
   *
   * Only meaningful after everything is written, because until then there is no
   * m. Called by the caller rather than from `toBytes` so a document that
   * happens to fit on one page is not given a pointless "Page 1 of 1".
   */
  stampPageNumbers(x: number, y: number): void {
    if (this.current.length) this.newPage();
    const total = this.pages.length;
    if (total < 2) return;

    this.pages = this.pages.map((content, i) => {
      const label = `Page ${i + 1} of ${total}`;
      const width = textWidth(label, 8, "regular");
      return `${content}\nBT 0.45 g /F1 8 Tf 1 0 0 1 ${(x - width).toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(label)}) Tj ET`;
    });
  }

  /**
   * Serialise.
   *
   * Objects are written in order and their byte offsets recorded as they go,
   * because the cross-reference table at the end has to name the exact offset
   * of every object. Getting this wrong produces a file that some readers open
   * and others refuse, which is the worst possible failure for a document whose
   * purpose is to be forwarded to somebody else.
   */
  toBytes(): Uint8Array {
    if (this.current.length) this.newPage();

    const objects: string[] = [];
    const pageCount = this.pages.length;

    // 1 catalog, 2 pages, 3..(2+n) page objects, then n content streams,
    // then the two fonts.
    const firstPage = 3;
    const firstContent = firstPage + pageCount;
    const fontRegular = firstContent + pageCount;
    const fontBold = fontRegular + 1;

    objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
    objects.push(
      `<< /Type /Pages /Count ${pageCount} /Kids [${Array.from(
        { length: pageCount },
        (_, i) => `${firstPage + i} 0 R`,
      ).join(" ")}] >>`,
    );

    for (let i = 0; i < pageCount; i += 1) {
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.size.width.toFixed(2)} ${this.size.height.toFixed(2)}] ` +
          `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
          `/Contents ${firstContent + i} 0 R >>`,
      );
    }

    for (const content of this.pages) {
      objects.push(
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      );
    }

    objects.push(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    );
    objects.push(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
    );

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const [i, body] of objects.entries()) {
      offsets.push(out.length);
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    }

    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      out += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

    // Latin-1 rather than UTF-8: every byte written above is already either
    // ASCII or an explicit octal escape, and encoding it as UTF-8 would turn
    // the stream lengths declared above into lies.
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
