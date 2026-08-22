import { Reveal } from "@/components/motion";

/**
 * The two-column section header used down the departure page.
 *
 * Same shape as the homepage departures section: headline left, the paragraph
 * that qualifies it right, baselines aligned. It exists as a component because
 * the departure page had six section intros each written as a narrow left
 * column with nothing beside it, which on a 1,440px screen left half the band
 * empty and made every heading look like the start of an article that had not
 * loaded.
 *
 * `lg:items-end` is what does the work: the paragraph sits on the headline's
 * last baseline rather than its first, so the two blocks read as one line of
 * thought instead of two stacked columns.
 */
export function SectionHead({
  eyebrow,
  title,
  id,
  children,
  level = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  id?: string;
  /** The supporting paragraph. Sits in the right column. */
  children?: React.ReactNode;
  level?: "h2" | "h3";
}) {
  const Heading = level;

  return (
    <Reveal>
      <div className="grid gap-6 lg:grid-cols-[52fr_44fr] lg:items-end lg:gap-14">
        <div>
          {eyebrow && (
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          )}
          <Heading
            id={id}
            className={
              level === "h2"
                ? "mt-4 max-w-[18ch] font-display text-3xl tracking-tight text-balance lg:text-5xl"
                : "mt-1 max-w-[20ch] font-display text-2xl tracking-tight text-balance lg:text-4xl"
            }
          >
            {title}
          </Heading>
        </div>

        {children && (
          <div className="max-w-[62ch] text-base text-muted-foreground">
            {children}
          </div>
        )}
      </div>
    </Reveal>
  );
}
