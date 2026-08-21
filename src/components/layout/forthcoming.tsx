import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A section that is linked but not yet written.
 *
 * The alternative was leaving the header and footer pointing at 404s, and a
 * site whose argument is "every claim here is checkable" cannot have a
 * navigation bar that lies about what exists. This says plainly that the
 * section is not built, rather than implying it is somewhere the reader failed
 * to find.
 *
 * Each of these is a real route with a real file. There is deliberately no
 * catch-all: a typo in an href should still 404, and `pnpm check:links` should
 * still catch it.
 */
export function Forthcoming({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <main className="bg-band-sunk">
      <div className="shell flex min-h-[70svh] flex-col justify-center py-32">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-[18ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[58ch] text-base text-muted-foreground">
          {body}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild>
            <Link href="/departures">See the departures</Link>
          </Button>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-medium text-prayer-deep dark:text-prayer-light"
          >
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform duration-200 group-hover:-translate-x-[3px]"
            />
            Back to the homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
