import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { footerNav, siteConfig } from "@/lib/site";

const contact = [
  { icon: MapPin, label: "Thamel, Kathmandu 44600, Nepal" },
  { icon: Phone, label: "+977 1 000 0000" },
  { icon: Mail, label: "hello@everesttrailways.com" },
];

function Column({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-xs tracking-[0.18em] text-stone-light uppercase">
        {title}
      </h2>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-glacier/85 transition-colors hover:text-glacier"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Always summit-dark, in both themes — the footer is a fixed brand surface
 * rather than a themed one, so it is written against the raw palette.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-summit text-glacier">
      <div className="shell grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-lg tracking-[0.2em] uppercase">
            {siteConfig.wordmark}
          </p>
          <p className="mt-4 max-w-xs font-display text-2xl tracking-tight text-stone-light">
            {siteConfig.tagline}
          </p>
        </div>

        <Column title="Explore" links={footerNav.explore} />
        <Column title="Trust" links={footerNav.trust} />

        <div>
          <h2 className="text-xs tracking-[0.18em] text-stone-light uppercase">
            Contact
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {contact.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-start gap-3 text-sm text-glacier/85"
              >
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-sky" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone/25">
        <div className="shell flex flex-col gap-2 py-6 text-xs text-stone-light sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-x-6 gap-y-1 tabular">
            <span>TAAN Member No. —</span>
            <span>Tourism Licence No. —</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
