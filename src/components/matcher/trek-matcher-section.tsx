import { Reveal } from "@/components/motion";
import { TrekMatcher } from "@/components/matcher/trek-matcher";
import { NO_STORAGE_NOTICE } from "@/lib/matcher-types";

/**
 * Between the trust strip and the departures, deliberately.
 *
 * The strip above establishes that the company's claims can be checked; the
 * grid below is six dates someone now has to choose between. This is the step
 * in the middle — narrowing six to two — and putting it anywhere else would
 * mean either asking for constraints before there is any reason to trust the
 * answer, or asking after the person has already scrolled past the thing they
 * needed help with.
 *
 * The header is server-rendered plain text. It is the first thing in the
 * section and it must not wait on hydration to exist.
 */
export function TrekMatcherSection() {
  return (
    // Same ground as the trust strip above it, separated by a rule rather than
    // a colour change — the surface break belongs between this and the
    // departures, which is a different kind of content.
    <section aria-labelledby="matcher-heading" className="bg-band">
      <div className="shell border-t border-border py-20 lg:py-24">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[55fr_40fr] lg:items-end lg:gap-12">
            <div>
              <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
                Trek matcher
              </p>
              <h2
                id="matcher-heading"
                className="mt-4 font-display text-4xl tracking-tight text-balance lg:text-5xl"
              >
                Tell us your constraints. We&rsquo;ll tell you what fits.
              </h2>
            </div>

            <p className="text-base text-muted-foreground">
              It reads the same live departure data as the cards below — the
              same seats, dates and thresholds. {NO_STORAGE_NOTICE}
            </p>
          </div>
        </Reveal>

        <div className="mt-10 lg:mt-12">
          <TrekMatcher />
        </div>
      </div>
    </section>
  );
}
