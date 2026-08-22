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

/**
 * A departure that would otherwise have suited someone but breaks something
 * they told us — an altitude ceiling, the days they have, the window they can
 * travel in.
 *
 * Kept as its own type rather than a flag on Match so it is impossible to
 * render one where the other belongs. `exceeds` states the breach and its size
 * in plain words; it is never a selling point and never a recommendation.
 */
export type Beyond = { id: string; exceeds: string };

export type MatcherQuestion = { text: string; options: string[] };

export type MatcherResult = {
  message: string;
  done: boolean;
  question: MatcherQuestion | null;
  /** Everything here satisfies every hard constraint the person stated. */
  matches: Match[];
  /** Everything here breaks one, and says which. Never presented as a match. */
  beyond: Beyond[];
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

/* ---------------------------------------------------------- strict validation */

/**
 * The exact keys each object may carry. Not a minimum — a complete list.
 *
 * An unexpected key is not ignored, it is fatal. That is the difference between
 * coercion and validation, and it matters here: the model is downstream of
 * hostile free text, so a response carrying a field nobody designed is evidence
 * that something is steering it. The right response to evidence of that is to
 * throw the whole answer away, not to pick the familiar parts out of it.
 */
const ALLOWED = {
  root: ["message", "done", "question", "matches", "beyond"],
  question: ["text", "options"],
  match: ["id", "reason", "caution"],
  beyond: ["id", "exceeds"],
} as const;

/**
 * Angle brackets anywhere in the model's output.
 *
 * The sanitiser strips them, so nothing dangerous would render either way. This
 * rejects instead, because stripping leaves the *residue* on the page: an
 * injected `<a href=...>` becomes a sentence with a bare URL in it, which is
 * still an attacker choosing what a visitor reads.
 *
 * More to the point, a model answering a question about trek dates has no
 * reason to emit a tag. One appearing is evidence the model is being steered,
 * and the correct response to that evidence is to discard the turn, not to
 * tidy it up and publish it.
 */
function hasMarkup(parsed: unknown): boolean {
  // Serialised rather than walked: this has to cover every field at every
  // depth, including fields the schema does not know about, and JSON.stringify
  // already visits all of them. The second test catches the six literal
  // characters of a unicode escape, which is how the same payload arrives when
  // the model has been asked to encode it.
  const flat = JSON.stringify(parsed) ?? "";
  return /[<>]/.test(flat) || /\\u003[ce]/i.test(flat);
}

function keysOk(value: unknown, allowed: readonly string[]): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((k) => allowed.includes(k));
}

export type ValidationFailure =
  | "not-an-object"
  | "unknown-field"
  | "bad-message"
  | "bad-done"
  | "bad-question"
  | "bad-match"
  | "unknown-id"
  | "bad-beyond"
  | "too-many"
  | "echoes-input"
  | "markup";

export type ValidationOutcome =
  { ok: true; result: MatcherResult } | { ok: false; why: ValidationFailure };

/**
 * Turn parsed JSON into a MatcherResult, or refuse.
 *
 * There is no partial success. Every failure returns a reason and the caller
 * serves the deterministic matcher instead — the model gets to choose between
 * the shape it was given and having no voice at all, which is the only
 * arrangement under which a prompt injection cannot put prose on the page.
 *
 * Two enforcements happen here that the prompt only asks for:
 *   - every id must exist in the dataset, so a recommendation always points at
 *     something real;
 *   - every match is re-tested against what the person actually stated, and one
 *     that breaks a stated ceiling is moved to `beyond` rather than shown as a
 *     fit. The model is told the rule; this is what makes the rule true.
 */
