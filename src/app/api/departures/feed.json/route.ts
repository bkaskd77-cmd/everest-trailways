import { buildFeed } from "@/lib/departures-feed";
import { siteConfig } from "@/lib/site";

/**
 * GET /api/departures/feed.json
 *
 * Public, unauthenticated feed of every departure. No brand recognition means
 * being findable depends on being readable by machines, so this is deliberately
 * plain and self-describing: every field is explained in the response's own
 * `docs` object.
 *
 * Revalidated hourly — seat counts move, but not by the second, and a cached
 * response is better for the agents reading it than a cold function.
 */
export const revalidate = 3600;

export async function GET() {
  const feed = buildFeed(siteConfig.url);

  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
