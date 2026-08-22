import { buildFeed } from "@/lib/departures-feed";
import {
  FEED_IP_LIMIT,
  checkLimit,
  clientKey,
  hashKey,
  logSecurityEvent,
} from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site";

/**
 * GET /api/departures/feed.json
 *
 * Public, unauthenticated, and meant to be scraped. No brand recognition means
 * being findable depends on being readable by machines, so this is deliberately
 * plain and self-describing: every field is explained in the response's own
 * `docs` object.
 *
 * WHAT IT PUBLISHES, AND WHAT IT WILL NOT.
 *
 * Everything here is already on a page a visitor can read — dates, prices,
 * seats, the guarantee threshold, the decision date. That is the point: the
 * company's argument is that its claims are checkable, and a feed that held
 * back the awkward numbers would be marketing.
 *
 * What it must never carry: anything about the people who have booked beyond a
 * country and a count, any staff or customer contact detail, any internal cost,
 * margin or supplier price. `buildFeed` projects those fields one by one rather
 * than spreading a record, so widening this surface takes an edit rather than
 * an oversight.
 *
 * Rate limited even though it is cached, because the cache is ours to protect
 * too: a cached response still costs a function invocation on a miss, and an
 * endpoint that invites automated readers will get automated readers that do
 * not back off.
 */
export const revalidate = 3600;

export async function GET(request: Request) {
  const ip = clientKey(request.headers);
  const verdict = await checkLimit("feed:ip", ip, FEED_IP_LIMIT);

  if (!verdict.ok) {
    logSecurityEvent({
      evt: "ratelimit.block",
      scope: "feed:ip",
      who: hashKey(ip),
      layer: verdict.layer,
    });
    return Response.json(
      {
        error: "Too many requests.",
        // A refusal on a machine-readable endpoint should be machine-readable
        // too: tell a well-behaved client how to behave.
        retryAfterSeconds: verdict.retryAfterSeconds,
        cacheHint:
          "This feed changes at most hourly. Cache it and re-read on the hour.",
      },
      {
        status: 429,
        headers: {
          "retry-after": String(verdict.retryAfterSeconds),
          "cache-control": "no-store",
        },
      },
    );
  }

  const feed = buildFeed(siteConfig.url);

  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      // Read by anyone, from anywhere. There is nothing here to protect with an
      // origin check and no credentials to send: `Access-Control-Allow-Origin`
      // without `Allow-Credentials` grants a reader nothing it could not get by
      // fetching the URL server-side.
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
