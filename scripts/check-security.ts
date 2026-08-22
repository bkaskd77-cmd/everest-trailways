/**
 * Security guard.
 *
 *     pnpm check:security
 *
 * Runs before every build, alongside the others.
 *
 * Everything here checks a property that a person can silently undo in a hurry:
 * pasting a key into a client component, reaching for
 * `dangerouslySetInnerHTML` because React was escaping something, deleting a
 * header that seemed to be in the way, adding an API route and forgetting that
 * a public endpoint needs a size limit. None of those break a page. All of them
 * are how a site with a security review ends up without security.
 *
 * The checks are deliberately structural rather than clever. A guard that
 * cannot be understood in a minute is a guard people disable.
 */

import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  STATIC_SECURITY_HEADERS,
  buildCsp,
} from "../src/lib/security-headers.ts";

type Problem = { rule: string; detail: string };
const problems: Problem[] = [];
const fail = (rule: string, detail: string) => problems.push({ rule, detail });

const root = process.cwd();
const SRC = path.join(root, "src");

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

const files = (await walk(SRC)).filter(
  (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
);

const rel = (f: string) => path.relative(root, f).replace(/\\/g, "/");
const sources = new Map<string, string>();
for (const file of files) sources.set(rel(file), await readFile(file, "utf8"));

/* ------------------------------------------- 1. no secrets in client code */

/*
 * Anything reachable from a "use client" module is shipped to the browser.
 * `process.env.X` in such a file is inlined into the bundle at build time —
 * it does not fail, it does not warn, it just publishes the value.
 *
 * The import graph is walked rather than only the entry files, because a
 * client component that imports a helper which reads a key has published it
 * just as thoroughly.
 */
const clientEntries = [...sources.entries()]
  .filter(([, s]) => /^\s*["']use client["']/m.test(s))
  .map(([f]) => f);

/** Resolve one import specifier to a file we have, or null if external. */
function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) {
    base = path.posix.normalize(
      path.posix.join(path.posix.dirname(from), spec),
    );
  } else return null;

  base = base.replace(/\.(ts|tsx)$/, "");
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (sources.has(base + ext)) return base + ext;
  }
  return null;
}

const IMPORT = /(?:from|import)\s+["']([^"']+)["']/g;

/** Every file the browser can reach, starting from the "use client" boundary. */
const clientReachable = new Set<string>();
const queue = [...clientEntries];
while (queue.length) {
  const file = queue.pop()!;
  if (clientReachable.has(file)) continue;
  clientReachable.add(file);
  const source = sources.get(file) ?? "";
  for (const match of source.matchAll(IMPORT)) {
    const target = resolve(file, match[1]);
    if (target && !clientReachable.has(target)) queue.push(target);
  }
}

/** Modules that must never be reachable from the browser. */
const SERVER_ONLY = [
  "src/lib/store.ts",
  "src/lib/spend.ts",
  "src/lib/matcher-prompt.ts",
];

for (const serverModule of SERVER_ONLY) {
  if (clientReachable.has(serverModule)) {
    fail(
      "server-module-in-client",
      `${serverModule} is reachable from a "use client" module — it will be bundled for the browser`,
    );
  }
}

for (const file of clientReachable) {
  const source = sources.get(file) ?? "";
  for (const match of source.matchAll(/process\.env\.([A-Za-z0-9_]+)/g)) {
    const name = match[1];
    // NEXT_PUBLIC_ is public by contract, and NODE_ENV is not a secret.
    if (name.startsWith("NEXT_PUBLIC_") || name === "NODE_ENV") continue;
    fail(
      "secret-in-client",
      `${file} reads process.env.${name} and is reachable from the browser`,
    );
  }
}

/* ------------------------------------------------ 2. no raw HTML anywhere */

/*
 * One audited exception: src/components/json-ld.tsx, which has to write a
 * <script> element and serialises through `jsonLdScript`. Everything else that
 * wants raw HTML has to justify itself by editing this list.
 */
const HTML_ALLOWED = new Set(["src/components/json-ld.tsx"]);

for (const [file, source] of sources) {
  if (!source.includes("dangerouslySetInnerHTML")) continue;
  if (HTML_ALLOWED.has(file)) continue;
  fail(
    "raw-html",
    `${file} uses dangerouslySetInnerHTML — only src/components/json-ld.tsx may, and only via jsonLdScript`,
  );
}