export function validateResult(
  parsed: Record<string, unknown>,
  options: {
    validIds: readonly string[];
    maxMatches: number;
    breach: (id: string) => string | null;
    /** Raw user turns, to refuse output that quotes them back. */
    userText?: string[];
    clean: (value: unknown, limit: number) => string;
    limits: {
      message: number;
      reason: number;
      caution: number;
      exceeds: number;
      questionText: number;
      option: number;
    };
    echoes: (output: string, userText: string[]) => boolean;
  },
): ValidationOutcome {
  const {
    validIds,
    maxMatches,
    breach,
    userText = [],
    clean,
    limits,
    echoes,
  } = options;

  const no = (why: ValidationFailure): ValidationOutcome => ({
    ok: false,
    why,
  });

  if (!keysOk(parsed, ALLOWED.root)) return no("unknown-field");

  // Checked across the whole document before anything is cleaned, so a tag in
  // any field — not only the ones that get rendered — condemns the answer.
  if (hasMarkup(parsed)) return no("markup");

  const message = clean(parsed.message, limits.message);
  if (!message) return no("bad-message");

  if (typeof parsed.done !== "boolean") return no("bad-done");

  // The model must answer with our facts, never with their words.
  if (echoes(message, userText)) return no("echoes-input");

  /* ------------------------------------------------------------- question */

  let question: MatcherQuestion | null = null;
  if (parsed.question !== null && parsed.question !== undefined) {
    if (!keysOk(parsed.question, ALLOWED.question)) return no("unknown-field");
    const row = parsed.question as Record<string, unknown>;
    const text = clean(row.text, limits.questionText);
    if (!text) return no("bad-question");
    if (!Array.isArray(row.options)) return no("bad-question");
    const opts = row.options
      .map((o) => clean(o, limits.option))
      .filter(Boolean);
    if (opts.length < 2 || opts.length > 4) return no("bad-question");
    if (echoes(`${text} ${opts.join(" ")}`, userText))
      return no("echoes-input");
    question = { text, options: opts.slice(0, 3) };
  }

  /* -------------------------------------------------------------- matches */

  if (!Array.isArray(parsed.matches)) return no("bad-match");
  if (parsed.matches.length > maxMatches) return no("too-many");

  const matches: Match[] = [];
  const beyond: Beyond[] = [];
  const seen = new Set<string>();

  for (const entry of parsed.matches) {
    if (!keysOk(entry, ALLOWED.match)) return no("unknown-field");
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string") return no("bad-match");
    if (!validIds.includes(row.id)) return no("unknown-id");
    if (seen.has(row.id)) return no("bad-match");
    seen.add(row.id);

    const reason = clean(row.reason, limits.reason);
    const caution = clean(row.caution, limits.caution);
    if (!reason) return no("bad-match");
    if (echoes(`${reason} ${caution}`, userText)) return no("echoes-input");

    const exceeds = breach(row.id);
    if (exceeds) {
      beyond.push({ id: row.id, exceeds });
      continue;
    }
    matches.push({
      id: row.id,
      reason,
      caution:
        caution || "Ask us anything you are unsure about before committing.",
    });
  }

  /* --------------------------------------------------------------- beyond */

  if (parsed.beyond !== undefined) {
    if (!Array.isArray(parsed.beyond)) return no("bad-beyond");
    if (parsed.beyond.length > maxMatches) return no("too-many");

    for (const entry of parsed.beyond) {
      if (!keysOk(entry, ALLOWED.beyond)) return no("unknown-field");
      const row = entry as Record<string, unknown>;
      if (typeof row.id !== "string") return no("bad-beyond");
      if (!validIds.includes(row.id)) return no("unknown-id");
      if (seen.has(row.id)) continue;

      // A departure that breaks nothing does not belong in this group.
      const exceeds = breach(row.id);
      if (!exceeds) continue;
      seen.add(row.id);

      const stated = clean(row.exceeds, limits.exceeds);
      if (echoes(stated, userText)) return no("echoes-input");
      beyond.push({ id: row.id, exceeds: stated || exceeds });
    }
  }

  // `done` is derived from what actually survived, not from what was claimed:
  // a turn with no usable question is over whether the model said so or not.
  const done = parsed.done === true || question === null;

  return {
    ok: true,
    result: {
      message,
      done,
      question: done ? null : question,
      matches: done ? matches.slice(0, maxMatches) : [],
      beyond: done ? beyond.slice(0, maxMatches) : [],
      source: "assistant",
    },
  };
}
