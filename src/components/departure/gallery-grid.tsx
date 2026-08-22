"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { GalleryFrame } from "@/components/departure/gallery-frame";
import type { GalleryImage } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * Every photograph at once, with its caption under it.
 *
 * The header is a slider and this is not a duplicate of it. They do different
 * jobs: the slider is the first impression and shows one frame at a time, and
 * this is the part somebody actually reads — accommodation and food, all
 * visible together, without having to press anything to find out what the room
 * looks like. Hiding the honest photographs behind a next button is the same
 * instinct as burying the cost sheet, and this section exists to argue against
 * that instinct.
 *
 * Order is the argument: where you sleep, what you eat, then everything else.
 */

const CATEGORY_LABEL: Record<GalleryImage["category"], string> = {
  trail: "On the trail",
  accommodation: "Where you sleep",
  food: "What you eat",
  transport: "Getting there",
  people: "Guides and porters",
  landscape: "The country",
};

/** Accommodation and food first, then the rest in the order they were written. */
const CATEGORY_RANK: Record<GalleryImage["category"], number> = {
  accommodation: 0,
  food: 1,
  trail: 2,
  transport: 3,
  people: 4,
  landscape: 5,
};

const Lightbox = dynamic(
  () => import("@/components/departure/lightbox").then((m) => m.Lightbox),
  { ssr: false },
);

/**
 * Cell widths.
 *
 * The first two are wide because they carry the two questions people are too
 * embarrassed to ask. Everything after runs three across. An earlier version
 * gave the first cell four columns of six and produced a 942px picture above a
 * row of 459px ones, which reads as a mistake rather than as emphasis — two
 * halves is emphasis, two-thirds against a third is an accident.
 */
function spanFor(index: number): string {
  if (index < 2) return "sm:col-span-3";
  return "sm:col-span-3 lg:col-span-2";
}

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  const ordered = React.useMemo(
    () =>
      images
        .map((image, i) => ({ image, i }))
        .sort(
          (a, b) =>
            CATEGORY_RANK[a.image.category] - CATEGORY_RANK[b.image.category] ||
            a.i - b.i,
        ),
    [images],
  );

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-6">
        {ordered.map(({ image, i }, position) => (
          <li
            key={(image.src ?? image.caption) + i}
            className={cn("min-w-0", spanFor(position))}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full cursor-pointer text-left"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <GalleryFrame
                  image={image}
                  slot="departureCard"
                  className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                />
              </span>
              {/* The label is its own line. Run inline it read
                  "Where you sleepA standard twin teahouse room". */}
              <span className="mt-3 block text-xs tracking-[0.14em] text-muted-foreground uppercase">
                {CATEGORY_LABEL[image.category]}
              </span>
              <span className="mt-1 block max-w-[46ch] text-sm text-muted-foreground">
                {image.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <Lightbox
          images={images}
          index={open}
          onClose={() => setOpen(null)}
          onMove={setOpen}
        />
      )}
    </>
  );
}
