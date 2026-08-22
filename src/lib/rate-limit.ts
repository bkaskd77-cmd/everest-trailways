/**
 * Rate limiting for the public API routes.
 *
 * Two layers, and only one of them is real.
 *
 *   1. A DURABLE sliding window in a shared store. This is the limit. It is the
 *      same window for every instance and it survives a cold start.
 *   2. A per-instance in-memory window, kept as a cheap first pass so a burst
 *      hitting one warm instance is refused without a network round trip.
 *
 * Layer 2 used to be the whole limiter, and it was close to decorative: on
 * serverless each instance keeps its own counters, so "14 requests per 5
 * minutes" was really 14 per instance per 5 minutes, times however many
 * instances the platform had warm, reset to zero whenever one recycled. It
 * stays because it is free and it does help against the simplest case, but the
 * endpoint's spending decision never rests on it.
 *
 * Nothing in here logs what anyone typed. Keys are hashed before they reach a
 * log line, so a rate-limit event says an address was blocked without recording
 * which address, and never records the message that triggered it.
 */

import { createHash } from "node:crypto";

import { StoreUnavailable, slidingWindow, storeConfigured } from "./store.ts";

export type RateLimitConfig = {
  /** Requests permitted per window. */
  requests: number;
  windowMs: number;
};

/** Enough for a full five-question conversation twice over, per address. */
export const MATCH_IP_LIMIT: RateLimitConfig = {
  requests: 14,
  windowMs: 5 * 60_000,
};

/**
 * Per browser session, and deliberately tighter than the per-IP limit.
 *
 * A shared office or a university NAT is one address and many people; a session
 * is one browser. Limiting both means a legitimate crowd behind one address is
 * not punished for each other, while one person cannot use that crowd's
 * allowance by themselves.
 */
export const MATCH_SESSION_LIMIT: RateLimitConfig = {
  requests: 10,
  windowMs: 5 * 60_000,
};

/** The feed is cached and cheap, but it is not a firehose. */
export const FEED_IP_LIMIT: RateLimitConfig = {
  requests: 60,
  windowMs: 60_000,
};

/* ------------------------------------------------------- layer 2, in memory */

const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5_000;

function memoryWindow(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const cutoff = now - config.windowMs;
  if (hits.size > MAX_TRACKED_KEYS) hits.clear();

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= config.requests) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/* -------------------------------------------------------------- the verdict */

export type RateLimitVerdict = {
  ok: boolean;
  retryAfterSeconds: number;
  /** Which layer refused, for the log line. */
  layer: "memory" | "durable" | null;
  /** True when the durable window could not be consulted at all. */
  degraded: boolean;
};

const ALLOW: RateLimitVerdict = {
  ok: true,
  retryAfterSeconds: 0,
  layer: null,
  degraded: false,
};

/**
 * Apply both layers to one key.
 *
 * A store failure does NOT block the request — a visitor should not be turned
 * away because a cache is having a bad minute — but it is reported as
 * `degraded`, and the caller uses that to refuse the expensive path. Cheap
 * work continues; spending does not.
 */
export async function checkLimit(
  scope: string,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitVerdict> {
  const composite = `${scope}:${key}`;

  if (!memoryWindow(composite, config)) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000 / 4),
      layer: "memory",
      degraded: false,
    };
  }

  if (!storeConfigured) return { ...ALLOW, degraded: true };

  try {
    const verdict = await slidingWindow(
      `rl:${composite}`,
      config.requests,
      config.windowMs,
    );
    if (!verdict.ok) {
      return {
        ok: false,
        retryAfterSeconds: verdict.retryAfterSeconds,
        layer: "durable",
        degraded: false,
      };
    }
    return ALLOW;
  } catch (error) {
    if (error instanceof StoreUnavailable) {
      return { ...ALLOW, degraded: true };
    }
    throw error;
  }
}

/* ------------------------------------------------------------------- keys */

/**
 * The caller's address as the platform reports it.
 *
 * `x-forwarded-for` is client-controllable in general; behind Vercel's proxy
 * the left-most entry is the one it wrote. Falls back to a shared bucket rather
 * than to "unlimited" — an unidentifiable caller should be limited more, not
 * less.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * A stable, non-reversible handle for a key.
 *
 * Everything that leaves this process as a log line goes through here first. An
 * IP address is personal data under GDPR and we have no reason to hold one: to
 * spot an address hammering the endpoint we need to know that requests came
 * from the *same* caller, not who the caller is.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

/* --------------------------------------------------------------- reporting */

type LogEvent = {
  evt: string;
  scope: string;
  /** Hashed. Never a raw address. */
  who: string;
  layer?: string | null;
  detail?: string;
};

/**
 * One line of JSON on stdout, which is what the platform's log drain reads.
 *
 * The shape is fixed so these can be counted and alerted on. What is absent is
 * the point: no message bodies, no answers, no addresses, no user agents. The
 * matcher's UI promises that nothing anyone types is stored, and a log file is
 * storage.
 */
export function logSecurityEvent(event: LogEvent): void {
  console.info(JSON.stringify({ at: new Date().toISOString(), ...event }));
}

/* ------------------------------------------------------------ origin check */

/**
 * Reject cross-origin POSTs.
 *
 * Defence in depth and nothing more: `Origin` is set by the browser and cannot
 * be forged by page script, which stops other sites driving this endpoint from
 * a visitor's browser, but a direct client sends whatever it likes. It is worth
 * having because it is free and it removes the laziest form of abuse; it is not
 * worth trusting, which is why the limits above do not depend on it.
 */
export function originAllowed(request: Request, siteUrl: string): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin ?? referer;

  // No Origin and no Referer: a non-browser client. Allowed through to the
  // limits, which is where a non-browser client should be stopped.
  if (!candidate) return true;

  let host: string;
  try {
    host = new URL(candidate).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>([new URL(siteUrl).host]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("localhost:3000");
    allowed.add("localhost:3002");
    allowed.add("localhost:3003");
    allowed.add("127.0.0.1:3000");
    allowed.add("127.0.0.1:3002");
    allowed.add("127.0.0.1:3003");
  }
  // Vercel preview deployments are ours and change name every push.
  if (host.endsWith(".vercel.app")) return true;

  return allowed.has(host);
}

/** Test seam. Never called by a route. */
export function resetRateLimits(): void {
  hits.clear();
}
