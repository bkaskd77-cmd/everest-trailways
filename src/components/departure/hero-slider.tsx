"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

import { GalleryFrame } from "@/components/departure/gallery-frame";
import type { GalleryImage } from "@/content/departures";
import { textShadowCss } from "@/lib/hero-scrim";
import { cn } from "@/lib/utils";

/**
 * The departure header, as a slider.
 *
 * The page used to open on one photograph and keep the gallery in a band
 * further down. Both halves were weaker for it: the header was a single decided
 * image doing nothing, and the gallery sat below the fold in a section a reader
 * had already decided the shape of. Merging them puts the room and the plate in
 * the first thing anybody sees, which is where the argument belongs — most
 * operators lead with a summit, and this leads with what you are actually
 * buying.
 *
 * Legibility is the same shadow-based treatment the homepage hero uses: no
 * panel, no scrim rectangle, the type carries its own contrast. That has to
 * hold across seven different photographs rather than one chosen for it, which
 * is why the gradient underneath is heavier here than on the homepage.
 *
 * Scroll snapping again, so a phone gets swipe for free and every slide is in
 * the document whether or not JavaScript arrives.
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
 * How long each photograph holds.
 *
 * Seven seconds. Long enough to read a two-line caption without hurrying, short
 * enough that somebody who is not going to touch anything still sees the room
 * and the plate before they scroll past. A carousel that moves faster than its
 * own captions can be read is a carousel that is only decorating.
 */
const HOLD_MS = 7000;

