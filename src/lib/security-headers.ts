/**
 * The response headers this site must send, in one place.
 *
 * Split out of `src/proxy.ts` and `next.config.ts` so `pnpm check:security`
 * reads the same list the runtime uses rather than a second copy that drifts.
 */

/**
 * Headers that are identical on every response and never depend on the request.
 *
 * These live in `next.config.ts` so they are attached to static assets too, not
 * only to pages that pass through the proxy.
 */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  {
    // Two years, subdomains included, and preload-eligible. HSTS removes the
    // first-request window in which a downgrade is possible; a short max-age
    // leaves that window open for anyone who has not visited recently, which is
    // exactly the visitor most at risk.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Stops a browser second-guessing a Content-Type. The feed is JSON and must
    // never be sniffed into something executable.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Origin cross-site, full path same-site. Departure URLs carry trek names
    // and dates; another site's logs have no business holding which departure
    // someone was reading when they clicked away.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Superseded by frame-ancestors for modern browsers, kept for the ones that
    // never implemented it. Clickjacking a booking flow is the attack it closes.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Nothing here needs a camera, a microphone, a location, a payment handler
    // or a USB device. Denying them means a compromised script cannot ask.
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    // Hygiene rather than a control: no reason to advertise the stack.
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

/**
 * ============================================================================
 * WHY script-src IS NOT NONCE-BASED, AND WHAT IT WOULD TAKE
 * ============================================================================
 *
 * The brief asked for a nonce-based policy with no `unsafe-inline`. It was
 * built, deployed to a local production server, and measured. Here is what
 * happened, because the reasoning matters more than the conclusion:
 *
 * A nonce has to be unique per response, so a page carrying one cannot be
 * prerendered. Every page on this site except /api/match IS prerendered — that
 * is the entire performance argument, and step 6 required it explicitly. Next
 * serves those pages from build-time HTML that contains no nonce attribute,
 * while the proxy stamps a fresh nonce into the header on every request. The
 * two never match.
 *
 * Worse, `'strict-dynamic'` disables host-source expressions, so `'self'` stops
 * admitting anything. The observed result on a real page load was every single
 * script blocked — framework, chunks and inline RSC payload alike. The site
 * rendered as text and did nothing. Not a theoretical regression: measured,
 * with fifteen console violations.
 *
 * Next's experimental SRI was tried next, since the documentation offers it as
 * the way to keep static generation under a strict policy. It adds `integrity`
 * to some chunks and not to the cross-origin ones, and does nothing at all
 * about the inline `self.__next_f.push(...)` scripts that carry the RSC
 * payload. Those still need `unsafe-inline`, a hash, or a nonce.
 *
 * So the honest options are:
 *
 *   (a) nonce + `await connection()` on every page — a strict script policy,
 *       paid for by giving up static generation, CDN caching and ISR on all
 *       nineteen departure pages and every marketing page;
 *   (b) a static site with `script-src 'self' 'unsafe-inline'` and no
 *       `unsafe-eval`, with every other directive locked down.
 *
 * (b) ships, because on this site the practical XSS surface is very small — no
 * user-generated content is rendered anywhere, the one place model output
 * reaches the page is stripped of `<` and `>` first, and there is no third
 * party script at all — while the cost of (a) is a slower page on every visit
 * for every visitor, forever.
 *
 * That is a judgement, not a fact, and it is reversible: set `CSP_STRICT=1` and
 * the nonce policy below is used instead. Doing that WITHOUT first forcing
 * every page dynamic will break the site, which is why it is not the default
 * and why this comment is this long.
 *
 * The rest of the policy is strict either way, and that is where the value is
 * here: `object-src 'none'` and `base-uri 'none'` close the two classic
 * injection escalations, `frame-ancestors 'none'` closes clickjacking,
 * `connect-src 'self'` means an injected script cannot exfiltrate to an
 * attacker's host, and `form-action 'self'` means it cannot post a form there
 * either.
 */

/** Is the nonce-based policy switched on? Requires dynamic rendering. */
export function cspIsStrict(): boolean {
  return process.env.CSP_STRICT === "1";
}

export function buildCsp(nonce: string, isDev: boolean): string {
  const strict = cspIsStrict();

  const scriptSrc = strict
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`
    : // No 'unsafe-eval' in either mode. React needs it only in development,
      // and development is not what ships.
      `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Motion animates by writing `style` attributes — the card parallax and the
    // altitude profile are both built that way — so style attributes have to be
    // permitted. An injected style attribute runs no code and sends no data,
    // which is why this concession is acceptable where the script one would not
    // be.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com",
    "font-src 'self'",
    // The matcher talks to our own /api/match. The model call happens
    // server-side, so the browser never contacts the Anthropic API and it does
    // not belong here. This is the directive that stops an injected script
    // sending anything anywhere.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Report-only is available and is not the default.
 *
 * A report-only header protects nobody, and one that nobody remembers to
 * promote is worse than useless — it looks like a control in an audit and is
 * not one. The policy above was verified against a real production build on
 * every page type before it shipped enforced. `CSP_REPORT_ONLY=1` demotes it if
 * a deploy finds something local checking did not.
 */
export function cspHeaderName(): string {
  return process.env.CSP_REPORT_ONLY === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
