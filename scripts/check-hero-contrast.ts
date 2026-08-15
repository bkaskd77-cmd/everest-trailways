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

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import jpeg from "jpeg-js";

/** `--tune` writes the computed strengths back into the content file. */
const TUNE = process.argv.includes("--tune");

import { heroSlides, type HeroSlide } from "../src/content/hero-slides.ts";
import {
  CONTRAST_TARGETS,
  HEADER_SCRIM,
  MAX_BACKDROP_LUMINANCE,
  moodAlphaAt,
  shadowAlpha,
} from "../src/lib/hero-scrim.ts";

/** Mirrors HeroMedia. */
const KEN_BURNS_SCALE = 1.08;
const KEN_BURNS_DRIFT = 20;
/** Start, middle and end of the pan. The worst of the three is what counts. */
const KEN_BURNS_SAMPLES = [0, 0.5, 1];

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
  // .shell — max-width 90rem, padding-inline clamp(20px, 5vw, 72px)
  const gutter = clamp(20, 0.05 * vw, 72);
  const shellW = Math.min(1440, vw) - gutter * 2;
  // max-w-[58ch], xl:max-w-[min(58ch,46%)]
  const measure = 58 * CH * t.base;
  const copyW = Math.min(measure, vw >= 1280 ? shellW * 0.46 : shellW);

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
  const left = gutter + Math.max(0, (vw - 1440) / 2);

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
  y += sublineH + 36;
  // The ghost button's label and border. Its own box-shadow protects it, but
  // it still has to clear the same target as any other small text.
  bands.push({
    name: "cta-ghost",
    y0: y,
    y1: y + ctaH,
    x0: left + 190,
    x1: left + 190 + 210,
  });

  /* Chrome over the photograph. All of it uses the `small` shadow stack and the
     hairline opacity floor, so it is measured against the small-text target. */
  const headerMid = 44;
  bands.push({
    name: "wordmark",
    y0: headerMid - 8,
    y1: headerMid + 8,
    x0: left,
    x1: left + (vw >= 1024 ? 190 : 140),
  });
  if (vw >= 1024) {
    bands.push({
      name: "nav-links",
      y0: headerMid - 9,
      y1: headerMid + 9,
      x0: vw * 0.42,
      x1: vw * 0.62,
    });
    bands.push({
      name: "currency",
      y0: headerMid - 8,
      y1: headerMid + 8,
      x0: vw - gutter - Math.max(0, (vw - 1440) / 2) - 300,
      x1: vw - gutter - Math.max(0, (vw - 1440) / 2) - 262,
    });
  }
  bands.push({
    name: "theme-toggle",
    y0: headerMid - 16,
    y1: headerMid + 16,
    x0: vw - gutter - Math.max(0, (vw - 1440) / 2) - 250,
    x1: vw - gutter - Math.max(0, (vw - 1440) / 2) - 218,
  });

  // Indicators and scroll cue, bottom-28.
  const controlsY = vh - 112 - 40;
  bands.push({
    name: "indicators",
    y0: controlsY,
    y1: controlsY + 40,
    x0: left,
    x1: left + (vw >= 640 ? 88 : 56),
  });
  if (vw >= 640) {
    bands.push({
      name: "scroll-cue",
      y0: controlsY - 50,
      y1: controlsY + 40,
      x0: vw - gutter - Math.max(0, (vw - 1440) / 2) - 40,
      x1: vw - gutter - Math.max(0, (vw - 1440) / 2),
    });
  }

  return { box, bands, ridgeTop: vh * 0.7 };
}

/** Roles measured against the large-text target. Everything else is small. */
const LARGE_TEXT = new Set(["headline"]);
/** Roles that sit under the header's own top-down scrim. */
const UNDER_HEADER_SCRIM = new Set([
  "wordmark",
  "nav-links",
  "currency",
  "theme-toggle",
]);

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
 *
 * Two layers darken the backdrop: the full-bleed mood gradient, and the text
 * shadow the glyphs carry — see `shadowAlpha` for how the latter is modelled.
 */
