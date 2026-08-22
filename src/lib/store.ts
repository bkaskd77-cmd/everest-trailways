/**
 * The shared store behind every limit that has to hold across instances.
 *
 * Talks to an Upstash-compatible Redis over its REST API with `fetch`, and
 * nothing else. No client library: this is four commands and a Lua script, the
 * transport is HTTP, and a dependency that ships its own retry logic and
 * connection pooling into a serverless function is more surface than it saves.
 *
 * Configuration is read from either the names Vercel's KV/Upstash integration
 * writes (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) or Upstash's own
 * (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`), so linking the
 * integration in the dashboard is the whole setup.
 *
 * THE IMPORTANT PROPERTY: every call can fail, and the caller must say what
 * failure means. There is no default. A store that is down must not silently
 * become "no limit" on an endpoint that spends money — see `src/lib/spend.ts`,
 * where an unreachable store means the model is not called at all.
 */

const url =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

/** Whether a durable store is configured at all. Checked, never assumed. */
export const storeConfigured = Boolean(url && token);

/**
 * How long we will wait for the store before giving up on it.
 *
 * Short on purpose. This sits in front of a streaming endpoint a person is
 * watching; a limiter that adds a second of latency has broken the thing it was
 * protecting. If the store cannot answer in this long, the caller applies its
 * own failure policy rather than waiting.
 */
const TIMEOUT_MS = 700;

export class StoreUnavailable extends Error {
  // Written out rather than a parameter property: the guard scripts load this
  // file through Node's type stripping, which cannot compile that shorthand.
  reason: string;

  constructor(reason: string) {
    super(`store unavailable: ${reason}`);
    this.name = "StoreUnavailable";
    this.reason = reason;
  }
}

/**
 * One Redis command. Throws `StoreUnavailable` on any transport-level problem,
 * including a timeout — the caller decides what that means.
 */
async function command(args: (string | number)[]): Promise<unknown> {
  if (!storeConfigured) throw new StoreUnavailable("not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args.map(String)),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new StoreUnavailable(`http ${response.status}`);

    const payload = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (payload.error) throw new StoreUnavailable("command error");
    return payload.result;
  } catch (error) {
    if (error instanceof StoreUnavailable) throw error;
    throw new StoreUnavailable(
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sliding-window admission, decided inside Redis.
 *
 * The whole check is one script so it is atomic. Doing it as read-then-write
 * from the function would let two concurrent requests both read a count under
 * the limit and both proceed, which on a burst is exactly when the limit
 * matters.
 *
 * Returns the verdict and how long until the oldest entry falls out of the
 * window, so a blocked caller can be told when to come back rather than being
 * left to guess.
 */
const SLIDING_WINDOW = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local used = redis.call('ZCARD', key)

if used >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry  = 0
  if oldest[2] then retry = math.ceil((tonumber(oldest[2]) + window - now) / 1000) end
  if retry < 1 then retry = 1 end
  return {0, used, retry}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, used + 1, 0}
`.trim();

export type WindowVerdict = {
  ok: boolean;
  used: number;
  retryAfterSeconds: number;
};

export async function slidingWindow(
  key: string,
  limit: number,
  windowMs: number,
): Promise<WindowVerdict> {
  const now = Date.now();
  // The member has to be unique per request or two hits in the same
  // millisecond collapse into one sorted-set entry and the window undercounts.
  const member = `${now}-${crypto.randomUUID()}`;
  const raw = (await command([
    "EVAL",
    SLIDING_WINDOW,
    1,
    key,
    now,
    windowMs,
    limit,
    member,
  ])) as [number, number, number];

  return {
    ok: raw[0] === 1,
    used: raw[1],
    retryAfterSeconds: raw[2],
  };
}

/**
 * Add to a counter that resets on its own.
 *
 * `INCRBY` then `EXPIRE ... NX` so the TTL is set once, when the key is
 * created, and a later increment cannot keep pushing the expiry out and turn a
 * daily ceiling into a rolling one that never resets.
 */
export async function addToCounter(
  key: string,
  amount: number,
  ttlSeconds: number,
): Promise<number> {
  const total = (await command(["INCRBY", key, Math.max(0, amount)])) as number;
  await command(["EXPIRE", key, ttlSeconds, "NX"]);
  return total;
}

export async function readCounter(key: string): Promise<number> {
  const value = (await command(["GET", key])) as string | null;
  return value ? Number(value) || 0 : 0;
}
