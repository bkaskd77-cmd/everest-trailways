/**
 * Hero contrast guard.
 *
 * Composites every slide image under the real overlay stack and measures the
 * contrast the copy actually gets, at three breakpoints. Run it whenever the
 * photography or the scrim changes:
 *
 *     pnpm check:hero
 *
 * It reads the scrim maths from src/lib/hero-scrim.ts — the same module the
 * component renders from — so the guard cannot drift from what ships.
 *
 * Exits non-zero if any slide FAILs, and prints the minimum `scrimStrength`
 * that would fix it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import jpeg from "jpeg-js";

import { heroSlides, type HeroSlide } from "../src/content/hero-slides.ts";
import {
  BED,
  CONTRAST_TARGETS,
  bedAlphaAt,
  moodAlphaAt,
} from "../src/lib/hero-scrim.ts";

/* ------------------------------------------------------------------ layout */

/**
 * A model of the rendered layout, mirroring the Tailwind classes in
 * HeroCarousel / HeroCopy. Kept deliberately explicit: every number here traces
 * to a class name, so a layout change is a visible diff rather than a silent
 * drift.
 */
const BREAKPOINTS = [
  { label: "390 (mobile)", w: 390, h: 844 },
  { label: "768 (tablet)", w: 768, h: 1024 },
  { label: "1440 (desktop)", w: 1440, h: 900 },
];

/** Average glyph advance as a fraction of font-size. Measured in-browser. */
const ADVANCE = { display: 0.373, sans: 0.5 };
/** Width of `1ch` as a fraction of font-size, for Inter. */
const CH = 0.63;

const clamp = (min: number, val: number, max: number) =>
  Math.min(max, Math.max(min, val));

/** The fluid type scale from globals.css, resolved at a viewport width. */
function typeScale(vw: number) {
  return {
    xs: clamp(12, 11.76 + 0.0007 * vw, 13),
    base: clamp(16, 15.63 + 0.001 * vw, 17),
    lg: clamp(18, 17.28 + 0.002 * vw, 20),
    text4xl: clamp(36, 30.08 + 0.0167 * vw, 52),
    text5xl: clamp(44, 33.6 + 0.029 * vw, 72),
    text6xl: clamp(52, 35.68 + 0.0454 * vw, 96),
  };
}

