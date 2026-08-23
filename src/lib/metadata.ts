import type { Metadata } from "next";

import { siteConfig } from "./site";

/**
 * One place that turns a path into a page's identity.
 *
 * Every page set `alternates.canonical` and inherited `openGraph.url` from the
 * root layout, which is the homepage. Next merges metadata rather than
 * replacing it, so a page that did not restate the url silently kept the
 * parent's — and every share of a departure, a trek, an activity or a policy
 * previewed as the front page.
 *
 * That is the kind of fault nobody sees from inside the site. It only shows up
 * in somebody else's chat window, on the one link that was supposed to be
 * checkable, showing the wrong page.
 *
 * The canonical and the og:url are now the same expression, so they cannot
 * disagree, and `check:documents` fails a page that sets one without the
 * other.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  /** Absolute, from the site root. "/treks" or "/departures/poon-hill-…". */
  path: string;
  /** Overrides the default robots directive, e.g. for an unapproved policy. */
  robots?: Metadata["robots"];
  images?: string[];
}): Metadata {
  const url = `${siteConfig.url}${input.path}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    ...(input.robots ? { robots: input.robots } : {}),
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: `${input.title} — ${siteConfig.name}`,
      description: input.description,
      url,
      ...(input.images?.length ? { images: input.images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} — ${siteConfig.name}`,
      description: input.description,
    },
  };
}
