import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70svh] flex-col justify-center py-32">
      <p className="tabular text-xs tracking-[0.24em] text-muted-foreground uppercase">
        Error 404
      </p>
      <h1 className="mt-4 max-w-[14ch] font-display text-5xl tracking-tight">
        This route isn&rsquo;t on the map.
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        The page you asked for has moved or never existed. Head back to the
        start and pick a trail from there.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/treks">Browse treks</Link>
        </Button>
      </div>
    </section>
  );
}
