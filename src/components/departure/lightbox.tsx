"use client";

import * as React from "react";
import { GalleryFrame } from "@/components/departure/gallery-frame";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { GalleryImage } from "@/content/departures";

/**
 * The gallery lightbox, in its own module so it can arrive late.
 *
 * This is the one part of the departure page that can honestly be deferred.
 * The focus trap, the key handling and the overlay cannot run until somebody
 * clicks an image, so shipping them with the grid means shipping code for an
 * interaction most readers never perform. It is imported dynamically by the
 * gallery and loads on the first open.
 *
 * Everything else below the fold on that page is either server-rendered markup
 * with no JavaScript behind it, or a component that renders immediately and
 * whose chunk is preloaded regardless — deferring those was measured and moved
 * no bytes at all.
 */
export function Lightbox({
  images,
  index,
  onClose,
  onMove,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  const image = images[index];

  /*
   * Focus goes into the dialog and stays there.
   *
   * Without the trap, tabbing walks out of an overlay that covers the page and
   * lands on controls the user cannot see — which for a keyboard user is worse
   * than the lightbox not opening at all.
   */
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onMove((index + 1) % images.length);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onMove((index - 1 + images.length) % images.length);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [index, images.length, onClose, onMove]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${image.caption} Image ${index + 1} of ${images.length}.`}
      className="fixed inset-0 z-50 flex flex-col bg-summit/95 p-4 backdrop-blur-sm sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col outline-none"
      >
        <div className="flex items-center justify-between gap-4 pb-4">
          <p className="tabular text-sm text-glacier/70">
            {index + 1} / {images.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-glacier hover:bg-glacier/10"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <GalleryFrame
            image={image}
            slot="galleryLightbox"
            tone="dark"
            className="object-contain"
          />
        </div>

        <div className="flex items-start justify-between gap-6 pt-4">
          <button
            type="button"
            onClick={() => onMove((index - 1 + images.length) % images.length)}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-glacier hover:bg-glacier/10"
          >
            <ChevronLeft aria-hidden className="size-5" />
            <span className="sr-only">Previous image</span>
          </button>

          <p className="max-w-[62ch] text-center text-sm text-glacier/90">
            {image.caption}
          </p>

          <button
            type="button"
            onClick={() => onMove((index + 1) % images.length)}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-glacier hover:bg-glacier/10"
          >
            <ChevronRight aria-hidden className="size-5" />
            <span className="sr-only">Next image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
