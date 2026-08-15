import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The wordmark: Instrument Serif, tracked out. Tracking is what makes it read
 * as a mark rather than as a heading, so it is never set tighter than 0.18em.
 */
export function Wordmark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href="/"
      style={style}
      className={cn(
        "font-display text-[0.8125rem] leading-none tracking-[0.16em] uppercase",
        "sm:text-base sm:tracking-[0.2em] lg:text-lg",
        "whitespace-nowrap transition-opacity hover:opacity-70",
        className,
      )}
    >
      {siteConfig.wordmark}
      <span className="sr-only"> — home</span>
    </Link>
  );
}
