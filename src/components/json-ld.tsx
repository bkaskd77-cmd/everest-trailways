import { jsonLdScript } from "@/lib/sanitise";

/**
 * The only component in this codebase permitted to write raw HTML.
 *
 * `pnpm check:security` fails on `dangerouslySetInnerHTML` anywhere in `src`
 * except this file. One audited exception is worth more than a rule everybody
 * works around: structured data has to go inside a `<script>` element, and
 * React escapes text children for HTML, which would corrupt the JSON.
 *
 * What makes it defensible rather than merely necessary:
 *
 *   - the value always comes from `src/content`, never from a request, a query
 *     string, a cookie or a model;
 *   - it is serialised by `jsonLdScript`, which escapes `<`, `>` and `&` so no
 *     string can close the script element early, and U+2028/U+2029 because they
 *     are legal in JSON and illegal in a JavaScript string literal.
 *
 * If structured data ever needs to carry something a stranger wrote, this is
 * the component to come back to, and the answer will be no.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}