const jsonLd = sources.get("src/components/json-ld.tsx") ?? "";
if (jsonLd && !jsonLd.includes("jsonLdScript(")) {
  fail(
    "raw-html",
    "json-ld.tsx no longer serialises through jsonLdScript, so its escaping is gone",
  );
}

/* ------------------------------------------------------- 3. the headers */

const REQUIRED_HEADERS = [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Permissions-Policy",
];

const present = new Set(STATIC_SECURITY_HEADERS.map((h) => h.key));
for (const header of REQUIRED_HEADERS) {
  if (!present.has(header)) fail("missing-header", `${header} is not sent`);
}

const hsts = STATIC_SECURITY_HEADERS.find(
  (h) => h.key === "Strict-Transport-Security",
);
const maxAge = Number(/max-age=(\d+)/.exec(hsts?.value ?? "")?.[1] ?? 0);
if (maxAge < 31536000) {
  fail("weak-header", `HSTS max-age is ${maxAge}, under one year`);
}
if (!hsts?.value.includes("includeSubDomains")) {
  fail("weak-header", "HSTS does not include subdomains");
}

const permissions =
  STATIC_SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy")?.value ??
  "";
for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
  if (!permissions.includes(`${feature}=()`)) {
    fail("weak-header", `Permissions-Policy does not deny ${feature}`);
  }
}

/* ------------------------------------------------------------- 4. the CSP */

const csp = buildCsp("test-nonce", false);
const REQUIRED_CSP = [
  "default-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "connect-src 'self'",
];
for (const directive of REQUIRED_CSP) {
  if (!csp.includes(directive)) {
    fail("weak-csp", `the policy is missing "${directive}"`);
  }
}

/*
 * `unsafe-eval` is never acceptable in production, in any mode. `unsafe-inline`
 * on script-src is a documented, deliberate trade — see the long comment in
 * security-headers.ts — but it must never spread beyond script and style.
 */
if (csp.includes("'unsafe-eval'")) {
  fail("weak-csp", "the production policy allows unsafe-eval");
}
for (const directive of csp.split("; ")) {
  if (!directive.includes("'unsafe-inline'")) continue;
  const name = directive.split(" ")[0];
  if (
    name !== "script-src" &&
    name !== "style-src" &&
    name !== "style-src-attr"
  ) {
    fail("weak-csp", `${name} allows unsafe-inline`);
  }
}

const proxy = sources.get("src/proxy.ts") ?? "";
if (!proxy) {
  fail(
    "no-proxy",
    "src/proxy.ts is missing — in this version of Next that file, not middleware.ts, is what sets per-request headers",
  );
}
if (proxy && !proxy.includes("buildCsp(")) {
  fail("no-proxy", "src/proxy.ts does not set a Content-Security-Policy");
}

const config = await readFile(path.join(root, "next.config.ts"), "utf8");
if (!/poweredByHeader:\s*false/.test(config)) {
  fail("weak-header", "next.config.ts does not remove X-Powered-By");
}
if (!config.includes("STATIC_SECURITY_HEADERS")) {
  fail("missing-header", "next.config.ts does not attach the static headers");
}

/* ------------------------------------------------- 5. every API route */

/*
 * A new public endpoint is the easiest way to reintroduce every problem this
 * step just fixed. Each one must limit its callers and bound its input.
 */
const routes = [...sources.keys()].filter(
  (f) => f.startsWith("src/app/") && f.endsWith("/route.ts"),
);

if (!routes.length)
  fail("no-routes", "no API routes found — is the path right?");

for (const route of routes) {
  const source = sources.get(route)!;

  /*
   * A prerendered route is a file on a CDN, not a function.
   *
   * There is no per-request work to abuse and therefore nothing for a rate
   * limit to protect, so `force-static` exempts a route from the limiter rule —
   * but only when it also fixes its parameters, because a static route that
   * accepts unknown params would generate on demand and be a function after
   * all.
   */
  const prerendered =
    /dynamic\s*=\s*"force-static"/.test(source) &&
    /dynamicParams\s*=\s*false/.test(source);

  if (!prerendered && !source.includes("checkLimit(")) {
    fail("unlimited-route", `${route} does not rate limit its callers`);
  }
  // Only routes that accept a body need an input bound.
  const takesBody = /export async function (POST|PUT|PATCH)/.test(source);
  if (takesBody && !/MAX_BODY_BYTES/.test(source)) {
    fail(
      "unbounded-input",
      `${route} accepts a body without a maximum size checked before parsing`,
    );
  }
  if (takesBody && !source.includes("originAllowed(")) {
    fail("no-origin-check", `${route} accepts a body without an origin check`);
  }
}

