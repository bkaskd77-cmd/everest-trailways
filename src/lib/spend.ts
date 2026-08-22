/**
 * The ceiling on what this endpoint can cost in a day.
 *
 * /api/match is unauthenticated and calls a paid model. Rate limiting bounds
 * what one caller can do; this bounds what *everyone together* can do, which is
 * the number that actually appears on an invoice. Without it, a botnet spread
 * across ten thousand addresses passes every per-IP limit ever written and the
 * only thing standing between the company and an open bill is nobody having
 * noticed the endpoint.
 *
 * The ceiling is spent in tokens because tokens are what we can count exactly
 * from the API's own usage numbers. The dollar figure is derived from published
 * per-million rates and is a statement of intent, not billing truth.
 *
 * When the ceiling is reached the matcher does not break and does not go quiet:
 * it serves `fallbackMatch`, which runs the same questions over the same data
 * and applies the same refusals. A visitor gets a real answer either way. That
 * is what makes it safe to set this low rather than generously.
 */

import {
  StoreUnavailable,
  addToCounter,
  readCounter,
  storeConfigured,
} from "./store.ts";

/**
 * Published rates for MATCHER_MODEL, USD per million tokens. Used only to turn
 * the token ceiling into a number a person can reason about.
 */
const RATE_USD_PER_MTOK = { input: 3, output: 15 };

/**
 * The daily ceiling, in output-equivalent tokens.
 *
 * Sized against real use rather than a round number: a full five-question
 * conversation is roughly 12k input (mostly cached) and 3k output. This is
 * about a thousand such conversations a day, which is far more than this
 * section will see and far less than an attack would want.
 */
export const DAILY_TOKEN_CEILING = 4_000_000;

/** What that ceiling is worth, for the log line and for SECURITY.md. */
export const DAILY_CEILING_USD = Number(
  (
    (DAILY_TOKEN_CEILING *
      ((RATE_USD_PER_MTOK.input + RATE_USD_PER_MTOK.output) / 2)) /
    1_000_000
  ).toFixed(2),
);

/**
 * Cached input is billed at a tenth, so counting it in full would close the
 * ceiling roughly five times too early on exactly the traffic pattern the
 * cache exists to make cheap.
 */
const CACHED_INPUT_WEIGHT = 0.1;

const DAY_SECONDS = 24 * 60 * 60;

function todayKey(): string {
  return `match:spend:${new Date().toISOString().slice(0, 10)}`;
}

export type SpendVerdict =
  | { allowed: true; usedTokens: number }
  | { allowed: false; reason: "ceiling" | "no-store"; usedTokens: number };

/**
 * May we call the model right now?
 *
 * Fails CLOSED. If the store cannot be reached, or is not configured at all,
 * the answer is no — because "we cannot count what we are spending" and "we may
 * keep spending" must never be true at the same time. The visitor still gets an
 * answer from the deterministic matcher; the company does not get a bill it
 * cannot see.
 */
export async function maySpend(): Promise<SpendVerdict> {
  if (!storeConfigured) {
    return { allowed: false, reason: "no-store", usedTokens: 0 };
  }
  try {
    const used = await readCounter(todayKey());
    if (used >= DAILY_TOKEN_CEILING) {
      return { allowed: false, reason: "ceiling", usedTokens: used };
    }
    return { allowed: true, usedTokens: used };
  } catch (error) {
    if (error instanceof StoreUnavailable) {
      return { allowed: false, reason: "no-store", usedTokens: 0 };
    }
    throw error;
  }
}

export type Usage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/** Weighted tokens for one call, from the API's own usage figures. */
export function weigh(usage: Usage | null | undefined): number {
  if (!usage) return 0;
  const fresh = usage.input_tokens ?? 0;
  const cached =
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0);
  const output = usage.output_tokens ?? 0;
  return Math.round(fresh + cached * CACHED_INPUT_WEIGHT + output);
}

/**
 * Record what a call cost.
 *
 * Deliberately swallows store failures: the spend has already happened, the
 * visitor is mid-answer, and there is nothing useful to do about a failed write
 * except not make it their problem. The next `maySpend` will fail closed
 * anyway if the store is still down.
 */
export async function recordSpend(usage: Usage | null | undefined) {
  const tokens = weigh(usage);
  if (tokens <= 0 || !storeConfigured) return;
  try {
    await addToCounter(todayKey(), tokens, DAY_SECONDS);
  } catch {
    // Intentionally ignored — see above.
  }
}
