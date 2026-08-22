"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";

import type { GalleryImage } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The slider.
 *
 * The gallery shipped as an editorial grid and it was the wrong answer twice
 * over: it was not what was asked for, and the grid it produced was lopsided —
 * one 942px cell above six 459px ones, which reads as a mistake rather than a
 * rhythm.
 *
 * A slider is right here for a reason beyond the brief. These images are a
 * sequence with an argument in it — the room, then the plate, then the trail,
 * then the country — and a grid presents them as a set to be scanned while a
 * slider presents them one at a time, each with its caption, in the order that
 * makes the case. The caption is the point; in the grid it was four lines of
 * small type under a small picture.
 *
 * Built on scroll snapping rather than transforms. That gets native momentum
 * and swipe on a phone for free, keeps the slides in normal document flow so
 * they are all in the HTML for a crawler, and degrades to a horizontally
 * scrollable strip if the JavaScript never arrives.
 */

const Lightbox = dynamic(
  () => import("@/components/departure/lightbox").then((m) => m.Lightbox),
  { ssr: false },
);

const CATEGORY_LABEL: Record<GalleryImage["category"], string> = {
  trail: "On the trail",
  accommodation: "Where you sleep",
  food: "What you eat",
  transport: "Getting there",
  people: "Guides and porters",
  landscape: "The country",
};

export function GallerySlider({ images }: { images: GalleryImage[] }) {
  const track = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);
  const [zoomed, setZoomed] = React.useState<number | null>(null);

  /*
   * The active slide is read from the scroll position rather than tracked as
   * state that the scroller is asked to obey. The user can swipe, drag the
   * scrollbar, or use the buttons, and all three have to agree — the only thing
   * that knows the truth is where the track actually is.
   */
  const onScroll = React.useCallback(() => {
    const node = track.current;
    if (!node) return;
    const slide = node.scrollWidth / images.length;
    const next = Math.round(node.scrollLeft / slide);
    setIndex(Math.min(images.length - 1, Math.max(0, next)));
  }, [images.length]);

  const goTo = React.useCallback(
    (next: number) => {
      const node = track.current;
      if (!node) return;
      const target = (next + images.length) % images.length;
      node.scrollTo({
        left: (node.scrollWidth / images.length) * target,
        behavior: "smooth",
      });
      setIndex(target);
    },
    [images.length],
  );

  const current = images[index];

  return (
    <div>
      <div className="relative">
        <ul
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Photographs from this trek"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goTo(index + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goTo(index - 1);
            }
          }}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <li
              key={image.src + i}
              className="relative aspect-[16/10] w-full shrink-0 snap-start bg-muted"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 1100px"
                quality={72}
                // The first slide is the one a reader sees when they arrive at
                // the section, so it is the only one worth fetching eagerly.
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                className="object-cover"
              />
            </li>
          ))}
        </ul>

        {/* Controls sit on the image at desktop widths. On a phone they are
            hidden because swiping is better than a 44px target over a photo. */}
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="absolute top-1/2 left-4 hidden size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-summit/70 text-glacier backdrop-blur-sm transition-colors hover:bg-summit/90 sm:inline-flex"
        >
          <ChevronLeft aria-hidden className="size-5" />
          <span className="sr-only">Previous photograph</span>
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="absolute top-1/2 right-4 hidden size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-summit/70 text-glacier backdrop-blur-sm transition-colors hover:bg-summit/90 sm:inline-flex"
        >
          <ChevronRight aria-hidden className="size-5" />
          <span className="sr-only">Next photograph</span>
        </button>

        <button
          type="button"
          onClick={() => setZoomed(index)}
          className="absolute right-4 bottom-4 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-summit/70 text-glacier backdrop-blur-sm transition-colors hover:bg-summit/90"
        >
          <Expand aria-hidden className="size-4" />
          <span className="sr-only">Open this photograph full size</span>
        </button>

        <p className="absolute bottom-4 left-4 rounded-full bg-summit/70 px-3 py-1.5 tabular text-xs text-glacier backdrop-blur-sm">
          {index + 1} / {images.length}
        </p>
      </div>

      {/*
        The caption block is a fixed height at every breakpoint.
        Captions run from one line to four, and letting the block resize as the
        slider moves would shunt the whole page under it on every swipe.
      */}
      <div className="mt-5 min-h-24 sm:min-h-20">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {CATEGORY_LABEL[current.category]}
        </p>
        <p
          aria-live="polite"
          className="mt-2 max-w-[68ch] text-base text-muted-foreground"
        >
          {current.caption}
        </p>
      </div>

      {/* Thumbnails, so the sequence is visible as a sequence. */}
      <ul className="mt-4 flex [scrollbar-width:none] gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {images.map((image, i) => (
          <li key={`thumb-${image.src}-${i}`} className="shrink-0">
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative block h-16 w-24 cursor-pointer overflow-hidden rounded-md transition-opacity",
                i === index
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "opacity-55 hover:opacity-100",
              )}
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes="96px"
                quality={40}
                loading="lazy"
                className="object-cover"
              />
              <span className="sr-only">
                Photograph {i + 1}: {image.alt}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {zoomed !== null && (
        <Lightbox
          images={images}
          index={zoomed}
          onClose={() => setZoomed(null)}
          onMove={setZoomed}
        />
      )}
    </div>
  );
}