/* --------------------------------------------- 6. the matcher's own rules */

const matchRoute = sources.get("src/app/api/match/route.ts") ?? "";
for (const [needle, detail] of [
  ["maySpend(", "no global spend ceiling — one endpoint can run up any bill"],
  ["validateResult(", "model output is not validated against the schema"],
  ["fenceUserText(", "user text is not fenced before it reaches the model"],
  ["cleanUserText(", "user text is not sanitised before it is used"],
  ["cleanModelText", "model output is not sanitised before it is rendered"],
] as const) {
  if (!matchRoute.includes(needle)) fail("matcher-unsafe", detail);
}

const spend = await readFile(path.join(root, "src/lib/spend.ts"), "utf8");
if (!/reason:\s*"no-store"/.test(spend)) {
  fail(
    "fails-open",
    "spend.ts does not fail closed when the store is unreachable",
  );
}

/* ------------------------------------------------- 7. secrets and deps */

try {
  execFileSync(
    "node",
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "scripts/scan-secrets.ts",
    ],
    { cwd: root, stdio: "pipe" },
  );
} catch {
  fail("secret", "the secret scanner found something — run pnpm scan:secrets");
}

const pkg = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

for (const field of ["dependencies", "devDependencies"] as const) {
  for (const [name, range] of Object.entries(pkg[field] ?? {})) {
    if (/^[\^~><*]|\|\|| - /.test(range)) {
      fail(
        "unpinned",
        `${name} is "${range}" — pin it, so a build cannot pull code nobody reviewed`,
      );
    }
  }
}

/*
 * A known critical advisory fails the build.
 *
 * `pnpm audit` exits non-zero when it finds something at or above the level
 * asked for, and also when it cannot reach the registry. Those are not the same
 * thing and must not be treated the same: an offline build is not a vulnerable
 * one, so a network failure reports and continues while a real finding fails.
 */
let auditOutput = "";
let auditFailed = false;
try {
  /*
   * On Windows `pnpm` is a .cmd, and since Node's command-injection fix a .cmd
   * cannot be spawned without a shell. Rather than `shell: true` — which
   * concatenates arguments instead of escaping them — the interpreter is named
   * explicitly. Every argument here is a literal in this file; none of it comes
   * from a request, a filename or an environment variable.
   */
  const [bin, prefix] =
    process.platform === "win32"
      ? ["cmd.exe", ["/d", "/s", "/c", "pnpm"]]
      : ["pnpm", []];

  auditOutput = execFileSync(
    bin,
    [...prefix, "audit", "--prod", "--audit-level", "critical"],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
} catch (error) {
  const e = error as { stdout?: string; stderr?: string };
  auditOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  auditFailed = true;
}

/*
 * Three outcomes, and only one is a finding: a real advisory, a registry we
 * could not reach, or an audit that could not run at all. Reporting the last
 * two as "vulnerable" would train people to ignore this guard, and a guard
 * people ignore is worse than no guard.
 */
const unreachable =
  /ERR_PNPM_AUDIT|ENOTFOUND|ECONNREFUSED|network|EAI_AGAIN/i.test(auditOutput);
const couldNotRun = auditFailed && auditOutput.trim() === "";
const offline = unreachable || couldNotRun;

if (auditFailed && !offline) {
  fail(
    "vulnerable-dependency",
    "pnpm audit reports a critical advisory in production dependencies",
  );
}

/* ------------------------------------------------------------------ report */

console.log("\n  Security\n");
console.log(
  `  ok    ${clientEntries.length} client entry points, ${clientReachable.size} modules reachable from the browser`,
);
console.log(`  ok    no secret read from any of them`);
console.log(
  `  ok    dangerouslySetInnerHTML confined to ${[...HTML_ALLOWED][0]}`,
);
console.log(
  `  ok    ${REQUIRED_HEADERS.length} required headers sent, HSTS ${maxAge / 31536000}y`,
);
console.log(
  `  ok    CSP: ${REQUIRED_CSP.length} strict directives, no unsafe-eval`,
);
console.log(
  `  ok    ${routes.length} route handlers, all limited and bounded or prerendered`,
);
console.log(
  `  ok    ${Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length} dependencies pinned`,
);
console.log(
  `  ${offline ? ".." : "ok"}    audit${
    offline
      ? `: ${couldNotRun ? "could not be run here" : "registry unreachable"} — not checked`
      : ": no critical advisories"
  }`,
);

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
