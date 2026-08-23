/**
 * Every page, opened and read.
 *
 *     pnpm qa
 *
 * The other guards check the data and the source. This one checks the thing a
 * visitor actually gets: it starts the production build, opens every route on
 * the site at two widths, scrolls each one to the bottom the way a person
 * would, and fails on anything that would make a page look broken.
 *
 * It exists because a page can be green on every other check and still be
 * wrong on screen. Three times now:
 *
 *   the homepage grid was handed the whole array and rendered nineteen cards
 *   in a 17,000px wall;
 *
 *   /departures went completely blank, because a reveal's viewport threshold
 *   asked for 1,280px of a 6,400px element to be visible in a 900px window;
 *
 *   and three departure headers became three grey placeholder panels with no
 *   photograph in them, after a category split moved the only verified image
 *   into the other half.
 *
 * Every one of those shipped with a clean build. None of them was a data
 * error, so no data guard could have caught it. What they have in common is
 * that opening the page would have shown it immediately — which is all this
 * script does, at a scale nobody is going to do by hand on forty-seven pages
 * twice each.
 *
 * Not in `pnpm build`: it needs the build it is testing. Run it after.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import puppeteer, { type Browser } from "puppeteer";

import { departures } from "../src/content/departures.ts";
import { TREK_PAGES } from "../src/content/trek-pages.ts";

const root = process.cwd();

/* ------------------------------------------------------------ the routes */

/**
 * Built from the content, not typed out.
 *
 * A hand-written list is a list that stops covering the site the first time
 * somebody adds a departure, which is exactly when this is worth running.
 */
const regionSlugs = [...new Set(TREK_PAGES.map((t) => t.region))]
  .sort()
  .map((r) =>
    r
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  );

const ROUTES = [
  "/",
  "/departures",
  "/treks",
  "/regions",
  "/about",
  "/activities",
  "/cancellation",
  "/journal",
  "/licences",
  "/plan",
  "/pricing",
  "/safety",
  ...TREK_PAGES.map((t) => `/treks/${t.slug}`),
  ...regionSlugs.map((r) => `/regions/${r}`),
  ...departures.map((d) => `/departures/${d.slug}`),
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

/* ------------------------------------------------------------- the checks */

type Finding = { route: string; viewport: string; rule: string; detail: string };
const findings: Finding[] = [];

/** Reported, not enforced — see the reveal-share rule below. */
const noted: string[] = [];

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

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.error(
    "\n  No production build found. Run `pnpm build` first — `next dev` renders differently and would make this lie.\n",
  );
  process.exit(1);
}

const port = await freePort();
let server: ChildProcess | null = null;
let browser: Browser | null = null;

