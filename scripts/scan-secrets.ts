/**
 * Secret scanner.
 *
 *     pnpm scan:secrets            # everything git tracks
 *     pnpm scan:secrets --staged   # only what is about to be committed
 *
 * Runs as a pre-commit hook, and again inside `pnpm check:security`.
 *
 * The hook is the one that matters. A key that reaches a commit is a key that
 * has to be rotated even if the commit is amended away, because it existed on
 * disk in a repository that may already have been pushed, mirrored, or backed
 * up by an editor. Catching it before the commit object is written is the only
 * point at which the answer is "delete the line" rather than "rotate the key
 * and tell everyone".
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Rule = { name: string; pattern: RegExp; note: string };

/**
 * Patterns, not entropy.
 *
 * An entropy check on a codebase full of base64 image data and hashed asset
 * names produces enough noise that people learn to ignore the hook, which is
 * worse than not having one. These match the specific shapes of the credentials
 * this project could plausibly hold.
 */
const RULES: Rule[] = [
  {
    name: "anthropic-key",
    pattern: /sk-ant-[A-Za-z0-9_-]{16,}/,
    note: "an Anthropic API key",
  },
  {
    name: "openai-key",
    pattern: /\bsk-[A-Za-z0-9]{32,}\b/,
    note: "an OpenAI-style key",
  },
  {
    name: "aws-key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    note: "an AWS access key",
  },
  {
    name: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    note: "a GitHub token",
  },
  {
    name: "google-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
    note: "a Google API key",
  },
  {
    name: "slack-token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    note: "a Slack token",
  },
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    note: "a private key block",
  },
  {
    name: "upstash-token",
    // Upstash REST tokens are long base64. Anchored to the variable name so a
    // stray base64 blob elsewhere does not trip it.
    pattern:
      /(?:KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9=_-]{20,}/,
    note: "an Upstash REST token",
  },
  {
    name: "populated-env-assignment",
    // Any KEY/TOKEN/SECRET/PASSWORD given a value that is not obviously a
    // placeholder. This is the rule that catches the credential nobody wrote a
    // pattern for.
    pattern:
      /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)\s*=\s*(?!$|["']?(?:$|\s|your|xxx|placeholder|changeme|example|<))["']?[^\s"'#]{12,}/,
    note: "an environment variable that appears to hold a real value",
  },
];

/** Files whose whole purpose is to contain these patterns. */
const ALLOW_FILES = new Set(["scripts/scan-secrets.ts"]);

/** Binary and vendored paths that are noise rather than signal. */
const SKIP =
  /(^|\/)(node_modules|\.next|\.git|pnpm-lock\.yaml)(\/|$)|\.(png|jpe?g|webp|avif|ico|woff2?|ttf|pdf|mp4)$/i;

const staged = process.argv.includes("--staged");

function tracked(): string[] {
  const args = staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACM"]
    : ["ls-files"];
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !SKIP.test(f));
}

type Finding = { file: string; line: number; rule: string; note: string };
const findings: Finding[] = [];

for (const file of tracked()) {
  if (ALLOW_FILES.has(file)) continue;

  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue; // deleted, or not readable as text
  }
  // .env.example exists to name variables and must never hold values; it is
  // checked with the rest rather than exempted.
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    // A line that is only a comment about a key is not a key.
    if (/^\s*(?:#|\/\/|\*)/.test(line)) return;
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          rule: rule.name,
          note: rule.note,
        });
        return;
      }
    }
  });
}

const scope = staged ? "staged changes" : "tracked files";
console.log(`\n  Secret scan — ${scope}\n`);

if (!findings.length) {
  console.log("  ok    nothing that looks like a credential\n");
  process.exit(0);
}

console.log("  Problems:");
for (const f of findings) {
  console.log(`    ${f.file}:${f.line}  looks like ${f.note} [${f.rule}]`);
}
console.log(
  [
    "",
    "  Nothing has been committed.",
    "",
    "  If this is a real credential: remove it, then ROTATE IT. A secret that",
    "  has been written to a file in a working tree should be treated as",
    "  disclosed, whether or not the commit happened.",
    "",
    "  If it is a false positive, the pattern is in scripts/scan-secrets.ts.",
    "",
  ].join("\n"),
);
process.exit(1);
