/**
 * The hero carousel's content. This is the single place to edit slide copy and
 * imagery — no component needs touching.
 *
 * SWAPPING IN REAL PHOTOGRAPHY
 * Drop the file into `public/hero/` and change only that slide's `image.src`:
 *
 *     src: "/hero/khumbu.jpg"
 *
 * Nothing else changes: `next/image` handles local and remote sources
 * identically. Once every `src` is local, the `images.remotePatterns` block in
 * next.config.ts can be deleted.
 *
 * Shoot or crop landscape at 16:9 or wider, 2400px on the long edge or more.
 * The carousel covers the frame, so use `focalPoint` to say which part must
 * survive the crop on tall phone screens.
 *
 * CORRECTING AN IMAGE THAT DOES NOT SIT WELL
 * The overlay is deliberately light and identical for every slide, so a bright
 * or busy photograph can leave the copy short of contrast. Do not change the
 * component. Run `pnpm check:hero`; it measures each image and prints the
 * minimum `scrimStrength` that would make it pass. Set that value on the slide.
 *
 *   scrimStrength — 0–2, multiplies the copy's text-shadow alphas. Default 1.
 *   imageFilter   — extra CSS filter, appended after the base treatment.
 *   textPosition  — "left" (default) or "center".
 *
 * All five are intentionally left undefined: the placeholders pass as they are,
 * and every value set here is a per-image correction that a future photograph
 * should not silently inherit. Full guidance in hero-slides.README.md.
 */

export type HeroSlide = {
  id: string;
  /** Eyebrow above the headline, e.g. "Khumbu · Solukhumbu". */
  region: string;
  /** Two lines max. Set in Instrument Serif, one array entry per line. */
  headline: string;
  /** One trust-carrying sentence. */
  subline: string;
  image: {
    src: string;
    alt: string;
    credit?: string;
    /**
     * Tiny base64 preview shown while the full image loads. Optional — without
     * one the slide rests on a summit-coloured panel, never white. Only slide 1
     * needs it, since it is the LCP element.
     */
    blurDataURL?: string;
  };
  /** CSS object-position. Defaults to "center". */
  focalPoint?: string;
  /**
   * 0–2, multiplies the copy's text-shadow alphas for this slide only.
   * Default 1. `pnpm check:hero` prints the minimum value each image needs.
   * There is no background panel to scale — legibility rides on the type.
   */
  scrimStrength?: number;
  /**
   * Extra CSS filter for this image, appended after the base treatment —
   * e.g. "brightness(1.1)" to lift a flat frame, "saturate(0.9)" to calm one.
   */
  imageFilter?: string;
  /** Alignment of the copy block. Default "left". */
  textPosition?: "left" | "center";
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
};

/**
 * Unsplash's CDN does the resizing before Next's optimiser ever sees the file,
 * which keeps the origin fetch small. Local files will not need this.
 */
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2400&h=1350&q=75`;

export const heroSlides: HeroSlide[] = [
  {
    id: "khumbu",
    region: "Khumbu · Everest Region",
    headline: "The Himalaya, made verifiable.",
    subline:
      "Every itinerary carries its licence, its guide ratios and its full price breakdown.",
    image: {
      src: unsplash("photo-1693717671076-374d59bc2ff2"),
      alt: "A carved mani stone on the trail below a snow-covered Himalayan peak in the Khumbu.",
      credit: "Unsplash",
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAALABQDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAIFBAb/xAAkEAACAQMEAAcAAAAAAAAAAAABAgMABBEFEiFhEyIxQWJxgf/EABUBAQEAAAAAAAAAAAAAAAAAAAAC/8QAGREAAwEBAQAAAAAAAAAAAAAAAAECMRIT/9oADAMBAAIRAxEAPwBC9vHaFbkxMjDcNpCsCOOPb16rLFPHJ5YYyvyYjFRdUkdmjUscEAkdnFLpkjpchFYhSyjH2wFFVJaHMt4ddbXVvDAouDBI7chvEI4/BRU6CVhbxMcMzoGYsoJJx3RT0oniT//Z",
    },
    focalPoint: "center 45%",
    ctaPrimary: { label: "Plan My Trek", href: "/plan" },
    ctaSecondary: { label: "Browse Everest treks", href: "/departures" },
  },
  {
    id: "annapurna",
    region: "Annapurna Conservation Area",
    headline: "One circuit. No surprises.",
    subline:
      "Fixed departures with live seat counts and a published cost sheet.",
    image: {
      src: unsplash("photo-1531719555052-632b0348c404"),
      alt: "Snow-covered ridgelines of the Annapurna massif at first light.",
      credit: "Unsplash",
    },
    focalPoint: "center 40%",
    ctaPrimary: { label: "See fixed departures", href: "/departures" },
    ctaSecondary: { label: "Read the cost sheet", href: "/pricing" },
  },
  {
    id: "langtang",
    region: "Langtang Valley",
    headline: "Near Kathmandu. Far from crowds.",
    subline: "Short-window treks for travellers with a week, not a month.",
    image: {
      src: unsplash("photo-1741755072624-7dffb6bed861"),
      alt: "Trekkers crossing a broad glacial valley beneath the Langtang range.",
      credit: "Unsplash",
    },
    ctaPrimary: { label: "Find a short trek", href: "/departures" },
    ctaSecondary: {
      label: "Langtang in seven days",
      href: "/departures",
    },
  },
  {
    id: "mustang",
    region: "Upper Mustang",
    headline: "Beyond the rain shadow.",
    subline: "Restricted-area permits arranged and itemised before you pay.",
    image: {
      src: unsplash("photo-1758701320941-89f86492c1ef"),
      alt: "A walled village and terraced fields on the arid valley floor of Upper Mustang.",
      credit: "Unsplash",
    },
    focalPoint: "center 55%",
    ctaPrimary: { label: "Check permit costs", href: "/pricing" },
    ctaSecondary: { label: "Mustang itineraries", href: "/departures" },
  },
  {
    id: "chitwan",
    region: "Chitwan · Terai",
    headline: "Not every trek is uphill.",
    subline:
      "Jungle, river and cultural journeys run by the same licensed team.",
    image: {
      src: unsplash("photo-1700366776973-20bda63d5b1a"),
      alt: "A wide slow river running through dense sal forest in the Terai lowlands.",
      credit: "Unsplash",
    },
    focalPoint: "center 60%",
    ctaPrimary: { label: "Explore activities", href: "/activities" },
  },
];
