/**
 * Every place a photograph appears on this site, described once.
 *
 * ============================================================================
 * THIS IS THE SPEC PEOPLE UPLOAD AGAINST.
 * `docs/IMAGE-SPEC.md` is generated from this file — edit here, never there.
 * ============================================================================
 *
 * THE PROBLEM THIS SOLVES
 *
 * Photographs will arrive through an admin screen from people who are not going
 * to crop them first, and that is the correct assumption to design against. An
 * operator photographing a teahouse room on a phone produces a 4:3 portrait
 * frame; the departure card wants 4:3 landscape and the page header wants a
 * wide letterbox. Somewhere between those, something gets cut off. Left to
 * chance the thing that gets cut off is the subject, because the subject is
 * usually in the middle vertically and the middle is exactly what a wide crop
 * keeps while a tall crop throws away.
 *
 * So every slot below states three things: the shape it renders at, the
 * smallest upload that will not look soft in it, and where to hold on to when
 * the upload is the wrong shape. `SiteImage` reads this and does the rest, so
 * an unedited upload lands correctly without anybody thinking about it.
 *
 * WHY THESE NUMBERS
 *
 * `minWidth` is the widest this slot is ever rendered on a 2x screen, rounded
 * up. Below it the browser upscales and the picture goes soft — the one defect
 * a viewer reads as cheapness rather than as a mistake. `idealWidth` adds
 * headroom so the same file survives a later redesign that makes the slot
 * bigger.
 *
 * Nothing here asks for a specific aspect ratio on upload. Asking is how you
 * get files that were cropped badly by somebody in a hurry; the site crops, and
 * it crops the same way every time.
 */

/** Where to hold on to when a crop has to throw something away. */
export type Focal =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type ImageSlot = {
  /** Human name, used in the generated spec. */
  label: string;
  /** What this slot is for, in the spec document. */
  purpose: string;
  /**
   * Rendered shape as `width / height`, or `null` where the container decides
   * (a full-bleed header sized in viewport units).
   */
  aspect: number | null;
  /** How the shape is described to an uploader. */
  aspectLabel: string;
  /** The `sizes` attribute. Wrong here means the browser fetches the wrong file. */
  sizes: string;
  /** Smallest upload that will not be upscaled. */
  minWidth: number;
  /** What to ask for. Headroom over `minWidth`. */
  idealWidth: number;
  /** Default focal point when the upload does not carry one. */
  focal: Focal;
  /** JPEG quality. Higher where the image is large and alone on screen. */
  quality: number;
  /** True where the slot can hold the LCP element. */
  canBePriority: boolean;
  /** Anything an uploader needs to know that the numbers do not say. */
  note?: string;
};

/**
 * The focal point as a CSS `object-position`.
 *
 * Not 50% for the vertical default: a photograph of a room, a plate or a person
 * puts its subject slightly above centre, and every crop this site makes is
 * either square-ish or wide. Holding 45% keeps heads and horizons rather than
 * chins and tablecloths.
 */
export const FOCAL_POSITION: Record<Focal, string> = {
  center: "50% 45%",
  top: "50% 15%",
  bottom: "50% 85%",
  left: "20% 45%",
  right: "80% 45%",
  "top-left": "20% 15%",
  "top-right": "80% 15%",
  "bottom-left": "20% 85%",
  "bottom-right": "80% 85%",
};

