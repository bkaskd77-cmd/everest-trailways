/**
 * A per-IP sliding window, held in process memory.
 *
 * Honest about what it is: on a serverless platform each instance keeps its own
 * counters, so the effective ceiling is this limit multiplied by the number of
 * warm instances. That is fine for what it is here for — stopping one browser
 * tab, or one script, from turning a public endpoint into an open bill. It is
 * not a defence against a distributed attacker, and nothing downstream should
 * assume it is. When this endpoint gets real traffic the counter moves to a
 * shared store and this module's shape does not change.
 */

export type RateLimitConfig = { requests: number; windowMs: number };

/** Enough for a full five-question conversation twice over, per IP, per window. */
export const MATCH_RATE_LIMIT: RateLimitConfig = {
  requests: 14,
  windowMs: 5 * 60_000,
};

const hits = new Map<string, number[]>();

/** Stops the map growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 5_000;

export type RateLimitVerdict = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  config: RateLimitConfig = MATCH_RATE_LIMIT,
): RateLimitVerdict {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  if (hits.size > MAX_TRACKED_KEYS) hits.clear();

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= config.requests) {
    const oldest = recent[0];
    hits.set(key, recent);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + config.windowMs - now) / 1000),
      ),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return {
    ok: true,
    remaining: config.requests - recent.length,
    retryAfterSeconds: 0,
  };
}

/**
 * The caller's address as the platform reports it.
 *
 * `x-forwarded-for` is client-controllable in general; behind Vercel's proxy the
 * left-most entry is the one it wrote, which is what we key on. Falls back to a
 * shared bucket rather than to "unlimited" — an unidentifiable caller should be
 * limited more, not less.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test seam. Never called by the route. */
export function resetRateLimits(): void {
  hits.clear();
}