function backdropLuminance(
  img: Decoded,
  slide: HeroSlide,
  band: Band,
  vw: number,
  vh: number,
  strength: number,
  /** Ken Burns position, 0 → 1. The pixels under the copy move as it plays. */
  t: number,
) {
  const filter = slide.imageFilter
    ? `brightness(1.08) contrast(1.03) ${slide.imageFilter}`
    : "brightness(1.08) contrast(1.03)";

  // The media layer is inset -6% and covers, matching HeroMedia — then Ken
  // Burns scales it 1 → 1.08 about its centre and drifts it by DRIFT px.
  const kb = 1 + t * (KEN_BURNS_SCALE - 1);
  const direction = heroSlides.indexOf(slide) % 2 === 0 ? -1 : 1;
  const driftX = t * KEN_BURNS_DRIFT * direction;
  const driftY = t * KEN_BURNS_DRIFT * direction;

  const mediaW = vw * 1.12;
  const mediaH = vh * 1.12;
  const baseScale = Math.max(mediaW / img.width, mediaH / img.height);
  const scale = baseScale * kb;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const focalY = slide.focalPoint?.match(/(\d+)%/);
  const posY = focalY ? Number(focalY[1]) / 100 : 0.5;
  // Cover offsets at rest, then re-centre for the zoom and apply the drift.
  const restX = -vw * 0.06 + (mediaW - img.width * baseScale) * 0.5;
  const restY = -vh * 0.06 + (mediaH - img.height * baseScale) * posY;
  const centreX = restX + (img.width * baseScale) / 2;
  const centreY = restY + (img.height * baseScale) / 2;
  const offX = centreX - drawW / 2 + driftX;
  const offY = centreY - drawH / 2 + driftY;

  const samples: { rgb: number[]; lum: number }[] = [];
  const shadow = shadowAlpha(
    LARGE_TEXT.has(band.name) ? "display" : "small",
    strength,
  );
  const headerScrim = UNDER_HEADER_SCRIM.has(band.name)
    ? HEADER_SCRIM.alpha *
      Math.max(0, 1 - (band.y0 + band.y1) / 2 / HEADER_SCRIM.height)
    : 0;

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
        1 - (1 - moodAlphaAt(x, y, vw, vh)) * (1 - shadow) * (1 - headerScrim);
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
        const target = LARGE_TEXT.has(role)
          ? CONTRAST_TARGETS.largeText
          : CONTRAST_TARGETS.smallText;
        const textAlpha =
          role === "subline" ? 0.9 : role === "indicators" ? 0.75 : 1;

        /**
         * Worst of three points in the Ken Burns cycle. The image scales and
         * pans continuously, so a slide that passes at rest can fail halfway
         * through as a bright area drifts under the copy.
         */
        const measure = (strength: number) => {
          let ratio = Infinity;
          let worstRatio = Infinity;
          let peakLum = 0;
          for (const t of KEN_BURNS_SAMPLES) {
            const result = backdropLuminance(
              img,
              slide,
              band,
              bp.w,
              bp.h,
              strength,
              t,
            );
            if (!result) continue;
            // Translucent text blends with the backdrop it sits on, so the
            // foreground colour is computed against that exact pixel.
            const ratioAt = (s: { rgb: number[]; lum: number }) =>
              contrast(luminance(over(GLACIER, s.rgb, textAlpha)), s.lum);
            ratio = Math.min(ratio, ratioAt(result.p95));
            worstRatio = Math.min(worstRatio, ratioAt(result.worst));
            peakLum = Math.max(peakLum, result.p95.lum);
          }
          return { ratio, worstRatio, peakLum };
        };

        const base = measure(slide.scrimStrength ?? 1);
        // Both gates: the contrast ratio and the absolute luminance floor.
        const ok = (m: { ratio: number; peakLum: number }) =>
          m.ratio >= target && m.peakLum <= MAX_BACKDROP_LUMINANCE;
        const status: Row["status"] = ok(base)
          ? "PASS"
          : base.ratio >= target * 0.9 &&
              base.peakLum <= MAX_BACKDROP_LUMINANCE * 1.15
            ? "WARN"
            : "FAIL";

        if (status !== "PASS") {
          // Smallest strength that clears the target. Values above 1 are
          // meaningful now that the field scales the text shadow rather than a
          // background panel; 2 is where the shadow starts to look like a
          // sticker, so that is the ceiling.
          let lo = slide.scrimStrength ?? 1;
          let hi = 2;
          let found = Infinity;
          for (let i = 0; i < 14 && lo <= hi; i++) {
            const mid = (lo + hi) / 2;
            if (ok(measure(mid))) {
              found = mid;
              hi = mid - 0.005;
            } else {
              lo = mid + 0.005;
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

  checkHeadlineLines();
  print(rows, needed, ridgeNotes);

  if (TUNE) {
    await writeStrengths(needed);
    return;
  }

  if (rows.some((r) => r.status === "FAIL")) process.exitCode = 1;
}

/**
 * `pnpm tune:hero` — write each slide's minimum passing `scrimStrength` back
 * into src/content/hero-slides.ts, so correcting new photography is one command
 * rather than a judgement call.
 *
 * Slides that already pass have any stale value removed, so the file never
 * accumulates corrections an image no longer needs.
 */
async function writeStrengths(needed: Map<string, number>) {
  const file = path.join(process.cwd(), "src/content/hero-slides.ts");
  let source = await readFile(file, "utf8");
  const changes: string[] = [];

  for (const slide of heroSlides) {
    const raw = needed.get(slide.id);
    const value =
      raw !== undefined && Number.isFinite(raw)
        ? Math.ceil(raw * 100) / 100
        : undefined;
    const current = slide.scrimStrength;
    if (value === current) continue;

    // Narrow the edit to this slide's object literal.
    const start = source.indexOf(`id: "${slide.id}"`);
    if (start === -1) continue;
    const next = source.indexOf("\n  {\n", start);
    const end = next === -1 ? source.length : next;
    let block = source.slice(start, end);

    block = block.replace(/\n\s*scrimStrength: [\d.]+,/, "");
    if (value !== undefined) {
      block = block.replace(
        /(\n(\s*)ctaPrimary:)/,
        `\n$2scrimStrength: ${value},$1`,
      );
    }
    source = source.slice(0, start) + block + source.slice(end);
    changes.push(
      `${slide.id}: ${current ?? "—"} → ${value ?? "removed (passes unaided)"}`,
    );
  }

  if (!changes.length) {
    console.log("  tune: every slide already carries the right value.\n");
    return;
  }
  await writeFile(file, source, "utf8");
  console.log("  tune: wrote src/content/hero-slides.ts");
  for (const c of changes) console.log(`    ${c}`);
  console.log("\n  Re-run `pnpm check:hero` to confirm.\n");
}

/**
 * Headline length.
 *
 * A three-line headline at 1440px pushes the eyebrow up under the nav and
 * breaks the hero's vertical balance. Two lines is the design; the split
 * function only chooses where to break, it cannot stop a half being too long
 * for the column. So the copy has to be short enough, and that is checked here
 * rather than left to whoever writes the next slide.
 */
function checkHeadlineLines() {
  const limits = [
    { label: "1440", vw: 1440, vh: 900, max: 2 },
    { label: "390", vw: 390, vh: 844, max: 3 },
  ];
  const failures: string[] = [];

  for (const slide of heroSlides) {
    for (const { label, vw, vh, max } of limits) {
      const { bands } = layout(slide, vw, vh);
      const headline = bands.find((b) => b.name === "headline");
      if (!headline) continue;
      const t = typeScale(vw);
      const size = vw >= 1280 ? t.text6xl : vw >= 640 ? t.text5xl : t.text4xl;
      const lead = vw >= 1280 ? 1.02 : vw >= 640 ? 1.06 : 1.12;
      const lines = Math.round((headline.y1 - headline.y0) / (size * lead));
      if (lines > max) {
        failures.push(
          `    ${slide.id} @ ${label}px: headline renders ${lines} lines, max ${max} — "${slide.headline}"`,
        );
      }
    }
  }

  console.log("\n  Headline length");
  if (failures.length) {
    console.log("  FAIL");
    for (const f of failures) console.log(f);
    process.exitCode = 1;
  } else {
    console.log("  ok — every headline fits 2 lines at 1440px and 3 at 390px");
  }
}

function print(rows: Row[], needed: Map<string, number>, ridgeNotes: string[]) {
  console.log("\n  Hero contrast — copy over photography, real overlay stack");
  console.log(
    `  targets: small text ${CONTRAST_TARGETS.smallText}:1 · headline (large) ${CONTRAST_TARGETS.largeText}:1`,
  );
  console.log(
    `  layers: mood gradient (full-bleed) + text shadow` +
      ` — effective shadow alpha ${shadowAlpha("display").toFixed(2)} display,` +
      ` ${shadowAlpha("small").toFixed(2)} small`,
  );
  console.log("  ratios are 95th-percentile backdrop\n");

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
        `    ${id}: ${Number.isFinite(value) ? value.toFixed(2) : "> 2 — reshoot, re-crop, or set an imageFilter"}`,
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
