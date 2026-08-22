import Anthropic from "@anthropic-ai/sdk";

import { cannedAskSource } from "@/content/ask-source";
import { departures } from "@/content/departures";
import {
  fallbackMatch,
  hardBreach,
  type FallbackAnswers,
  type Intent,
} from "@/lib/matcher-fallback";
import {
  MATCHER_MODEL,
  MAX_MATCHES,
  MAX_OUTPUT_TOKENS,
  MAX_QUESTIONS,
  buildSystemPrompt,
  fenceUserText,
} from "@/lib/matcher-prompt";
import {
  extractMessage,
  parseMatcherJson,
  validateResult,
  type MatcherFrame,
  type MatcherResult,
  type MatchTurn,
} from "@/lib/matcher-types";
import {
  MATCH_IP_LIMIT,
  MATCH_SESSION_LIMIT,
  checkLimit,
  clientKey,
  hashKey,
  logSecurityEvent,
  originAllowed,
} from "@/lib/rate-limit";
import {
  LIMITS,
  cleanModelText,
  cleanUserText,
  echoesUserText,
} from "@/lib/sanitise";
import { siteConfig } from "@/lib/site";
import { maySpend, recordSpend } from "@/lib/spend";

/**
 * The matcher endpoint.
 *
 * This is the only place on the site where an anonymous stranger can cause us
 * to spend money, and the only place where their words reach a language model.
 * Both of those are treated as adversarial by default.
 *
 * WHAT STOPS THE BILL
 *   - a durable per-IP and per-session sliding window, shared across instances
 *   - a global daily token ceiling for the whole endpoint, which fails CLOSED:
 *     if we cannot count what we are spending, we do not spend
 *   - a hard input-size limit applied before any model call
 *   - a capped max_tokens on the call itself
 *   - an Origin check, as depth rather than as a control
 *
 * WHAT STOPS THE MODEL BEING TURNED AGAINST THE PAGE
 *   - user text is sanitised, then fenced, and the fence is made of characters
 *     the sanitiser removes, so it cannot be closed from inside
 *   - the response is validated against a closed schema: one unknown field, one
 *     unknown departure id, one echoed run of the user's own words, and the
 *     entire answer is discarded for the deterministic matcher
 *   - every string that survives is stripped of markup before it is rendered
 *
 * Nothing is written down. No database, no logging of message bodies, no
 * analytics on what people type. Security events log a hashed key and a reason,
 * never an address and never a word anyone wrote. The UI promises this; this is
 * where it is true.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 24;
const MAX_TURN_CHARS = 1_500;
const MAX_TRANSCRIPT_CHARS = 10_000;

/**
 * The hard ceiling on a request body, checked before it is parsed.
 *
 * The per-turn and per-transcript limits below trim a normal conversation to
 * size. This one exists for the request that is not a conversation at all — a
 * megabyte of text aimed at making us pay to tokenise it. Refused with a 413
 * before `json()` allocates it.
 */
const MAX_BODY_BYTES = 32 * 1024;

const VALID_IDS = departures.map((d) => d.id);
const INTENTS: Intent[] = ["challenge", "culture", "wildlife", "quiet"];

/** Set on the first request and read on the rest. Not an identity, just a bucket. */
const SESSION_COOKIE = "etw_match";

type Body = {
  turns?: unknown;
  answers?: unknown;
  scope?: unknown;
};

