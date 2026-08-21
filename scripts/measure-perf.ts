/**
 * Field measurement against the production build.
 *
 *     pnpm perf
 *
 * This exists because the browser pane on the development machine does not
 * composite — no paint means no `largest-contentful-paint` entry, so LCP was
 * simply unmeasurable there, and every previous step reported it as "unknown".
 * Headless Chrome paints, so it can answer the question.
 *
 * Two kinds of number, and the distinction matters:
 *
 *   ENFORCED — layout stability, DOM weight, transferred JavaScript. These are
 *   properties of the build, not of the machine, so they are the same on any
 *   hardware and a regression in them is a real regression. They fail the run.
 *
 *   REPORTED — LCP, TBT. These move by a factor of three on this machine
 *   depending on what else is open, so failing on them would mean a guard that
 *   cries wolf until someone deletes it. They are printed with their target and
 *   left to a human to read.
 *
 * Every run also exercises the page rather than just loading it: it scrolls to
 * the bottom, opens the matcher, and re-reads CLS, because the layout shifts
 * worth catching are the ones the motion work introduces after first paint.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import puppeteer, { type Browser, type Page } from "puppeteer";

import { departures } from "../src/content/departures.ts";

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "desktop 1440", width: 1440, height: 900 },
  { name: "mobile 390", width: 390, height: 844 },
];

/**
 * The pages worth measuring.
 *
 * The homepage because it is the one everybody lands on, and a departure
 * detail page because it is the longest document on the site — an itinerary
 * accordion, an animated SVG profile and a sticky bar that enters on scroll are
 * three separate chances to shift the layout after paint. `answersMatcher`
 * marks the one page that has a matcher to answer; the departure page does not,
 * and asking it to would fail rather than measure.
 */
const longest = departures.reduce((a, b) => (b.days > a.days ? b : a));

const PAGES: {
  name: string;
  path: string;
  answersMatcher: boolean;
  /** Overrides ENFORCED.screens where a page is legitimately longer. */
  screens?: number;
}[] = [
  { name: "homepage", path: "/", answersMatcher: true },
  {
    // The longest itinerary on sale, not the first in the array: the point of
    // measuring a departure page is the worst case, and a four-day itinerary
    // does not have one.
    name: `departure /${longest.slug}`,
    path: `/departures/${longest.slug}`,
    answersMatcher: false,
  },
  // The index, because it holds every departure and is therefore the page that
  // grows without anyone editing it.
  {
    name: "index /departures",
    path: "/departures",
    answersMatcher: false,
    /*
     * An index is allowed to be long — listing everything is the page's job,
     * and the filters at the top are how you make it short. Nineteen cards in
     * one column is 21 screens on a phone, which is honest but not comfortable;
     * whether that becomes pagination is a design decision, not a regression.
     * The ceiling is raised deliberately and stays enforced, so the page cannot
     * drift past what a filterable list can excuse.
     */
    screens: 24,
  },
];

/** Fails the run. Properties of the build, identical on any machine. */
const ENFORCED = {
  /** Core Web Vitals "good" threshold. */
  cls: 0.1,
  /** Transferred JavaScript, KB. Headroom over the current ~240KB. */
  jsKB: 320,
  /** A homepage that needs more nodes than this has a structural problem. */
  domNodes: 2600,
  /**
   * Page height, in viewports.
   *
   * This exists because of a real regression: the dataset grew from six
   * departures to nineteen and the homepage grid, which was handed the whole
   * array, rendered all of them — a 17,000px wall of cards between the trust
   * strip and the footer. Nothing else caught it. Node counts did not move much
   * (cards are cheap), CLS was fine, and the build was clean; the page was
   * simply eleven screens longer than anyone intended.
   *
   * A section that renders "all of X" is one dataset away from doing this
   * again, so the length of the document is now something the build measures.
   */
  screens: 14,
};

/** Printed with a target, never enforced — too load-dependent on one desktop. */
const REPORTED = { lcpMs: 2500, tbtMs: 200 };

