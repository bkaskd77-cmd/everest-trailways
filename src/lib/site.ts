export const siteConfig = {
  name: "Everest Trailways",
  wordmark: "EVEREST TRAILWAYS",
  tagline: "The Himalaya, made verifiable.",
  description:
    "Guided treks and outdoor activities across Nepal, run to published safety standards with transparent pricing and verifiable licensing.",
  url: "https://everest-trailways.vercel.app",
  locale: "en_GB",
} as const;

export const primaryNav = [
  { label: "Treks", href: "/treks" },
  { label: "Activities", href: "/activities" },
  { label: "Regions", href: "/regions" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNav = {
  explore: [
    { label: "Treks", href: "/treks" },
    { label: "Activities", href: "/activities" },
    { label: "Regions", href: "/regions" },
    { label: "Journal", href: "/journal" },
    { label: "The team", href: "/team" },
    { label: "Contact", href: "/contact" },
  ],
  trust: [
    { label: "Our Licences", href: "/licences" },
    { label: "Safety Standards", href: "/safety" },
    { label: "Price Transparency", href: "/pricing" },
    { label: "Cancellation Policy", href: "/cancellation" },
  ],
} as const;

/** Static for now — Step 1 ships no currency switching. */
export const defaultCurrency = "USD" as const;
