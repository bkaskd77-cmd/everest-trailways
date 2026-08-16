/**
 * The wire between the matcher UI and /api/match.
 *
 * Deliberately dependency-free so the client bundle, the route and the guard
 * can all share it without dragging the prompt or the dataset along.
 */

/** Five is the ceiling the section promises. Enforced by the route and the UI. */
export const MAX_QUESTIONS = 5;

/** Two or three real departures. More is a catalogue, not a match. */
export const MAX_MATCHES = 3;

/** Stated in the UI as well as the prompt, because it is a promise, not a footnote. */
export const NO_STORAGE_NOTICE =
  "Nothing you type here is stored. The conversation lives in this browser tab and is discarded when you close it.";

export type MatchTurn = { role: "user" | "assistant"; content: string };

export type Match = {
  /** Must exist in src/content/departures.ts. Enforced twice — see below. */
  id: string;
  reason: string;
  caution: string;
};

export type MatcherQuestion = { text: string; options: string[] };

export type MatcherResult = {
  message: string;
  done: boolean;
  question: MatcherQuestion | null;
  matches: Match[];
  /** Which path produced this — surfaced in the UI, not hidden. */
  source: "assistant" | "fallback";
};

/** Newline-delimited JSON. One frame per line, so a partial line is never parsed. */
export type MatcherFrame =
  | { t: "delta"; v: string }
  | { t: "result"; result: MatcherResult }
  | { t: "error"; v: string };

const ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  '"': '"',
  "\\": "\\",
  "/": "/",
};

/**
 * Pull the `message` string out of a JSON document that is still arriving.
 *
 * Re-run over the whole accumulated buffer on every chunk rather than kept as a
 * cursor: idempotent, and it cannot desynchronise if a chunk splits an escape
 * sequence in half. The caller diffs against what it has already sent.
 *
 * This is why the response shape puts `message` first — it means the prose
 * starts streaming before the model has decided on the matches.
 */
export function extractMessage(raw: string): string {
  const opening = /"message"\s*:\s*"/.exec(raw);
  if (!opening) return "";

  let i = opening.index + opening[0].length;
  let out = "";

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === "\\") {
      const next = raw[i + 1];
      // An escape split across two chunks: stop and pick it up next time.
      if (next === undefined) break;
      if (next === "u") {
        const hex = raw.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += ESCAPES[next] ?? next;
      i += 2;
      continue;
    }

    if (ch === '"') break;
    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Parse defensively.
 *
 * The model is told to return bare JSON, and mostly does. It is not trusted to:
 * fences get stripped, anything outside the outermost braces is discarded, and
 * a failure returns null rather than throwing so the caller can fall through to
 * the deterministic matcher.
 */
export function parseMatcherJson(raw: string): Record<string, unknown> | null {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : fallback;

/**
 * Coerce a parsed object into a MatcherResult, dropping anything that does not
 * hold up.
 *
 * `validIds` is the second enforcement of hard constraint 1: the prompt tells
 * the model only to name real departures, and this throws away any id that is
 * not one regardless of what it was told. A recommendation the site cannot link
 * to is worse than no recommendation.
 */
export function coerceResult(
  parsed: Record<string, unknown>,
  validIds: readonly string[],
  maxMatches: number,
): MatcherResult | null {
  const message = str(parsed.message);
  if (!message) return null;

  const rawMatches = Array.isArray(parsed.matches) ? parsed.matches : [];
  const matches: Match[] = [];
  const seen = new Set<string>();

  for (const entry of rawMatches) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = str(row.id);
    if (!validIds.includes(id) || seen.has(id)) continue;
    seen.add(id);
    matches.push({
      id,
      reason: str(row.reason),
      caution: str(
        row.caution,
        "Ask us anything you are unsure about before committing.",
      ),
    });
    if (matches.length >= maxMatches) break;
  }

  let question: MatcherQuestion | null = null;
  const q = parsed.question;
  if (q && typeof q === "object" && !Array.isArray(q)) {
    const row = q as Record<string, unknown>;
    const text = str(row.text);
    const options = Array.isArray(row.options)
      ? row.options
          .map((o) => str(o))
          .filter(Boolean)
          .slice(0, 3)
      : [];
    if (text && options.length >= 2) question = { text, options };
  }

  // `done` is derived from what actually survived, not from what was claimed:
  // a turn with no usable question is over whether the model said so or not.
  const done = parsed.done === true || question === null;

  return {
    message,
    done,
    question: done ? null : question,
    matches: done ? matches : [],
    source: "assistant",
  };
}
