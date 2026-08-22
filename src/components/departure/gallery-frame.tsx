import Image from "next/image";

import type { GalleryImage } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * One frame of the gallery — a photograph, or an honest gap where one is not
 * yet available.
 *
 * The gap is deliberate and it is not a failure state. Eight of the nineteen
 * images this site was built with turned out to show something other than what
 * their caption claimed, including a house cat filed as a teahouse room and two
 * African rhinos on a page about Nepal's one-horned rhino. The ones that could
 * not be verified are drawn as this panel instead of being filled with a
 * plausible substitute.
 *
 * That is the whole argument of the site applied to its own photography: an
 * approximate picture with a confident caption is a small lie, and a small lie
 * on the page that says "check everything we tell you" costs more than a blank
 * rectangle does.
 */
export function GalleryFrame({
  image,
  className,
  sizes,
  priority,
  tone = "light",
  minimal = false,
}: {
  image: GalleryImage;
  className?: string;
  sizes: string;
  priority?: boolean;
  /**
   * Which way round the panel reads.
   *
   * The placeholder started as a light card, which was right on its own and
   * wrong in the header: there it sits under a dark gradient carrying white
   * type, so its own dark caption was about to be printed underneath a scrim
   * designed to hide exactly that. A placeholder that is unreadable is worse
   * than the photograph it stands in for.
   */
  tone?: "light" | "dark";
  /**
   * Label only, no caption.
   *
   * Used where the surrounding component already shows the caption, so the
   * same sentence is not printed twice a few pixels apart.
   */
  minimal?: boolean;
}) {
  if (image.src) {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        quality={72}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={cn("object-cover", className)}
      />
    );
  }

  const dark = tone === "dark";

  return (
    <div
      role="img"
      aria-label={`Photograph pending. ${image.caption}`}
      className={cn(
        "absolute inset-0 flex flex-col justify-end p-6 sm:p-10",
        dark ? "bg-summit text-glacier" : "bg-band-sunk text-foreground",
      )}
    >
      {/* A drawn horizon rather than a grey box: it reads as a placed frame
          rather than as a broken image. */}
      <svg
        aria-hidden
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full",
          dark ? "opacity-25" : "opacity-[0.13]",
        )}
      >
        <path
          d="M0 32 L18 18 L30 26 L46 8 L62 24 L78 14 L100 30 L100 40 L0 40 Z"
          className={dark ? "fill-glacier" : "fill-foreground"}
        />
      </svg>

      {!minimal && (
        <>
          <p
            className={cn(
              "relative text-xs tracking-[0.18em] uppercase",
              dark ? "text-glacier/70" : "text-muted-foreground",
            )}
          >
            Photograph pending
          </p>
          <p className="relative mt-3 max-w-[46ch] font-display text-xl tracking-tight text-balance sm:text-2xl">
            {image.caption}
          </p>
          <p
            className={cn(
              "relative mt-3 max-w-[52ch] text-xs",
              dark ? "text-glacier/60" : "text-muted-foreground",
            )}
          >
            We would rather show you nothing than show you a stock photograph of
            somewhere else. This is what will be here.
          </p>
        </>
      )}
    </div>
  );
}
