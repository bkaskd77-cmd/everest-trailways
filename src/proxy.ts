import { NextResponse, type NextRequest } from "next/server";

import { buildCsp, cspHeaderName } from "@/lib/security-headers";

/**
 * Per-request security headers.
 *
 * In this version of Next this file is `proxy.ts`, not `middleware.ts` — the
 * convention was renamed, and the old name is silently ignored rather than
 * failing loudly, which is the kind of mistake that ships a site with no CSP
 * and no error to show for it.
 *
 * Only the CSP lives here. Everything that does not depend on the request is in
 * `next.config.ts` so it is attached to static assets too, not only to the
 * documents that pass through this function.
 *
 * WHAT THIS COSTS. A nonce has to be different on every response, so a page
 * carrying one cannot be prerendered and served from a CDN. Next reads the
 * nonce out of this header during server rendering and attaches it to its own
 * scripts; a page built at build time has no request to read it from. The
 * matcher is `matcher` below, and it deliberately does not run on the static
 * asset paths.
 */
export function proxy(request: NextRequest): NextResponse {
  // 16 random bytes, base64. Unguessable, and new for every response — a reused
  // nonce is the same as no nonce, because an injected script can carry it too.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);

  // Next reads the policy off the *request* headers to find the nonce it should
  // stamp on its own script tags, so the same value goes on both sides.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(cspHeaderName(), csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except the paths that cannot execute script anyway.
     *
     * Prefetches are excluded because a prefetched document is not the one that
     * renders — letting one through would mint a nonce that the eventual
     * navigation does not carry.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
