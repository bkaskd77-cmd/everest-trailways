import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { siteConfig } from "@/lib/site";

/**
 * One template for the four documents people read when they are deciding
 * whether to trust us.
 *
 * They share a shape because they do the same job: a header that says what
 * this is and when it was last looked at, a table of contents because these
 * are reference documents rather than articles, and a print stylesheet
 * because a cancellation policy is a thing people print and keep.
 *
 * `lastReviewed` is visible rather than buried. A trust document with no date
 * on it is asking to be believed about something it will not say when it last
 * checked, and the absence of that date is itself information.
 */

export type DocSection = { id: string; title: string };

export function DocumentPage({
  eyebrow,
  title,
  intro,
  lastReviewed,
  sections,
  children,
  pending,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  /** ISO date. Rendered, not hidden. */
  lastReviewed: string;
  sections: DocSection[];
  children: React.ReactNode;
  /** Shown at the top when the document carries unverified placeholders. */
  pending?: React.ReactNode;
}) {
  const reviewed = new Date(`${lastReviewed}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <main className="bg-band-sunk">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          url: `${siteConfig.url}`,
          datePublished: lastReviewed,
          dateModified: lastReviewed,
          publisher: { "@type": "Organization", name: siteConfig.name },
        }}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          {title}
        </h1>
        <div className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {intro}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Last reviewed{" "}
          <time dateTime={lastReviewed} className="tabular text-foreground">
            {reviewed}
          </time>
          .
        </p>

        {pending && (
          <div className="mt-8 max-w-[70ch] rounded-lg border border-prayer/40 bg-prayer/5 p-5 text-sm print:hidden">
            {pending}
          </div>
        )}

        {/* A reference document needs a way in. */}
        <nav
          aria-label="On this page"
          className="mt-12 border-y border-border py-6"
        >
          <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            On this page
          </h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s, i) => (
              <li key={s.id} className="text-sm">
                <Link
                  href={`#${s.id}`}
                  className="text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground"
                >
                  <span className="mr-2 tabular text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {/*
          `min-w-0` on the track and on every section.

          A grid item defaults to `min-width: auto`, which means it refuses to
          shrink below its content — so the wide tables on /safety and
          /cancellation pushed their section out to 42rem and took the whole
          document sideways with them. The tables already sat in their own
          `overflow-x-auto` wrapper; the wrapper simply never got the chance to
          scroll, because nothing above it was allowed to be narrower than the
          table. Caught by `pnpm qa` at 390px, 174px and 303px of sideways
          scroll respectively.
        */}
        <div className="mt-12 grid min-w-0 gap-16">{children}</div>
      </div>
    </main>
  );
}

export function DocSectionBlock({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Reveal as="section" className="min-w-0 scroll-mt-28">
      <div id={id} className="min-w-0 scroll-mt-28">
        <h2 className="max-w-[24ch] font-display text-2xl tracking-tight text-balance lg:text-3xl">
          {title}
        </h2>
        {lead && (
          <div className="mt-4 max-w-[68ch] text-base text-muted-foreground">
            {lead}
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </Reveal>
  );
}
