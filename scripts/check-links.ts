/**
 * Internal link guard.
 *
 *     pnpm check:links
 *
 * A site whose entire argument is "every claim here is checkable" cannot have a
 * navigation bar pointing at pages that do not exist. Before this ran, eleven
 * hrefs in the header, footer and trust strip led to 404s.
 *
 * It reads every internal href out of the source rather than crawling a running
 * server: the routes are files on disk, so the question "does this href resolve"
 * is answerable statically, in a second, with no build and no port. Dynamic
 * segments are resolved against the params their route actually generates, so
 * `/departures/<slug>` is checked against the nineteen slugs that exist rather
 * than waved through as "something dynamic".
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { departures } from "../src/content/departures.ts";

type Problem = { rule: string; detail: string };
const problems: Problem[] = [];
const fail = (rule: string, detail: string) => problems.push({ rule, detail });

const root = process.cwd();
const APP = path.join(root, "src", "app");

/* ------------------------------------------------ what routes actually exist */

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

const appFiles = await walk(APP);

/** Static routes: every `page.tsx` and `route.ts`, minus its segment groups. */
const staticRoutes = new Set<string>();
/** Dynamic ones, kept as a pattern so their params can be filled in. */
const dynamicRoutes: { segments: string[]; source: string }[] = [];

for (const file of appFiles) {
  const base = path.basename(file);
  if (base !== "page.tsx" && base !== "route.ts") continue;
  const rel = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));

  if (rel.some((s) => s.startsWith("["))) {
    dynamicRoutes.push({ segments: rel, source: path.relative(root, file) });
  } else {
    staticRoutes.add(`/${rel.join("/")}`.replace(/\/$/, "") || "/");
  }
}

/**
 * Every concrete path a dynamic route generates.
 *
 * There is exactly one dynamic page on the site and it is fed by
 * `departures`, so this resolves it from the same array the page does rather
 * than by executing `generateStaticParams` — which would mean bundling React
 * to answer a question about strings.
 */
const generated = new Set<string>();
for (const route of dynamicRoutes) {
  const pattern = `/${route.segments.join("/")}`;
  if (pattern === "/departures/[slug]") {
    for (const d of departures) generated.add(`/departures/${d.slug}`);
  } else {
    fail(
      "unresolved-dynamic",
      `${route.source} is a dynamic route this guard does not know how to enumerate — teach it, or it cannot check links into it`,
    );
  }
}

const allRoutes = new Set([...staticRoutes, ...generated]);

/* ------------------------------------------------------- every internal href */

const sourceFiles = (await walk(path.join(root, "src"))).filter(
  (f) => f.endsWith(".tsx") || f.endsWith(".ts"),
);

/** Literal hrefs, and the one template form the codebase actually uses. */
const LITERAL = /href[=:]\s*\{?"(\/[^"]*)"/g;
const TEMPLATE = /href=\{`(\/[^`]*)`\}/g;

type Found = { href: string; source: string; line: number };
const found: Found[] = [];

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const at = (index: number) => source.slice(0, index).split("\n").length;

  for (const match of source.matchAll(LITERAL)) {
    found.push({ href: match[1], source: rel, line: at(match.index) });
  }
  for (const match of source.matchAll(TEMPLATE)) {
    // `/departures/${departure.slug}` — the interpolation is replaced with a
    // real slug so the shape is checked rather than skipped.
    const href = match[1].replace(/\$\{[^}]+\}/g, departures[0].slug);
    found.push({ href, source: rel, line: at(match.index) });
  }
}

/* ------------------------------------------------------------------ the check */

const checked = new Set<string>();

for (const { href, source, line } of found) {
  // Strip the fragment and any query: a route either exists or it does not,
  // and `#cost-sheet` is a position on a page rather than a page.
  const routePart = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  checked.add(routePart);

  if (!allRoutes.has(routePart)) {
    fail(
      "dead-link",
      `${source}:${line} links to ${href} — no route resolves to ${routePart}`,
    );
  }
}

/* --------------------------------------- the data's own links, checked too */

for (const d of departures) {
  const target = d.costSheetHref.split("#")[0];
  if (!allRoutes.has(target)) {
    fail(
      "dead-link",
      `${d.id} has costSheetHref "${d.costSheetHref}", and no route resolves to ${target}`,
    );
  }
}

/* ------------------------------------------------------------------ report */

console.log("\n  Internal links\n");
console.log(
  `  ok    ${staticRoutes.size} static routes, ${generated.size} generated from departures`,
);
console.log(`  ok    ${found.length} hrefs read from source`);
console.log(`  ok    ${checked.size} distinct internal paths checked`);

if (problems.length) {
  console.log("\n  Problems:");
  const seen = new Set<string>();
  for (const p of problems) {
    const line = `    [${p.rule}] ${p.detail}`;
    if (seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
  console.log("");
  process.exitCode = 1;
} else {
  console.log("\n  no problems\n");
}
