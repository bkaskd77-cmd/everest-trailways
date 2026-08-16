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

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "desktop 1440", width: 1440, height: 900 },
  { name: "mobile 390", width: 390, height: 844 },
];

/** Fails the run. Properties of the build, identical on any machine. */
const ENFORCED = {
  /** Core Web Vitals "good" threshold. */
  cls: 0.1,
  /** Transferred JavaScript, KB. Headroom over the current ~240KB. */
  jsKB: 320,
  /** A homepage that needs more nodes than this has a structural problem. */
  domNodes: 2600,
};

/** Printed with a target, never enforced — too load-dependent on one desktop. */
const REPORTED = { lcpMs: 2500, tbtMs: 200 };

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
  lcpElement: string | null;
};

async function measure(page: Page, url: string): Promise<Metrics> {
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

  // Open the matcher — the largest layout change on the page.
  await page.evaluate(async () => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      /Find what fits/.test(b.textContent ?? ""),
    );
    button?.click();
    await new Promise((r) => setTimeout(r, 1400));
  });

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

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768,
    });

    const m = await measure(page, `http://127.0.0.1:${port}/`);
    await page.close();

    const mark = (ok: boolean) => (ok ? "ok  " : "FAIL");
    console.log(`  ${viewport.name}`);
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
      `    ..   LCP            ${m.lcpMs === null ? "unmeasured" : `${m.lcpMs} ms`}  (target ${REPORTED.lcpMs} ms) — ${m.lcpElement ?? "no element"}`,
    );
    console.log(
      `    ..   TBT            ${m.tbtMs} ms  (target ${REPORTED.tbtMs} ms, load-dependent)\n`,
    );

    if (m.clsAfterInteraction > ENFORCED.cls) {
      problems.push(
        `${viewport.name}: CLS ${m.clsAfterInteraction.toFixed(4)} over ${ENFORCED.cls}`,
      );
    }
    if (m.jsKB > ENFORCED.jsKB) {
      problems.push(
        `${viewport.name}: ${m.jsKB} KB of JS over ${ENFORCED.jsKB} KB`,
      );
    }
    if (m.domNodes > ENFORCED.domNodes) {
      problems.push(
        `${viewport.name}: ${m.domNodes} DOM nodes over ${ENFORCED.domNodes}`,
      );
    }
  }

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