export function DepartureHeroSlider({
  images,
  region,
  trekName,
  children,
}: {
  images: GalleryImage[];
  region: string;
  trekName: string;
  /** Breadcrumb, dates, badge and the spec row. Server-rendered, overlaid. */
  children: React.ReactNode;
}) {
  const track = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);

  /*
   * Autoplay, and the four things that have to be true for it to be acceptable.
   *
   * An auto-advancing carousel is content that moves without being asked, which
   * is a problem for anybody who reads slowly, uses a screen magnifier, or is
   * made ill by motion. It is only defensible with all of the following, and
   * each one is a separate mechanism rather than a variation on the same one:
   *
   *   1. It never starts under `prefers-reduced-motion`. Not slower — never.
   *   2. It pauses while a pointer is over it or focus is inside it, so reading
   *      a caption cannot be interrupted by the thing you are reading.
   *   3. It pauses when the header is off screen or the tab is hidden, so it is
   *      not advancing through photographs nobody is looking at.
   *   4. There is a visible pause control. WCAG 2.2.2 asks for a mechanism, and
   *      hover is not a mechanism on a touchscreen.
   *
   * Manual use pauses it too — pressing an arrow and then being moved on four
   * seconds later is the carousel arguing with you.
   */
  const [playing, setPlaying] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const [onScreen, setOnScreen] = React.useState(true);
  const shell = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPlaying(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    const node = shell.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);

    const onVisibility = () => setOnScreen(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const onScroll = React.useCallback(() => {
    const node = track.current;
    if (!node) return;
    const slide = node.scrollWidth / images.length;
    setIndex(
      Math.min(
        images.length - 1,
        Math.max(0, Math.round(node.scrollLeft / slide)),
      ),
    );
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

  const running = playing && !held && onScreen && images.length > 1;

  React.useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => goTo(index + 1), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [running, index, goTo]);

  const current = images[index];

  return (
    <header
      ref={shell}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className="relative isolate min-h-[74svh] overflow-hidden bg-summit text-glacier"
    >
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label={`Photographs from ${trekName}`}
        className="absolute inset-0 flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <li
            key={(image.src ?? image.caption) + i}
            className="relative h-full w-full shrink-0 snap-start"
          >
            <GalleryFrame
              image={image}
              slot="departureHero"
              priority={i === 0}
              tone="dark"
              // The header prints the caption under the controls, so the panel
              // shows only its label.
              minimal
              className="object-cover"
            />
          </li>
        ))}
      </ul>

      {/*
        Heavier than the homepage's gradient, and deliberately so: that hero
        picks its own photographs, this one has to stay legible over seven it
        did not choose, including a pale placeholder panel.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-summit/92 via-summit/45 to-summit/25"
      />

      <div className="relative flex min-h-[74svh] flex-col justify-end">
        <div className="shell pt-32 pb-10 lg:pt-40">
          <p
            className="text-xs tracking-[0.24em] text-glacier/80 uppercase"
            style={{ textShadow: textShadowCss("small") }}
          >
            {region}
          </p>
          {children}
        </div>

        {/* Controls sit on the bottom rule of the header, clear of the type. */}
        <div className="shell flex flex-wrap items-center gap-x-4 gap-y-3 pb-8">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              goTo(index - 1);
            }}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-glacier/15 text-glacier backdrop-blur-sm transition-colors hover:bg-glacier/25"
          >
            <ChevronLeft aria-hidden className="size-5" />
            <span className="sr-only">Previous photograph</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              goTo(index + 1);
            }}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-glacier/15 text-glacier backdrop-blur-sm transition-colors hover:bg-glacier/25"
          >
            <ChevronRight aria-hidden className="size-5" />
            <span className="sr-only">Next photograph</span>
          </button>

          {/*
            The pause control. Visible, not hover-only: a touchscreen has no
            hover, and WCAG 2.2.2 asks for a mechanism rather than a behaviour.
            Under reduced motion it shows as a play control rather than
            disappearing: nothing moves until somebody asks for it, and asking
            has to remain possible.
          */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => setPlaying((was) => !was)}
              aria-pressed={!playing}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-glacier/15 text-glacier backdrop-blur-sm transition-colors hover:bg-glacier/25"
            >
              {playing ? (
                <Pause aria-hidden className="size-4" />
              ) : (
                <Play aria-hidden className="size-4" />
              )}
              <span className="sr-only">
                {playing
                  ? "Pause the photographs"
                  : "Play the photographs automatically"}
              </span>
            </button>
          )}

          {/* Dots, one per photograph, each a target of its own. */}
          <ul className="flex items-center gap-2">
            {images.map((image, i) => (
              <li key={`dot-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    goTo(i);
                  }}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "block h-1.5 cursor-pointer rounded-full transition-all duration-300",
                    i === index
                      ? "w-8 bg-glacier"
                      : "w-3 bg-glacier/40 hover:bg-glacier/70",
                  )}
                >
                  <span className="sr-only">
                    Photograph {i + 1}: {image.caption}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/*
            The caption is the reason the gallery is here at all, so it stays on
            screen rather than living in a lightbox. Fixed height, because it
            runs from one line to three and the header must not resize as the
            slider moves.
          */}
          <p
            aria-live="polite"
            className="w-full max-w-[62ch] text-sm text-glacier/85 lg:ml-auto lg:w-auto lg:max-w-[46ch] lg:text-right"
            style={{ textShadow: textShadowCss("small") }}
          >
            {/*
              The label is its own line. Rendered as adjacent inline text it
              read "Where you sleepA standard twin teahouse room" — the same
              fault as "Payable to paid by us", two strings joined with nothing
              between them.
            */}
            <span className="mb-1 block text-xs tracking-[0.14em] text-glacier/60 uppercase">
              {CATEGORY_LABEL[current.category]}
              {/*
                A real separator in the text, not only a line break in the
                layout. `display: block` puts these on two lines on screen, and
                `textContent` still ran them together — "Where you sleepA
                standard twin teahouse room" — which is what a scraper, a
                translation tool or anything reading the DOM as a string gets.
                Two characters, and the string reads correctly everywhere.
              */}
              <span className="sr-only">: </span>
            </span>
            <span className="block">{current.caption}</span>
          </p>
        </div>
      </div>
    </header>
  );
}

/** The breadcrumb, kept here so the header owns its own shadow treatment. */
export function HeroBreadcrumb({ trekName }: { trekName: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.14em] text-glacier/75 uppercase"
        style={{ textShadow: textShadowCss("small") }}
      >
        <li>
          <Link href="/" className="hover:text-glacier">
            Home
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link href="/departures" className="hover:text-glacier">
            Departures
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page" className="text-glacier">
          {trekName}
        </li>
      </ol>
      <Link
        href="/departures"
        className="mt-4 inline-flex items-center gap-2 text-sm text-glacier/80 hover:text-glacier sm:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All departures
      </Link>
    </nav>
  );
}
