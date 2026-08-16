import Anthropic from "@anthropic-ai/sdk";

import { cannedAskSource } from "@/content/ask-source";
import { departures } from "@/content/departures";
import {
  fallbackMatch,
  type FallbackAnswers,
  type Intent,
} from "@/lib/matcher-fallback";
import {
  MATCHER_MODEL,
  MAX_MATCHES,
  MAX_OUTPUT_TOKENS,
  MAX_QUESTIONS,
  buildSystemPrompt,
} from "@/lib/matcher-prompt";
import {
  coerceResult,
  extractMessage,
  parseMatcherJson,
  type MatcherFrame,
  type MatcherResult,
  type MatchTurn,
} from "@/lib/matcher-types";
import { MATCH_RATE_LIMIT, clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * The matcher endpoint.
 *
 * Three properties matter more than the happy path:
 *
 *   1. It is rate limited per IP. A public endpoint that calls a paid API is a
 *      bill waiting to be run up, and the section is not worth that risk.
 *   2. It never trusts the model's output. Ids are checked against the dataset,
 *      the shape is coerced rather than cast, and unparseable output falls
 *      through to the deterministic matcher.
 *   3. It never fails visibly. Missing key, dead API, malformed JSON — every
 *      one of those ends in a real answer from `fallbackMatch`, because a
 *      broken panel on this page costs more than a slightly duller one.
 *
 * Nothing is written down. No database, no logging of message bodies, no
 * analytics on what people type. The UI says so; this is where it is true.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 24;
const MAX_TURN_CHARS = 1_500;
const MAX_TRANSCRIPT_CHARS = 10_000;

const VALID_IDS = departures.map((d) => d.id);
const INTENTS: Intent[] = ["challenge", "culture", "wildlife", "quiet"];

type Body = {
  turns?: unknown;
  answers?: unknown;
  scope?: unknown;
};

function sanitiseTurns(value: unknown): MatchTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: MatchTurn[] = [];
  let total = 0;
  for (const entry of value.slice(-MAX_TURNS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const role = row.role === "assistant" ? "assistant" : "user";
    const content =
      typeof row.content === "string"
        ? row.content.slice(0, MAX_TURN_CHARS).trim()
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
  if (
    typeof row.altitudeCeilingM === "number" &&
    row.altitudeCeilingM >= 0 &&
    row.altitudeCeilingM <= 9000
  ) {
    out.altitudeCeilingM = Math.floor(row.altitudeCeilingM);
  }
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
      ? row.questionId.slice(0, 40)
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
      source: "fallback",
    };
  }
  return fallbackMatch(answers);
}

export async function POST(request: Request): Promise<Response> {
  const verdict = rateLimit(clientKey(request.headers), MATCH_RATE_LIMIT);
  if (!verdict.ok) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Give it a minute, or message us directly.",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(verdict.retryAfterSeconds),
        },
      },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "Malformed request." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const turns = sanitiseTurns(body.turns);
  const answers = sanitiseAnswers(body.answers);
  const scope = sanitiseScope(body.scope);

  if (turns.length === 0) {
    return new Response(JSON.stringify({ error: "Nothing to answer." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

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
          // A short classification over six rows behind a streaming UI: latency
          // is worth more than depth here.
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
          messages: turns.map((t) => ({ role: t.role, content: t.content })),
        });

        let raw = "";
        let emitted = "";

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            raw += event.delta.text;
            const message = extractMessage(raw);
            if (message.length > emitted.length) {
              send({ t: "delta", v: message.slice(emitted.length) });
              emitted = message;
            }
          }
        }

        const parsed = parseMatcherJson(raw);
        const result = parsed
          ? coerceResult(parsed, VALID_IDS, MAX_MATCHES)
          : null;

        send({
          t: "result",
          result: result ?? fallbackFor(answers, scope),
        });
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
    },
  });
}
