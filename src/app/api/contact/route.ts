import {
  MATCH_IP_LIMIT,
  checkLimit,
  clientKey,
  hashKey,
  logSecurityEvent,
  originAllowed,
} from "@/lib/rate-limit";
import { CONTACT_FIELDS, FORBIDDEN_FIELDS, SUBJECTS } from "@/content/contact";
import { siteConfig } from "@/lib/site";

/**
 * The contact form's endpoint.
 *
 * Three rules, all of them the same rules the matcher route already lives
 * under, because a second endpoint is a second place to get this wrong:
 *
 *   the body is bounded before it is parsed, so a large payload is refused
 *   rather than buffered;
 *
 *   the origin is checked, so the form cannot be posted from somewhere else;
 *
 *   the caller is rate-limited durably, per address, with the address hashed
 *   in any log line.
 *
 * And one rule of its own. A contact form is where "while we have them, let us
 * also collect…" happens, so this refuses any field it was not designed to
 * take. That is stricter than ignoring unknown fields: a request carrying a
 * passport number is a bug or an attack, and either way the right answer is to
 * reject it and say so rather than to accept it and drop the field silently.
 *
 * No third-party tracker, no captcha service, no analytics beacon. The
 * spam defence is the rate limit, the origin check and a honeypot — all of
 * which run here rather than in somebody else's script.
 */

const MAX_BODY_BYTES = 8 * 1024;
const MAX_MESSAGE_CHARS = 4000;

const bad = (status: number, message: string) =>
  Response.json({ ok: false, error: message }, { status });

export async function POST(request: Request) {
  if (!originAllowed(request, siteConfig.url)) {
    logSecurityEvent({
      evt: "origin-rejected",
      scope: "contact",
      who: hashKey(clientKey(request.headers)),
    });
    return bad(403, "This form can only be sent from our own site.");
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return bad(413, "That message is too long to send through this form.");
  }

  const ip = clientKey(request.headers);
  const verdict = await checkLimit("contact:ip", ip, MATCH_IP_LIMIT);
  if (!verdict.ok) {
    logSecurityEvent({
      evt: "rate-limited",
      scope: "contact",
      who: hashKey(ip),
      layer: verdict.layer,
    });
    return bad(
      429,
      "That is more messages than we can take at once. Try again shortly, or use WhatsApp.",
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return bad(413, "That message is too long to send through this form.");
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return bad(400, "We could not read that.");
  }

  /*
   * A field we never asked for is a bug or an attack, and both deserve a
   * refusal rather than a shrug. Silently dropping it would mean nobody finds
   * out that a form somewhere started sending a date of birth.
   */
  for (const forbidden of FORBIDDEN_FIELDS) {
    if (forbidden in body) {
      logSecurityEvent({
        evt: "forbidden-field",
        scope: "contact",
        who: hashKey(ip),
        /* The NAME of the field, never its value. */
        detail: forbidden,
      });
      return bad(
        400,
        "That form sent a field we do not accept. We collect the minimum needed to reply to you and nothing else.",
      );
    }
  }

  /* An unlabelled input no human sees and every naive bot fills in. */
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true });
  }

  const allowed = new Set<string>([
    ...CONTACT_FIELDS.map((f) => f.name),
    "website",
  ]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return bad(400, "That form sent something we do not accept.");
    }
  }

  const subject = String(body.subject ?? "");
  const message = String(body.message ?? "").trim();
  const reply = String(body.reply ?? "").trim();

  if (!SUBJECTS.includes(subject as (typeof SUBJECTS)[number])) {
    return bad(400, "Choose what your message is about.");
  }
  if (message.length < 10) {
    return bad(400, "Tell us a little more and we can actually answer it.");
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return bad(400, "That message is longer than this form takes.");
  }
  if (reply.length < 5 || reply.length > 200) {
    return bad(400, "We need an email or a number to reply to.");
  }

  /*
   * Nothing is stored here yet, and that is deliberate rather than unfinished.
   * A message store is a place personal data lives, and it needs the retention
   * and access rules in SECURITY.md decided before it exists rather than
   * afterwards. Until then the endpoint validates and acknowledges, and the
   * page tells the reader plainly that WhatsApp and email reach us today.
   */
  logSecurityEvent({
    evt: "contact-received",
    scope: "contact",
    who: hashKey(ip),
  });

  return Response.json({ ok: true });
}
