import { notFound } from "next/navigation";

import { bySlug, departures } from "@/content/departures";
import { costSheetPdf } from "@/lib/cost-sheet-pdf";

/**
 * GET /departures/<slug>/cost-sheet.pdf
 *
 * Prerendered at build time, one per departure, so this is a static file on a
 * CDN rather than a function that runs when someone clicks a button. That
 * matters for three reasons: it is instant, it costs nothing per download, and
 * it needs no rate limit because there is no per-request work to abuse.
 *
 * The generation timestamp is therefore the build time, not the download time,
 * which is the honest thing for it to be — it says when these figures were
 * published, and the figures do not change between builds.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return departures.map((d) => ({ slug: d.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const departure = bySlug(slug);
  if (!departure) notFound();

  const pdf = costSheetPdf(departure, new Date());

  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      // `inline` rather than `attachment`: most people want to look at it
      // before they forward it, and a browser that opens it still offers a
      // download. The filename is what it will be saved as either way.
      "content-disposition": `inline; filename="everest-trailways-${slug}-cost-sheet.pdf"`,
      "cache-control": "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