export const IMAGE_SLOTS = {
  heroSlide: {
    label: "Homepage hero",
    purpose:
      "The full-bleed photograph behind the headline on the homepage. Seen first, at the largest size anywhere on the site.",
    aspect: null,
    aspectLabel:
      "Any. Cropped to fill the window, so it must work wide and tall.",
    sizes: "100vw",
    minWidth: 2560,
    idealWidth: 3200,
    focal: "center",
    quality: 70,
    canBePriority: true,
    note: "Headline type sits over the lower left. Avoid photographs whose subject is in that corner, and avoid anything with fine detail there — the scrim will flatten it.",
  },

  departureHero: {
    label: "Departure page header",
    purpose:
      "The slider across the top of a departure page. Every gallery photograph for that trek appears here at full width.",
    aspect: null,
    aspectLabel: "Any. Cropped to fill a 74vh band.",
    sizes: "100vw",
    minWidth: 2400,
    idealWidth: 3000,
    focal: "center",
    quality: 72,
    canBePriority: true,
    note: "The trek name and the spec row sit over the bottom third under a dark scrim. A subject low in the frame will be behind type.",
  },

  departureCard: {
    label: "Departure card",
    purpose:
      "The photograph at the top of each departure card, on the homepage grid and the departures index.",
    aspect: 4 / 3,
    aspectLabel: "4:3 landscape",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    minWidth: 1200,
    idealWidth: 1600,
    focal: "center",
    quality: 70,
    canBePriority: false,
    note: "Rendered at about 410px wide on a desktop and full width on a phone, which is why the minimum is higher than it looks like it needs to be.",
  },

  galleryLightbox: {
    label: "Gallery, full size",
    purpose:
      "The photograph shown when somebody opens one from a slider. Fitted whole, never cropped.",
    aspect: null,
    aspectLabel: "Any. Shown complete, letterboxed against a dark ground.",
    sizes: "(max-width: 1024px) 100vw, 1024px",
    minWidth: 2048,
    idealWidth: 2560,
    focal: "center",
    quality: 78,
    canBePriority: false,
    note: "The only slot that shows the whole frame, so it is the one where a crooked horizon or a cluttered edge is visible.",
  },

  galleryThumb: {
    label: "Gallery thumbnail",
    purpose: "The small strip under a slider used to jump between photographs.",
    aspect: 3 / 2,
    aspectLabel: "3:2 landscape",
    sizes: "96px",
    minWidth: 240,
    idealWidth: 320,
    focal: "center",
    quality: 45,
    canBePriority: false,
    note: "Generated from the same upload as the slide it points at. Nothing is uploaded separately for this.",
  },

  guidePortrait: {
    label: "Guide portrait",
    purpose:
      "A guide or staff photograph, for the licence and team material. Not yet on a page.",
    aspect: 4 / 5,
    aspectLabel: "4:5 portrait",
    sizes: "(max-width: 640px) 50vw, 280px",
    minWidth: 800,
    idealWidth: 1200,
    focal: "top",
    quality: 74,
    canBePriority: false,
    note: "Focal point is the top of the frame, so a portrait shot at any ratio keeps the face when it is cropped square.",
  },

  journalCover: {
    label: "Journal cover",
    purpose: "The lead photograph on a journal entry. Not yet on a page.",
    aspect: 16 / 9,
    aspectLabel: "16:9 landscape",
    sizes: "(max-width: 1024px) 100vw, 900px",
    minWidth: 1800,
    idealWidth: 2400,
    focal: "center",
    quality: 72,
    canBePriority: true,
    note: "Wide and short. A tall upload loses most of its height here, so choose something horizontal if you have the option.",
  },

  regionCard: {
    label: "Region card",
    purpose: "A region or activity tile. Not yet on a page.",
    aspect: 3 / 4,
    aspectLabel: "3:4 portrait",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px",
    minWidth: 900,
    idealWidth: 1200,
    focal: "center",
    quality: 70,
    canBePriority: false,
    note: "The only tall slot on the site. A wide upload loses its left and right edges here.",
  },
} as const satisfies Record<string, ImageSlot>;

export type SlotName = keyof typeof IMAGE_SLOTS;

/* --------------------------------------------------------------- guidance */

/**
 * The rules that apply to every upload, whatever the slot.
 *
 * Written here rather than in the document so the document cannot drift from
 * them, and phrased for somebody uploading rather than somebody reading code.
 */
export const UPLOAD_RULES: { title: string; body: string }[] = [
  {
    title: "Do not crop before uploading",
    body: "Upload the full frame. The site crops for each place the photograph appears, and it will do a better job with the whole picture than with one that has already lost its edges. A photograph cropped for the card will be the wrong shape for the header.",
  },
  {
    title: "Upload the largest version you have",
    body: "Every size below is a minimum, not a target. The site generates smaller versions automatically and serves the right one for each screen; it cannot invent detail that was not uploaded. A file that is too big costs nothing but upload time. A file that is too small looks cheap on every retina screen, which is most of them.",
  },
  {
    title: "JPEG or PNG, sRGB",
    body: "The site converts to modern formats itself. Do not upload HEIC from an iPhone without converting first, and do not upload anything in Adobe RGB or ProPhoto — the colours will shift on the web.",
  },
  {
    title: "Set a focal point when the subject is off-centre",
    body: "The default keeps the middle of the frame, slightly high. If the subject is at one edge, set the focal point when you upload and every crop on the site will hold on to it instead.",
  },
  {
    title: "Landscape unless the slot says otherwise",
    body: "Two slots are portrait — guide portraits and region cards — and everything else is wide or square. A portrait photograph in a wide slot loses most of its height, which usually means it loses the sky and the ground and keeps a band across the middle.",
  },
  {
    title: "Nothing important in the bottom third of a hero",
    body: "The homepage hero and the departure header both carry type across their lower portion under a dark scrim. A face or a caption-worthy detail down there will be behind text.",
  },
  {
    title: "The caption is the point",
    body: "Photographs on this site carry factual captions describing what is in the frame. Upload something that a plain sentence can describe accurately. A photograph that needs an adjective to be worth showing is not worth showing here.",
  },
];