/**
 * Zoom invariance.
 *
 * Browser zoom does one thing to layout: it changes the CSS viewport width to
 * `windowWidth / zoom`. So zooming a 1512px window to 80% and 50% is exactly a
 * 1890px and a 3024px viewport, which is what these are.
 *
 * The page used to fail this badly. A flat `max-width` on `.shell` meant that
 * below the cap the spine filled the screen and above it a centring gutter
 * appeared and grew — so a two-notch zoom change slid the entire layout from 5%
 * of the screen to 15.7%, and the site visibly collapsed toward the middle.
 *
 * What is asserted is not a pixel value but a ratio: every landmark's left edge
 * must sit at the same fraction of the screen at every zoom level. That is the
 * property "the layout does not move when you zoom" actually means, and it
 * holds regardless of what the design width later becomes.
 *
 * Type size deliberately does NOT scale with the viewport, which is why zoom
 * still does something: text gets larger and smaller. WCAG 1.4.4 requires that.
 */
const ZOOM_VIEWPORTS = [1512, 1890, 3024];
/** Half a percentage point of screen width. Sub-pixel rounding only. */
const MAX_SPINE_DRIFT = 0.005;
const SPINE_LANDMARKS: Record<string, string> = {
  wordmark: "header .shell a",
  heroEyebrow: 'section[aria-roledescription="carousel"] .shell p',
  trustColumn: 'section[aria-labelledby="trust-heading"] li p',
  departHeading: "#departures-heading",
  firstCard: 'section[aria-labelledby="departures-heading"] ul > li',
  matcher: ".on-instrument",
  footer: "footer .shell p",
};

const root = process.cwd();

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`the production server never answered on ${port}`);
}

type Metrics = {
  lcpMs: number | null;
  clsInitial: number;
  clsAfterInteraction: number;
  tbtMs: number;
  jsKB: number;
  domNodes: number;
  screens: number;
  invisible: string[];
  lcpElement: string | null;
};

