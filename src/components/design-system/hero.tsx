import Link from "next/link";

import { Ridge } from "@/components/hero/ridge";
import {
  MagneticButton,
  Parallax,
  Reveal,
  TextReveal,
} from "@/components/motion";
import { Button } from "@/components/ui/button";
import { fadeIn } from "@/lib/motion";

/**
 * Placeholder hero. Always summit-dark in both themes, which is what lets the
 * header sit transparent over it.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-summit text-glacier">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* A single cold light source, low and to the left. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_10%,rgba(127,169,196,0.16),transparent_60%)]" />
        <Parallax distance={32} className="absolute inset-x-0 bottom-0">
          <Ridge className="h-[42vh] w-full" />
        </Parallax>
      </div>

      <div className="relative z-10 shell pt-40 pb-20 lg:pb-28">
        <Reveal variants={fadeIn}>
          <p className="text-xs tracking-[0.24em] text-sky uppercase">
            Nepal · Licensed operators · Published safety standards
          </p>
        </Reveal>

        <TextReveal
          as="h1"
          lines={["The Himalaya,", "made verifiable."]}
          delay={0.15}
          className="mt-6 max-w-[16ch] font-display text-6xl tracking-tight lg:text-7xl"
        />

        <Reveal delay={0.65} className="mt-8 max-w-xl">
          <p className="text-lg text-stone-light">
            Every itinerary carries its licence, its guide ratios and its full
            price breakdown — checked before you book, not after.
          </p>
        </Reveal>

        <Reveal delay={0.8} className="mt-10 flex flex-wrap items-center gap-4">
          <MagneticButton>
            <Button asChild size="lg">
              <Link href="/plan">Plan My Trek</Link>
            </Button>
          </MagneticButton>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-stone/40 bg-transparent text-glacier hover:bg-snow/10 hover:text-glacier"
          >
            <Link href="/treks">Browse treks</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
