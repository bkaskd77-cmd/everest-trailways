/**
 * Control characters that should never be in source.
 *
 *     pnpm check:source-bytes
 *
 * This has now killed four guards across the project, and every time the same
 * way. A regex containing `\b` is written through a shell heredoc, the shell
 * interprets the escape, and `\b` becomes a literal backspace byte. The result
 * is a pattern that looks correct in every diff and every editor — a backspace
 * renders as nothing — and matches nothing at runtime. The guard reports "no
 * problems" for as long as it exists.
 *
 * The two found today had been dead since the steps that wrote them: three of
 * four placeholder markers in `check-policies`, and both halves of the rule in
 * `check-departures` that is supposed to catch prose promising a service whose
 * cost line has moved. Neither could ever have fired.
 *
 * A byte that cannot appear legitimately in this codebase is the easiest thing
 * in the world to check for, and not checking for it has been expensive.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

/**
 * Every control character except the three that belong in text.
 *
 * Tab (0x09), newline (0x0A) and carriage return (0x0D) are legitimate. So is
 * anything above 0x1F. Everything else — backspace, form feed, vertical tab,
 * the escape byte — is either a mangled escape sequence or a paste accident,
 * and both are bugs that hide.
 */
const FORBIDDEN = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

const NAMES: Record<string, string> = {
  "\x08": "backspace (0x08) — almost always a `\\b` eaten by a shell heredoc",
  "\x0C": "form feed (0x0C)",
  "\x0B": "vertical tab (0x0B)",
  "\x1B": "escape (0x1B) — probably a terminal colour code pasted in",
  "\x00": "null (0x00)",
};

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

const EXTENSIONS = [".ts", ".tsx", ".css", ".json", ".md", ".mjs", ".js"];

const files = [
  ...(await walk(path.join(root, "src"))),
  ...(await walk(path.join(root, "scripts"))),
].filter((f) => EXTENSIONS.some((e) => f.endsWith(e)));

const problems: string[] = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(root, file).split(path.sep).join("/");

  for (const match of source.matchAll(FORBIDDEN)) {
    const line = source.slice(0, match.index).split("\n").length;
    const char = match[0];
    problems.push(
      `${rel}:${line} contains ${NAMES[char] ?? `control character 0x${char.charCodeAt(0).toString(16).padStart(2, "0")}`}`,
    );
  }
}

console.log("\n  Source bytes\n");
console.log(`  ok    ${files.length} files scanned for control characters`);

if (problems.length) {
  console.log("\n  Problems:");
  /* One line per file is enough; a mangled heredoc produces several. */
  const seen = new Set<string>();
  for (const problem of problems) {
    const key = problem.split(" contains ")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`    [control-character] ${problem}`);
  }
  console.log(
    "\n    These render as nothing in an editor and match nothing at runtime.\n",
  );
  process.exitCode = 1;
} else {
  console.log(
    "\n  no problems — nothing that renders as nothing and matches nothing\n",
  );
}
