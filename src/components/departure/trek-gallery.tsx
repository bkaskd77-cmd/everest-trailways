"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import type { GalleryImage } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * Loaded on the first click, not with the page.
 *
 * `ssr: false` is correct here and nowhere else on this page: a lightbox has no
 * closed state worth rendering into the HTML, so there is no content to lose.
 * The captions it shows are already in the grid beneath every image.
 */
const Lightbox = dynamic(
  () => import("@/components/departure/lightbox").then((m) => m.Lightbox),
  { ssr: false },
);

/**
 * The room and the plate, before the mountain.
 *
 * Most operators publish summits. Somebody deciding whether to spend two
 * thousand dollars and twelve days is not asking what the mountain looks like;
 * they have seen the mountain. They are asking what room they are sleeping in
 * and what is on the plate, and they are often slightly embarrassed to ask. So
 * the accommodation and food images come first and the landscape comes last,
 * which is the reverse of the usual order and the reason this exists.
 *
 * Captions are factual. "A standard twin teahouse room, no heating" rather than
 * anything about cosiness — the whole value of showing the room is lost if the
 * caption is doing persuasion over the top of it.
 */

const CATEGORY_LABEL: Record<GalleryImage["category"], string> = {
  trail: "On the trail",
  accommodation: "Where you sleep",
  food: "What you eat",
  transport: "Getting there",
  people: "Guides and porters",
  landscape: "The country",
};

/**
 * An editorial rhythm rather than a uniform grid.
 *
 * The first two cells are wide because they are the two that answer the
 * questions; the rest run three across on a desktop. Sizes are assigned by
 * position rather than stored on the image, so a gallery of six and a gallery
 * of eight both land somewhere deliberate.
 */
function spanFor(index: number): string {
  if (index === 0) return "sm:col-span-3 lg:col-span-4";
  if (index === 1) return "sm:col-span-3 lg:col-span-2";
  if (index % 5 === 2) return "sm:col-span-3 lg:col-span-2";
  return "sm:col-span-3 lg:col-span-2";
}

export function TrekGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-6 lg:grid-cols-6">
        {images.map((image, i) => (
          <li key={image.src + i} className={cn("min-w-0", spanFor(i))}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full cursor-pointer text-left"
            >
              <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={68}
                  // Below the fold on every screen, so it waits.
                  loading="lazy"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-3 block text-xs tracking-[0.14em] text-muted-foreground uppercase">
                {CATEGORY_LABEL[image.category]}
              </span>
              <span className="mt-1 block max-w-[52ch] text-sm text-muted-foreground">
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
