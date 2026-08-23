"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { GalleryFrame } from "@/components/departure/gallery-frame";
import { Reveal, StaggerGroup } from "@/components/motion";
import type { GalleryImage } from "@/content/departures";

/**
 * The trip, as opposed to the mountain.
 *
 * The header slider carries the view and the trail. This carries the room, the
 * plate, the jeep and the people — the things somebody is actually buying and
 * the things every other operator's gallery leaves out. Splitting the pool is
 * what makes both worth looking at: one photograph cannot be the hero of a
 * page and a thumbnail four sections below it without reading as a shortage.
 *
 * The lightbox is loaded on the first click. Its focus trap and key handling
 * cannot run until an image is opened, so shipping them with the grid ships
 * code most readers never execute. This is the one place on the departure page
 * where deferring was measured and moved real bytes.
 */

const Lightbox = dynamic(
  () => import("@/components/departure/lightbox").then((m) => m.Lightbox),
  { ssr: false },
);

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  if (!images.length) return null;

  return (
    <>
      <StaggerGroup
        as="ul"
        className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        {images.map((image, index) => (
          <Reveal as="li" key={image.caption}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group block w-full cursor-pointer text-left"
              aria-label={`Open: ${image.caption}`}
            >
              {/*
                The frame needs a positioned, sized box around it.
                <GalleryFrame> renders `absolute inset-0` in every use and says
                so — it expects its container to give it both. This grid did
                not: the button is `static` and the aspect ratio was handed
                down as a class on the image instead. With no positioned
                ancestor, `inset-0` resolved against the viewport, so every
                thumbnail painted full-screen over the whole page. They are
                lazy, so it only appeared once somebody scrolled far enough to
                load them — which is why the page looked fine until you came
                back up.
              */}
              <div className="relative aspect-4/3 overflow-hidden rounded-md">
                <GalleryFrame
                  image={image}
                  slot="galleryThumb"
                  minimal
                  className="transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {image.caption}
              </p>
            </button>
          </Reveal>
        ))}
      </StaggerGroup>

      {open !== null && (
        <Lightbox
          images={images}
          index={open}
          onClose={() => setOpen(null)}
          onMove={(next) =>
            setOpen(((next % images.length) + images.length) % images.length)
          }
        />
      )}
    </>
  );
}
