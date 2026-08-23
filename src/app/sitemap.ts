import type { MetadataRoute } from "next";

import { departures, isIndexable } from "@/content/departures";
import { ACTIVITIES } from "@/content/activities";
import { POLICIES, isApproved } from "@/content/policies";
import { TREK_PAGES } from "@/content/trek-pages";
import { REGIONS, regionSlug } from "@/lib/treks";
import { siteConfig } from "@/lib/site";

/**
 * What we ask a search engine to index.
 *
 * Two exclusions, both deliberate:
 *
 *   a departure that has run, been withdrawn or filled is still reachable and
 *   still true, but it is not a thing to sell, so it is not offered as one;
 *
 *   a policy document that has not been approved is a draft. Listing a draft
 *   refund policy in a sitemap is asking to have it indexed, quoted back, and
 *   treated as a term — which is precisely what an unapproved document must
 *   not be. The page itself also carries `noindex`; this is the second half of
 *   the same decision, because a sitemap entry is an invitation and the meta
 *   tag is only a refusal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteConfig.url}${path}`;
  const now = new Date();

  return [
    { url: url("/"), lastModified: now, priority: 1 },
    { url: url("/departures"), lastModified: now, priority: 0.9 },
    { url: url("/treks"), lastModified: now, priority: 0.9 },
    { url: url("/activities"), lastModified: now, priority: 0.9 },
    { url: url("/regions"), lastModified: now, priority: 0.6 },
    { url: url("/about"), lastModified: now, priority: 0.5 },
    { url: url("/team"), lastModified: now, priority: 0.6 },
    { url: url("/contact"), lastModified: now, priority: 0.6 },
    { url: url("/journal"), lastModified: now, priority: 0.4 },
    { url: url("/plan"), lastModified: now, priority: 0.5 },

    ...TREK_PAGES.map((t) => ({
      url: url(`/treks/${t.slug}`),
      lastModified: now,
      priority: 0.8,
    })),
    ...ACTIVITIES.map((a) => ({
      url: url(`/activities/${a.slug}`),
      lastModified: now,
      priority: 0.7,
    })),
    ...REGIONS.map((r) => ({
      url: url(`/regions/${regionSlug(r)}`),
      lastModified: now,
      priority: 0.6,
    })),
    ...departures
      .filter((d) => isIndexable(d))
      .map((d) => ({
        url: url(`/departures/${d.slug}`),
        lastModified: now,
        priority: 0.7,
      })),

    /* Approved policies only. A draft is not a document to be found. */
    ...POLICIES.filter(isApproved).map((p) => ({
      url: url(p.path),
      lastModified: new Date(p.lastReviewed),
      priority: 0.5,
    })),
  ];
}
