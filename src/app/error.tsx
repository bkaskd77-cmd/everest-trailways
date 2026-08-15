"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Next 16 passes `retry` (not `reset`).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="shell flex min-h-[70svh] flex-col justify-center py-32">
      <p className="tabular text-xs tracking-[0.24em] text-muted-foreground uppercase">
        Something broke
      </p>
      <h1 className="mt-4 max-w-[16ch] font-display text-5xl tracking-tight">
        We lost the trail for a moment.
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        An unexpected error stopped this page from loading. Trying again usually
        clears it.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono tabular text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-4">
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  );
}
