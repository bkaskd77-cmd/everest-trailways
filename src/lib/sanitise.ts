/**
 * Everything the model produces passes through here before it reaches a page.
 *
 * React escapes what it renders, so this is not the last line against XSS — it
 * is the line that stops model output being *shaped* like an attack at all.
 * Angle brackets, control characters and the invisible direction-override
 * characters have no legitimate place in a sentence about a trek, and stripping
 * them means a successful prompt injection still cannot produce markup, a
 * clickable link, or text that renders differently from how it reads in the
 * logs.
 *
 * Deliberately not an HTML sanitiser. We are not trying to permit safe markup;
 * we are refusing markup entirely.
 */

/** C0/C1 control characters, minus the ones a sentence can legitimately carry. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/**
 * Bidirectional overrides and invisible formatting characters.
 *
 * These let text render in an order different from the order it is stored in,
 * which is how a caution can be made to read as reassurance on screen while
 * looking correct in review. Also the zero-width characters, which are the
 * usual way to smuggle a payload past a substring check.
 */
const INVISIBLE =
  /[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Anything that could open a tag or an entity. */
const MARKUP = /[<>]/g;

export const LIMITS = {
  message: 700,
  reason: 240,
  caution: 240,
  exceeds: 240,
  questionText: 240,
  option: 80,
} as const;

/**
 * Clean one string from the model.
 *
 * Order matters: invisible characters come out before length is measured, so a
 * payload cannot use them to push real content past the limit.
 */
export function cleanModelText(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(CONTROL, " ")
    .replace(INVISIBLE, "")
    .replace(MARKUP, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * Clean one string from a person before it is sent to the model.
 *
 * Same treatment, for a different reason: markup and invisible characters in
 * the input are how a delimiter gets closed early or an instruction gets hidden
 * from a reviewer reading the transcript.
 */
export function cleanUserText(value: string, limit: number): string {
  return value
    .replace(CONTROL, " ")
    .replace(INVISIBLE, "")
    .replace(MARKUP, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * JSON that is safe to place inside a `<script>` element.
 *
 * The one place this codebase writes raw HTML is the JSON-LD block, and this is
 * what makes that defensible: `<` is escaped so a string in our own content
 * cannot close the script element early, and U+2028/U+2029 are escaped because
 * they are legal in JSON and illegal in JavaScript string literals. Everything
 * fed to it comes from `src/content`, never from a request.
 */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Does the model's prose contain a long verbatim run from what the person
 * typed?
 *
 * A model that echoes user text back is a model that can be made to print
 * anything on our page — the injection does not have to defeat the rules, it
 * just has to get quoted. Nothing legitimate requires it: the matcher answers
 * with our data, not with their words.
 *
 * The threshold is a run of 40 characters. Tapped answers are our own short
 * option labels, the longest of which is around twenty, so quoting one of those
 * back cannot trip it; a planted instruction long enough to carry a payload
 * cannot avoid it.
 */
const ECHO_RUN = 40;

export function echoesUserText(output: string, userText: string[]): boolean {
  const haystack = output.toLowerCase().replace(/\s+/g, " ");
  for (const raw of userText) {
    const source = raw.toLowerCase().replace(/\s+/g, " ").trim();
    if (source.length < ECHO_RUN) continue;
    for (let i = 0; i + ECHO_RUN <= source.length; i += 1) {
      if (haystack.includes(source.slice(i, i + ECHO_RUN))) return true;
    }
  }
  return false;
}

/**
 * The fence around untrusted text.
 *
 * Every user turn is wrapped in these before it reaches the model, and the
 * system prompt says plainly that what is inside is data. The fence holds for a
 * reason that has nothing to do with the model's cooperation: `cleanUserText`
 * strips `<` and `>` from user input before it is wrapped, so a person cannot
 * write the closing marker at all. The delimiter cannot be closed early because
 * the characters it is made of cannot survive the sanitiser.
 *
 * Neither half is sufficient alone. A model told to treat text as data can
 * still be talked round; a fence that can be closed is not a fence.
 */
export const USER_OPEN = "<user_message>";
export const USER_CLOSE = "</user_message>";

/** Wrap one turn of user text. Assumes it has already been sanitised. */
export function fenceUserText(text: string): string {
  return `${USER_OPEN}
${text}
${USER_CLOSE}`;
}