function json(
  body: unknown,
  status: number,
  extra: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

/**
 * The session bucket.
 *
 * A random value in an httpOnly cookie. It is not trusted for anything — a
 * caller who clears it simply falls back to the per-IP window, which is applied
 * regardless. Its only job is to stop one browser inside a large shared network
 * from consuming everybody else's allowance on that address.
 */
function sessionKey(request: Request): { key: string; issued: string | null } {
  const cookie = request.headers.get("cookie") ?? "";
  const found = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (found) {
    const value = found.slice(SESSION_COOKIE.length + 1);
    if (/^[A-Za-z0-9_-]{8,64}$/.test(value))
      return { key: value, issued: null };
  }
  const fresh = crypto.randomUUID().replace(/-/g, "");
  return { key: fresh, issued: fresh };
}

function sessionCookieHeader(value: string): string {
  return `${SESSION_COOKIE}=${value}; Path=/api/match; HttpOnly; SameSite=Strict; Max-Age=3600${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

function sanitiseTurns(value: unknown): MatchTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: MatchTurn[] = [];
  let total = 0;
  for (const entry of value.slice(-MAX_TURNS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const role = row.role === "assistant" ? "assistant" : "user";
    // Markup, control characters and invisible direction marks come out here,
    // which is also what makes the fence in the prompt uncloseable.
    const content =
      typeof row.content === "string"
        ? cleanUserText(row.content, MAX_TURN_CHARS)
        : "";
    if (!content) continue;
    total += content.length;
    if (total > MAX_TRANSCRIPT_CHARS) break;
    turns.push({ role, content });
  }
  // The API requires the first turn to be the user's.
  while (turns.length && turns[0].role === "assistant") turns.shift();
  return turns;
}

function sanitiseAnswers(value: unknown): FallbackAnswers {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const out: FallbackAnswers = {};

  if (typeof row.maxDays === "number" && row.maxDays > 0 && row.maxDays < 60) {
    out.maxDays = Math.floor(row.maxDays);
  }
  if (Array.isArray(row.months)) {
    const months = row.months
      .filter((m): m is number => typeof m === "number" && m >= 0 && m <= 11)
      .map((m) => Math.floor(m));
    if (months.length) out.months = months;
  }
  // Two separate numbers now, and only one of them can exclude anything.
  if (
    typeof row.experienceM === "number" &&
    row.experienceM >= 0 &&
    row.experienceM <= 9000
  ) {
    out.experienceM = Math.floor(row.experienceM);
  }
  if (
    typeof row.willingnessM === "number" &&
    row.willingnessM >= 0 &&
    row.willingnessM <= 9000
  ) {
    out.willingnessM = Math.floor(row.willingnessM);
  }
  if (row.altitudeAdvice === true) out.altitudeAdvice = true;
  if (
    row.fitness === "light" ||
    row.fitness === "full" ||
    row.fitness === "trained"
  ) {
    out.fitness = row.fitness;
  }
  if (
    typeof row.intent === "string" &&
    INTENTS.includes(row.intent as Intent)
  ) {
    out.intent = row.intent as Intent;
  }
  if (
    typeof row.namedTrekId === "string" &&
    departures.some((d) => d.trekId === row.namedTrekId)
  ) {
    out.namedTrekId = row.namedTrekId;
  }
  if (row.medicalConcern === true) out.medicalConcern = true;
  if (row.wantsToBook === true) out.wantsToBook = true;
  if (row.wantsCheapest === true) out.wantsCheapest = true;

  return out;
}

function sanitiseScope(
  value: unknown,
): { departureId: string; questionId?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const departureId =
    typeof row.departureId === "string" ? row.departureId : "";
  if (!VALID_IDS.includes(departureId)) return undefined;
  const questionId =
    typeof row.questionId === "string"
      ? row.questionId.replace(/[^a-z0-9-]/gi, "").slice(0, 40)
      : undefined;
  return { departureId, questionId };
}

/** The answer we give when the assistant path is unavailable. Always a real one. */
function fallbackFor(
  answers: FallbackAnswers,
  scope?: { departureId: string; questionId?: string },
): MatcherResult {
  if (scope) {
    const departure = departures.find((d) => d.id === scope.departureId)!;
    const canned = scope.questionId
      ? cannedAskSource.answer(scope.questionId, departure)
      : "";
    return {
      message:
        canned ||
        `We are not able to answer that here right now. Send it to us directly and a person will reply — ${departure.trekName} is a departure we run, so the answer will come from someone who has walked it.`,
      done: true,
      question: null,
      matches: [],
      beyond: [],
      source: "fallback",
    };
  }
  return fallbackMatch(answers);
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientKey(request.headers);
  const who = hashKey(ip);
  const { key: session, issued } = sessionKey(request);
  const setCookie: Record<string, string> = issued
    ? { "set-cookie": sessionCookieHeader(issued) }
    : {};

  /* --------------------------------------------------------- origin check */

  if (!originAllowed(request, siteConfig.url)) {
    logSecurityEvent({ evt: "origin.reject", scope: "match", who });
    return json({ error: "Not allowed from this origin." }, 403);
  }

  /* ------------------------------------------------------------ body size */

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    logSecurityEvent({
      evt: "input.oversize",
      scope: "match",
      who,
      detail: `${declared}b`,
    });
    return json({ error: "That message is too long." }, 413);
  }

  /* --------------------------------------------------------- rate limits */

  const [byIp, bySession] = await Promise.all([
    checkLimit("match:ip", ip, MATCH_IP_LIMIT),
    checkLimit("match:session", session, MATCH_SESSION_LIMIT),
  ]);
  const blocked = !byIp.ok ? byIp : !bySession.ok ? bySession : null;

  if (blocked) {
    logSecurityEvent({
      evt: "ratelimit.block",
      scope: !byIp.ok ? "match:ip" : "match:session",
      who,
      layer: blocked.layer,
    });
    return json(
      { error: "Too many requests. Give it a minute, or message us directly." },
      429,
      { "retry-after": String(blocked.retryAfterSeconds), ...setCookie },
    );
  }

  /* ------------------------------------------------------------- the body */

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Malformed request." }, 400, setCookie);
  }

  // Checked again on the real bytes: `content-length` is a claim, not a fact.
  if (raw.length > MAX_BODY_BYTES) {
    logSecurityEvent({
      evt: "input.oversize",
      scope: "match",
      who,
      detail: `${raw.length}b`,
    });
    return json({ error: "That message is too long." }, 413, setCookie);
  }

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return json({ error: "Malformed request." }, 400, setCookie);
  }

  const turns = sanitiseTurns(body.turns);
  const answers = sanitiseAnswers(body.answers);
  const scope = sanitiseScope(body.scope);

  if (turns.length === 0) {
    return json({ error: "Nothing to answer." }, 400, setCookie);
  }

  const encoder = new TextEncoder();
  const userText = turns.filter((t) => t.role === "user").map((t) => t.content);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: MatcherFrame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));

      const finishWithFallback = () => {
        send({ t: "result", result: fallbackFor(answers, scope) });
        controller.close();
      };

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        finishWithFallback();
        return;
      }

      /* ------------------------------------------- the global spend ceiling */

      const spend = await maySpend();
      if (!spend.allowed) {
        logSecurityEvent({
          evt: "spend.withheld",
          scope: "match",
          who,
          detail: spend.reason,
        });
        finishWithFallback();
        return;
      }

      try {
        const client = new Anthropic({ apiKey });

        // The ceiling the section promises, enforced here rather than trusted
        // to the model: once it has asked five, the next reply must be final.
        const asked = turns.filter((t) => t.role === "assistant").length;
        const system = [
          buildSystemPrompt(scope),
          asked >= MAX_QUESTIONS
            ? `\nYou have already asked ${asked} questions, which is the limit. This reply must be final: set "done" to true, "question" to null, and give your best honest answer with what you know.`
            : "",
        ].join("");

        const anthropicStream = client.messages.stream({
          model: MATCHER_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          // A short classification over a small dataset behind a streaming UI:
          // latency is worth more than depth here.
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: system,
              // The dataset and the constraints are identical on every turn of
              // a conversation, so they are read from cache rather than
              // re-billed five times.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: turns.map((t) => ({
            role: t.role,
            // Only the person's words are fenced. The assistant's own previous
            // turns are ours and are not untrusted input.
            content: t.role === "user" ? fenceUserText(t.content) : t.content,
          })),
        });

        let buffer = "";
        let emitted = "";

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            buffer += event.delta.text;
            // Streamed prose is cleaned on the way out too, so a partial
            // message is never rendered less safely than a complete one.
            const message = cleanModelText(
              extractMessage(buffer),
              LIMITS.message,
            );
            if (message.length > emitted.length) {
              send({ t: "delta", v: message.slice(emitted.length) });
              emitted = message;
            }
          }
        }

        const final = await anthropicStream.finalMessage().catch(() => null);
        await recordSpend(final?.usage);

        const parsed = parseMatcherJson(buffer);
        const outcome = parsed
          ? validateResult(parsed, {
              validIds: VALID_IDS,
              maxMatches: MAX_MATCHES,
              breach: (id) => {
                const departure = departures.find((d) => d.id === id);
                return departure ? hardBreach(departure, answers) : null;
              },
              userText,
              clean: cleanModelText,
              limits: LIMITS,
              echoes: echoesUserText,
            })
          : null;

        if (!outcome || !outcome.ok) {
          // The model produced something that does not hold up. The whole
          // answer goes, not the offending part of it.
          logSecurityEvent({
            evt: "output.rejected",
            scope: "match",
            who,
            detail: outcome ? outcome.why : "unparseable",
          });
          finishWithFallback();
          return;
        }

        send({ t: "result", result: outcome.result });
        controller.close();
      } catch {
        // Deliberately no detail on the wire and nothing logged from the body:
        // the person gets a working answer, not a stack trace.
        send({
          t: "error",
          v: "The assistant is unavailable, so this is our own matcher answering.",
        });
        finishWithFallback();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
      ...setCookie,
    },
  });
}