try {
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

  console.log(
    `\n  QA — ${ROUTES.length} routes × ${VIEWPORTS.length} widths, production build on port ${port}\n`,
  );

  for (const route of ROUTES) {
    const line: string[] = [];

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        isMobile: viewport.width < 768,
        hasTouch: viewport.width < 768,
      });

      /*
       * The page has to be the foreground tab.
       *
       * A backgrounded page in headless Chrome throttles requestAnimationFrame
       * and delays IntersectionObserver callbacks, which are the two things
       * every reveal on this site depends on. Without this the harness
       * reported content as never-revealed that a real browser shows without
       * complaint, and reported a different set of it on every run.
       */
      await page.bringToFront();

      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(String(error)));

      const fail = (rule: string, detail: string) =>
        findings.push({ route, viewport: viewport.name, rule, detail });

      const response = await page.goto(`http://127.0.0.1:${port}${route}`, {
        waitUntil: "networkidle2",
        timeout: 45_000,
      });

      /*
       * 304 counts. The second viewport re-requests a page the first one just
       * fetched, so the browser revalidates and gets Not Modified — which is
       * the cache working, not the page failing. Treating it as an error made
       * this script report all forty-seven routes broken on mobile.
       */
      const status = response?.status() ?? 0;
      if (status !== 200 && status !== 304) {
        fail("http-status", `responded ${status || "nothing"}`);
        await page.close();
        line.push(`${viewport.name}:HTTP`);
        continue;
      }

      /*
       * Watch every element for the whole scroll, then ask what it did.
       *
       * Sampling opacity once at the end is the wrong measurement and it took
       * three tries to admit it. Reveals are staggered, the seat meter runs a
       * four-beat animation, and a mobile page is twice as tall as a desktop
       * one — so a single sample caught different elements mid-flight on every
       * run, and the same page failed at one width and passed at the other. A
       * check whose answer changes between runs is worse than no check.
       *
       * So this records the highest opacity each element reaches at any point
       * during the scroll. An element that revealed and later animated back
       * down is fine; one whose maximum never leaves zero was never shown to
       * anybody. That question has one answer, and timing cannot change it.
       */
      await page.evaluate(async () => {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const de = document.documentElement;

        const peak = new Map<Element, number>();
        let watching = true;
        const sample = () => {
          for (const el of document.querySelectorAll("[data-motion]")) {
            const now = Number(getComputedStyle(el).opacity);
            peak.set(el, Math.max(peak.get(el) ?? 0, now));
          }
          if (watching) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);

        /*
         * 150px every 40ms, because an IntersectionObserver coalesces under a
         * faster scroll and reports elements as never having intersected —
         * inventing failures no visitor would ever see.
         */
        for (let y = 0; y < de.scrollHeight; y += 150) {
          window.scrollTo(0, y);
          await wait(40);
        }
        await wait(2500);
        watching = false;

        const never: string[] = [];
        for (const [el, best] of peak) {
          if (best > 0.05) continue;
          if (el.closest("[aria-hidden='true']")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.height <= 10 || rect.width <= 10) continue;
          never.push(((el as HTMLElement).innerText || "").trim().slice(0, 50));
        }
        (window as unknown as { __never: string[] }).__never = never;
      });

      const result = await page.evaluate(() => {
        const de = document.documentElement;

        /* Recorded across the whole scroll by the watcher above. */
        const stuck =
          (window as unknown as { __never?: string[] }).__never ?? [];
        const motionTotal = document.querySelectorAll("[data-motion]").length;

        /* A section that rendered to nothing is a section that failed. */
        const emptySections = [...document.querySelectorAll("section")]
          .filter((s) => s.getBoundingClientRect().height < 24)
          .map((s) => s.id || s.getAttribute("aria-labelledby") || "(unnamed)");

        const images = [...document.querySelectorAll("img")];

        return {
          overflowPx: de.scrollWidth - de.clientWidth,
          stuck,
          emptySections,
          brokenImages: images
            .filter((i) => i.complete && i.naturalWidth === 0)
            .map((i) => i.getAttribute("src")?.slice(0, 60) ?? "(no src)"),
          motionTotal,
          h1s: document.querySelectorAll("h1").length,
          textLength: (document.body.innerText || "").length,
          docHeight: de.scrollHeight,
          /*
           * A hero that is entirely placeholder panels. This is the failure
           * the category split shipped: every slot filled, no photograph in
           * any of them, and a page that looks broken above the fold.
           */
          heroPhotographs: (() => {
            const slider = document.querySelector(
              'ul[aria-label^="Photographs from"]',
            );
            if (!slider) return null;
            return {
              slides: slider.children.length,
              photographs: slider.querySelectorAll("img").length,
            };
          })(),
        };
      });

      if (result.overflowPx > 1) {
        fail(
          "horizontal-overflow",
          `the page scrolls sideways by ${result.overflowPx}px`,
        );
      }
      /*
       * A share of the page, not a count of elements.
       *
       * This is the check worth having — /departures once shipped completely
       * blank because a reveal threshold could not be satisfied — and it is
       * also the one headless Chrome is worst at. Verified three times against
       * a real browser: elements this reports as never-revealed at mobile
       * width reach full opacity when a person scrolls the same page, and the
       * set it names changes from run to run.
       *
       * So the rule asks the question headless can answer reliably. One or two
       * elements caught mid-animation is noise. A quarter of a page that never
       * painted is the blank-page bug, and no amount of sampling jitter
       * produces that number. Below the threshold the count is printed and not
       * failed — the same split `pnpm perf` already makes between what is a
       * property of the build and what is a property of the machine.
       */
      const neverShare = result.motionTotal
        ? result.stuck.length / result.motionTotal
        : 0;
      if (result.stuck.length >= 4 && neverShare > 0.25) {
        fail(
          "page-never-revealed",
          `${result.stuck.length} of ${result.motionTotal} animated elements never painted (${Math.round(neverShare * 100)}%) — e.g. "${result.stuck[0]}"`,
        );
      } else if (result.stuck.length) {
        noted.push(
          `${route} (${viewport.name}) — ${result.stuck.length} of ${result.motionTotal} sampled as never painted; below the threshold, and headless is unreliable here`,
        );
      }
      for (const id of result.emptySections) {
        fail("empty-section", `<section ${id}> rendered to nothing`);
      }
      for (const src of result.brokenImages) {
        fail("broken-image", src);
      }
      if (result.h1s !== 1) {
        fail("heading-count", `${result.h1s} <h1> elements, expected exactly 1`);
      }
      if (result.textLength < 400) {
        fail("thin-page", `${result.textLength} characters of visible text`);
      }
      if (result.heroPhotographs && result.heroPhotographs.photographs === 0) {
        fail(
          "placeholder-hero",
          `${result.heroPhotographs.slides} slides and not one photograph`,
        );
      }
      for (const error of consoleErrors.slice(0, 3)) {
        fail("console-error", error.slice(0, 120));
      }

      const bad = findings.filter(
        (f) => f.route === route && f.viewport === viewport.name,
      ).length;
      line.push(`${viewport.name}:${bad ? `${bad} FAIL` : "ok"}`);
      await page.close();
    }

    const clean = line.every((l) => l.endsWith("ok"));
    console.log(
      `  ${clean ? "ok    " : "FAIL  "} ${route.padEnd(44)} ${line.join("  ")}`,
    );
  }
} finally {
  await browser?.close();
  server?.kill();
}

/* ------------------------------------------------------------------ report */

if (findings.length) {
  console.log("\n  Problems:\n");
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) {
    byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  }
  for (const [rule, list] of byRule) {
    console.log(`  [${rule}] ${list.length}`);
    for (const f of list.slice(0, 8)) {
      console.log(`    ${f.route} (${f.viewport}) — ${f.detail}`);
    }
    if (list.length > 8) console.log(`    …and ${list.length - 8} more`);
  }
  console.log("");
  process.exitCode = 1;
} else {
  console.log(
    `\n  ${ROUTES.length} routes opened at ${VIEWPORTS.length} widths, scrolled to the bottom. Nothing broken.\n`,
  );
}

if (noted.length) {
  console.log(`  Reported, not enforced — ${noted.length} page(s):`);
  for (const note of noted.slice(0, 6)) console.log(`    ${note}`);
  if (noted.length > 6) console.log(`    …and ${noted.length - 6} more`);
  console.log("");
}