async function measure(
  page: Page,
  url: string,
  answersMatcher: boolean,
): Promise<Metrics> {
  // Installed before any navigation so the observers catch the first paint.
  await page.evaluateOnNewDocument(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__cls = 0;
    w.__tbt = 0;
    w.__lcp = null;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) w.__cls = (w.__cls as number) + entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & {
        element?: Element;
      };
      w.__lcp = {
        ms: Math.round(last.startTime),
        tag: last.element?.tagName ?? null,
        cls: last.element?.className?.toString().slice(0, 60) ?? null,
      };
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__tbt = (w.__tbt as number) + Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  });

  // `load`, not `networkidle0`: the hero carousel autoplays and pulls its
  // remaining slides in the background, so the network never goes quiet and
  // idle-based waits simply time out.
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 2500));

  const initial = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    return {
      lcp: w.__lcp as {
        ms: number;
        tag: string | null;
        cls: string | null;
      } | null,
      cls: w.__cls as number,
      tbt: w.__tbt as number,
    };
  });

  // Exercise it. The shifts worth catching are the ones the scroll-linked
  // motion, the meter sequence and the matcher's height matching can introduce
  // long after the page has settled.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.75;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      await new Promise((r) => setTimeout(r, 220));
    }
  });

  // Answer the matcher's first question. It swaps a question for a set of
  // match cards inside a panel that is already on screen, which is the largest
  // layout change the page can make after load — exactly the shift worth
  // catching.
  if (answersMatcher) {
    await page.evaluate(async () => {
      const option = [...document.querySelectorAll("button")].find((b) =>
        /Eight to twelve days/.test(b.textContent ?? ""),
      );
      if (!option)
        throw new Error("the matcher's first question is not on screen");
      option.click();
      await new Promise((r) => setTimeout(r, 2500));
    });
  } else {
    // The equivalent largest post-load layout change on a departure page:
    // open every itinerary day at once.
    await page.evaluate(async () => {
      const expand = [...document.querySelectorAll("button")].find((b) =>
        /Expand all/i.test(b.textContent ?? ""),
      );
      expand?.click();
      await new Promise((r) => setTimeout(r, 2500));
    });
  }

  const after = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const js = performance
      .getEntriesByType("resource")
      .filter((r) => r.name.endsWith(".js"))
      .reduce(
        (total, r) =>
          total + ((r as PerformanceResourceTiming).encodedBodySize || 0),
        0,
      );
    return {
      cls: w.__cls as number,
      tbt: w.__tbt as number,
      jsKB: Math.round(js / 1024),
      domNodes: document.getElementsByTagName("*").length,
      screens: document.documentElement.scrollHeight / window.innerHeight,
      /*
       * Content the page never revealed.
       *
       * The whole document has been scrolled through by this point, so every
       * scroll-triggered reveal that was ever going to fire has fired. Anything
       * still fully transparent is content a reader cannot reach — which is
       * exactly how the /departures grid shipped blank: a viewport trigger
       * asking for a fraction of an element taller than the screen can never
       * be satisfied, so nineteen cards sat at opacity 0 at every scroll
       * position, in a perfectly valid DOM.
       *
       * Only substantial, laid-out elements count. A deliberately hidden
       * decorative layer is not what this is looking for; a card with 400px of
       * text in it is.
       */
      invisible: [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => {
          if (Number(getComputedStyle(el).opacity) > 0.01) return false;
          const box = el.getBoundingClientRect();
          if (box.width < 80 || box.height < 40) return false;
          if ((el.innerText ?? "").trim().length < 20) return false;
          // Only the outermost transparent element — a hidden card would
          // otherwise report every node inside it.
          return !(
            el.parentElement &&
            Number(getComputedStyle(el.parentElement).opacity) <= 0.01
          );
        })
        .slice(0, 6)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0]} "${(el.innerText ?? "").trim().slice(0, 40).replace(/\s+/g, " ")}"`,
        ),
    };
  });

  return {
    lcpMs: initial.lcp?.ms ?? null,
    lcpElement: initial.lcp
      ? `${initial.lcp.tag} ${initial.lcp.cls ?? ""}`.trim()
      : null,
    clsInitial: initial.cls,
    clsAfterInteraction: after.cls,
    tbtMs: Math.round(after.tbt),
    jsKB: after.jsKB,
    domNodes: after.domNodes,
    screens: after.screens,
    invisible: after.invisible,
  };
}

/* ---------------------------------------------------------------- the run */

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.error(
    "\n  No production build found. Run `pnpm build` first — these numbers are meaningless against `next dev`.\n",
  );
  process.exit(1);
}

const port = await freePort();
let server: ChildProcess | null = null;
let browser: Browser | null = null;
const problems: string[] = [];

try {
  // Node rather than the `.bin` shim: a `.cmd` shim needs `shell: true` on
  // Windows, and passing arguments through a shell is a quoting hazard on a
  // path that already contains a space.
  server = spawn(
    process.execPath,
    [
      path.join(root, "node_modules", "next", "dist", "bin", "next"),
      "start",
      "--port",
      String(port),
    ],
    { cwd: root, stdio: "ignore" },
  );
  await waitForServer(port);

  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  console.log(`\n  Performance — production build on port ${port}\n`);

  for (const target of PAGES) {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        isMobile: viewport.width < 768,
        hasTouch: viewport.width < 768,
      });

      const m = await measure(
        page,
        `http://127.0.0.1:${port}${target.path}`,
        target.answersMatcher,
      );
      await page.close();

      const mark = (ok: boolean) => (ok ? "ok  " : "FAIL");
      const screenCeiling = target.screens ?? ENFORCED.screens;
      console.log(`  ${target.name} — ${viewport.name}`);
      console.log(
        `    ${mark(m.clsAfterInteraction <= ENFORCED.cls)} CLS            ${m.clsAfterInteraction.toFixed(4)}  (first paint ${m.clsInitial.toFixed(4)}, ceiling ${ENFORCED.cls})`,
      );
      console.log(
        `    ${mark(m.jsKB <= ENFORCED.jsKB)} JS transferred ${String(m.jsKB).padStart(4)} KB  (ceiling ${ENFORCED.jsKB} KB)`,
      );
      console.log(
        `    ${mark(m.domNodes <= ENFORCED.domNodes)} DOM nodes      ${String(m.domNodes).padStart(4)}     (ceiling ${ENFORCED.domNodes})`,
      );
      console.log(
        `    ${mark(m.screens <= screenCeiling)} page length    ${m.screens.toFixed(1).padStart(4)}     screens (ceiling ${screenCeiling})`,
      );
      console.log(
        `    ${mark(m.invisible.length === 0)} all content    ${m.invisible.length === 0 ? "reachable" : `${m.invisible.length} block(s) never revealed`}`,
      );
      for (const el of m.invisible) console.log(`         ${el}`);
      console.log(
        `    ..   LCP            ${m.lcpMs === null ? "unmeasured" : `${m.lcpMs} ms`}  (target ${REPORTED.lcpMs} ms) — ${m.lcpElement ?? "no element"}`,
      );
      console.log(
        `    ..   TBT            ${m.tbtMs} ms  (target ${REPORTED.tbtMs} ms, load-dependent)\n`,
      );

      if (m.clsAfterInteraction > ENFORCED.cls) {
        problems.push(
          `${target.name} ${viewport.name}: CLS ${m.clsAfterInteraction.toFixed(4)} over ${ENFORCED.cls}`,
        );
      }
      if (m.jsKB > ENFORCED.jsKB) {
        problems.push(
          `${target.name} ${viewport.name}: ${m.jsKB} KB of JS over ${ENFORCED.jsKB} KB`,
        );
      }
      if (m.domNodes > ENFORCED.domNodes) {
        problems.push(
          `${target.name} ${viewport.name}: ${m.domNodes} DOM nodes over ${ENFORCED.domNodes}`,
        );
      }
      if (m.screens > screenCeiling) {
        problems.push(
          `${target.name} ${viewport.name}: ${m.screens.toFixed(1)} screens long, over ${screenCeiling}`,
        );
      }
      if (m.invisible.length) {
        problems.push(
          `${target.name} ${viewport.name}: ${m.invisible.length} block(s) still at opacity 0 after scrolling the whole page — ${m.invisible[0]}`,
        );
      }
    }
  }

  /* ------------------------------------------------------- zoom invariance */

  const zoom = await browser.newPage();
  const readings: {
    vw: number;
    insets: Record<string, number>;
    overflow: number;
  }[] = [];

  for (const vw of ZOOM_VIEWPORTS) {
    await zoom.setViewport({ width: vw, height: 900 });
    await zoom.goto(`http://127.0.0.1:${port}/`, {
      waitUntil: "load",
      timeout: 90_000,
    });
    await new Promise((r) => setTimeout(r, 700));
    readings.push(
      await zoom.evaluate((selectors: Record<string, string>) => {
        const width = window.innerWidth;
        const insets: Record<string, number> = {};
        for (const [name, selector] of Object.entries(selectors)) {
          const el = document.querySelector(selector);
          if (el) insets[name] = el.getBoundingClientRect().left / width;
        }
        return {
          vw: width,
          insets,
          overflow: document.documentElement.scrollWidth - width,
        };
      }, SPINE_LANDMARKS),
    );
  }
  await zoom.close();

  console.log(
    `  zoom invariance — left inset as a share of the screen, across ${ZOOM_VIEWPORTS.join("px / ")}px
`,
  );

  let worstDrift = 0;
  for (const name of Object.keys(SPINE_LANDMARKS)) {
    const values = readings
      .map((r) => r.insets[name])
      .filter((v) => typeof v === "number");
    if (values.length < ZOOM_VIEWPORTS.length) {
      problems.push(`the ${name} landmark was not found at every viewport`);
      console.log(`    FAIL ${name.padEnd(14)} not found at every viewport`);
      continue;
    }
    const drift = Math.max(...values) - Math.min(...values);
    worstDrift = Math.max(worstDrift, drift);
    const ok = drift <= MAX_SPINE_DRIFT;
    console.log(
      `    ${ok ? "ok  " : "FAIL"} ${name.padEnd(14)} ${(Math.min(...values) * 100).toFixed(2)}%  drift ${(drift * 100).toFixed(2)}pp`,
    );
    if (!ok) {
      problems.push(
        `${name} moves ${(drift * 100).toFixed(2)} percentage points of screen width across the zoom range — the layout slides when zoomed`,
      );
    }
  }

  const overflowing = readings.filter((r) => r.overflow > 0);
  console.log(
    `    ${overflowing.length === 0 ? "ok  " : "FAIL"} ${"no overflow".padEnd(14)} ${overflowing.length === 0 ? "at any viewport" : overflowing.map((r) => `${r.overflow}px at ${r.vw}px`).join(", ")}`,
  );
  for (const r of overflowing) {
    problems.push(`${r.overflow}px of horizontal overflow at ${r.vw}px`);
  }
  console.log(
    `
    worst drift ${(worstDrift * 100).toFixed(2)}pp against a ${(MAX_SPINE_DRIFT * 100).toFixed(2)}pp ceiling
`,
  );

  console.log(
    "  ..   = reported, not enforced: too load-dependent to gate on.\n",
  );
} finally {
  await browser?.close();
  server?.kill();
}

if (problems.length) {
  console.log("  Problems:");
  for (const problem of problems) console.log(`    ${problem}`);
  console.log("");
  process.exitCode = 1;
}