/** Split a headline the same way HeroCopy does. */
function splitHeadline(headline: string): string[] {
  const words = headline.split(" ");
  if (words.length < 3) return [headline];
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(
      words.slice(0, i).join(" ").length - words.slice(i).join(" ").length,
    );
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

type Band = { name: string; y0: number; y1: number; x0: number; x1: number };

/** Where each run of text lands, and the copy block that encloses them. */
function layout(slide: HeroSlide, vw: number, vh: number) {
  const t = typeScale(vw);
  const gutter = vw >= 1024 ? 48 : 24; // .shell padding-inline
  const shellW = Math.min(1408, vw) - gutter * 2;
  const copyW = Math.min(60 * CH * t.base, shellW);

  // Headline size: text-4xl, sm:text-5xl, xl:text-6xl
  const hSize = vw >= 1280 ? t.text6xl : vw >= 640 ? t.text5xl : t.text4xl;
  const hLead = vw >= 1280 ? 1.02 : vw >= 640 ? 1.06 : 1.12;

  /** Rendered extent of a run of text, wrapped into `limit` px. */
  const run = (text: string, size: number, advance: number, limit: number) => {
    const natural = text.length * size * advance;
    const lines = Math.max(1, Math.ceil(natural / limit));
    // Only the region glyphs actually cover matters, not the block's max-width.
    return { lines, width: Math.min(limit, natural) };
  };

  const headlineRuns = splitHeadline(slide.headline).map((line) =>
    run(line, hSize, ADVANCE.display, copyW),
  );
  const headlineLines = headlineRuns.reduce((n, r) => n + r.lines, 0);
  const headlineW = Math.max(...headlineRuns.map((r) => r.width));

  // The subline is capped at max-w-xl (36rem), narrower than the copy block.
  const sublineLimit = Math.min(576, copyW);
  const subline = run(slide.subline, t.lg, ADVANCE.sans, sublineLimit);
  const eyebrow = run(slide.region, t.xs, ADVANCE.sans, copyW);

  const eyebrowH = eyebrow.lines * t.xs * 1.5;
  const headlineH = headlineLines * hSize * hLead;
  const sublineH = subline.lines * t.lg * 1.6;
  const ctaH = 44;
  const blockH = eyebrowH + 20 + headlineH + 24 + sublineH + 36 + ctaH;

  // justify-center inside a container with pb-[10svh]
  const top = (vh * 0.9 - blockH) / 2;
  const left = vw >= 1024 ? gutter + Math.max(0, (vw - 1408) / 2) : gutter;

  // The bed is anchored to the whole copy block, so it keeps the full width.
  const box = { x0: left, y0: top, x1: left + copyW, y1: top + blockH };

  let y = top;
  const bands: Band[] = [];
  bands.push({
    name: "eyebrow",
    y0: y,
    y1: y + eyebrowH,
    x0: left,
    x1: left + eyebrow.width,
  });
  y += eyebrowH + 20;
  bands.push({
    name: "headline",
    y0: y,
    y1: y + headlineH,
    x0: left,
    x1: left + headlineW,
  });
  y += headlineH + 24;
  bands.push({
    name: "subline",
    y0: y,
    y1: y + sublineH,
    x0: left,
    x1: left + subline.width,
  });

  return { box, bands, ridgeTop: vh * 0.7 };
}

/* ------------------------------------------------------------------ colour */

const GLACIER = [245, 243, 238];
const SUMMIT = [11, 31, 42];

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (rgb: number[]) =>
  0.2126 * toLinear(rgb[0]) +
  0.7152 * toLinear(rgb[1]) +
  0.0722 * toLinear(rgb[2]);
const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Text drawn at `alpha` over a backdrop, as WCAG treats it. */
const over = (fg: number[], bg: number[], alpha: number) =>
  fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

/** CSS `brightness()` then `contrast()`, in that order. */
function applyFilter(rgb: number[], filter: string): number[] {
  let out = rgb;
  for (const [, fn, raw] of filter.matchAll(/(\w+)\(([\d.]+)\)/g)) {
    const amount = Number(raw);
    if (fn === "brightness") out = out.map((c) => c * amount);
    else if (fn === "contrast")
      out = out.map((c) => (c - 127.5) * amount + 127.5);
    else if (fn === "saturate") {
      const l = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
      out = out.map((c) => l + (c - l) * amount);
    }
  }
  return out.map((c) => clamp(0, c, 255));
}

/* ------------------------------------------------------------------ images */

type Decoded = { width: number; height: number; data: Uint8Array };

async function loadImage(src: string): Promise<Decoded> {
  let bytes: Buffer;
  if (src.startsWith("http")) {
    const url = new URL(src);
    // Force a modest JPEG regardless of what the browser would negotiate.
    url.searchParams.set("fm", "jpg");
    url.searchParams.set("w", "960");
    url.searchParams.set("h", "540");
    url.searchParams.set("q", "80");
    url.searchParams.delete("auto");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${src}`);
    bytes = Buffer.from(await res.arrayBuffer());
  } else {
    bytes = await readFile(path.join(process.cwd(), "public", src));
  }
  const img = jpeg.decode(bytes, { useTArray: true });
  return { width: img.width, height: img.height, data: img.data };
}

/* ----------------------------------------------------------------- measure */

const SAMPLE_STEP = 2;

/**
 * 95th-percentile background luminance under a band.
 *
 * A percentile rather than the single brightest pixel: one specular highlight
 * behind a letter does not make a headline unreadable, and gating on it forces
 * exactly the over-darkening this rewrite removes. The absolute worst pixel is
 * still reported alongside, so nothing is hidden.
 */
function backdropLuminance(
  img: Decoded,
  slide: HeroSlide,
  band: Band,
  box: { x0: number; y0: number; x1: number; y1: number },
  vw: number,
  vh: number,
  strength: number,
) {
  const filter = slide.imageFilter
    ? `brightness(1.08) contrast(1.03) ${slide.imageFilter}`
    : "brightness(1.08) contrast(1.03)";

  // The media layer is inset -6% and covers, matching HeroMedia.
  const mediaW = vw * 1.12;
  const mediaH = vh * 1.12;
  const scale = Math.max(mediaW / img.width, mediaH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const focalY = slide.focalPoint?.match(/(\d+)%/);
  const posY = focalY ? Number(focalY[1]) / 100 : 0.5;
  const offX = -vw * 0.06 + (mediaW - drawW) * 0.5;
  const offY = -vh * 0.06 + (mediaH - drawH) * posY;

  const samples: { rgb: number[]; lum: number }[] = [];

  for (let y = band.y0; y < band.y1; y += SAMPLE_STEP) {
    for (let x = band.x0; x < band.x1; x += SAMPLE_STEP) {
      const sx = Math.floor((x - offX) / scale);
      const sy = Math.floor((y - offY) / scale);
      if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
      const i = (sy * img.width + sx) * 4;
      const pixel = applyFilter(
        [img.data[i], img.data[i + 1], img.data[i + 2]],
        filter,
      );
      const alpha =
        1 -
        (1 - moodAlphaAt(x, y, vw, vh)) * (1 - bedAlphaAt(x, y, box, strength));
      const rgb = pixel.map((c, k) => c * (1 - alpha) + SUMMIT[k] * alpha);
      samples.push({ rgb, lum: luminance(rgb) });
    }
  }

  if (!samples.length) return null;
  samples.sort((a, b) => a.lum - b.lum);
  return {
    p95: samples[Math.floor(samples.length * 0.95)] ?? samples.at(-1)!,
    worst: samples.at(-1)!,
  };
}

/* -------------------------------------------------------------------- main */

type Row = {
  slide: string;
  breakpoint: string;
  role: string;
  ratio: number;
  worstRatio: number;
  target: number;
  status: "PASS" | "WARN" | "FAIL";
};

async function main() {
  const rows: Row[] = [];
  const needed = new Map<string, number>();
  const ridgeNotes: string[] = [];

  for (const slide of heroSlides) {
    let img: Decoded;
    try {
      img = await loadImage(slide.image.src);
    } catch (error) {
      console.error(
        `\n  Could not load image for "${slide.id}": ${String(error)}`,
      );
      process.exitCode = 1;
      continue;
    }

    for (const bp of BREAKPOINTS) {
      const { box, bands, ridgeTop } = layout(slide, bp.w, bp.h);
      if (box.y1 > ridgeTop) {
        ridgeNotes.push(
          `${slide.id} @ ${bp.label}: copy overlaps ridge by ${Math.round(box.y1 - ridgeTop)}px`,
        );
      }

      for (const band of bands) {
        const role = band.name;
        const isSmall = role !== "headline";
        const target = isSmall
          ? CONTRAST_TARGETS.smallText
          : CONTRAST_TARGETS.largeText;
        const textAlpha =
          role === "eyebrow" ? 0.85 : role === "subline" ? 0.8 : 1;

        const measure = (strength: number) => {
          const result = backdropLuminance(
            img,
            slide,
            band,
            box,
            bp.w,
            bp.h,
            strength,
          );
          if (!result) return { ratio: Infinity, worstRatio: Infinity };
          // Translucent text blends with the backdrop it sits on, so the
          // foreground colour is computed against that exact pixel.
          const ratioAt = (s: { rgb: number[]; lum: number }) =>
            contrast(luminance(over(GLACIER, s.rgb, textAlpha)), s.lum);
          return {
            ratio: ratioAt(result.p95),
            worstRatio: ratioAt(result.worst),
          };
        };

        const base = measure(slide.scrimStrength ?? 1);
        const status: Row["status"] =
          base.ratio >= target
            ? "PASS"
            : base.ratio >= target * 0.9
              ? "WARN"
              : "FAIL";

        if (status !== "PASS") {
          // Smallest strength in [0,1] that clears the target.
          let lo = slide.scrimStrength ?? 1;
          let hi = 1;
          let found = Infinity;
          for (let i = 0; i < 12 && lo <= hi; i++) {
            const mid = (lo + hi) / 2;
            if (measure(mid).ratio >= target) {
              found = mid;
              hi = mid - 0.001;
            } else {
              lo = mid + 0.001;
            }
          }
          const prev = needed.get(slide.id) ?? 0;
          needed.set(slide.id, Math.max(prev, found));
        }

        rows.push({
          slide: slide.id,
          breakpoint: bp.label,
          role,
          ratio: base.ratio,
          worstRatio: base.worstRatio,
          target,
          status,
        });
      }
    }
  }

  print(rows, needed, ridgeNotes);

  if (rows.some((r) => r.status === "FAIL")) process.exitCode = 1;
}

function print(rows: Row[], needed: Map<string, number>, ridgeNotes: string[]) {
  console.log("\n  Hero contrast — copy over photography, real overlay stack");
  console.log(
    `  targets: small text ${CONTRAST_TARGETS.smallText}:1 · headline (large) ${CONTRAST_TARGETS.largeText}:1`,
  );
  console.log(
    `  bed: ${BED.alpha} peak, feathering to 0 at ${BED.feather * 100}% · ratios are 95th-percentile backdrop\n`,
  );

  const head = [
    pad("slide", 11),
    pad("breakpoint", 16),
    pad("role", 10),
    pad("ratio", 8),
    pad("worst px", 9),
    pad("target", 7),
    "status",
  ].join("");
  console.log("  " + head);
  console.log("  " + "-".repeat(head.length));

  let lastSlide = "";
  for (const r of rows) {
    if (lastSlide && lastSlide !== r.slide) console.log("");
    lastSlide = r.slide;
    console.log(
      "  " +
        [
          pad(r.slide, 11),
          pad(r.breakpoint, 16),
          pad(r.role, 10),
          pad(r.ratio.toFixed(2), 8),
          pad(r.worstRatio.toFixed(2), 9),
          pad(String(r.target), 7),
          r.status,
        ].join(""),
    );
  }

  if (ridgeNotes.length) {
    console.log(
      "\n  Ridge overlap (decorative, darkens only — excluded from the model):",
    );
    for (const note of ridgeNotes) console.log(`    ${note}`);
  } else {
    console.log("\n  Ridge sits clear of the copy block at every breakpoint.");
  }

  if (needed.size) {
    console.log("\n  Suggested scrimStrength in src/content/hero-slides.ts:");
    for (const [id, value] of needed) {
      console.log(
        `    ${id}: ${Number.isFinite(value) ? value.toFixed(2) : "> 1 — reshoot, re-crop, or set an imageFilter"}`,
      );
    }
  }

  const fails = rows.filter((r) => r.status === "FAIL").length;
  const warns = rows.filter((r) => r.status === "WARN").length;
  console.log(
    `\n  ${rows.length - fails - warns} pass · ${warns} warn · ${fails} fail\n`,
  );
}

const pad = (s: string, n: number) => s.padEnd(n);

main();
