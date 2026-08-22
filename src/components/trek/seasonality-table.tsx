import { Reveal, StaggerGroup } from "@/components/motion";
import { type MonthRating, MONTH_NAME } from "@/content/trek-pages";
import { cn } from "@/lib/utils";

/**
 * Twelve months, rated, with the reason attached to each.
 *
 * Colour carries none of the meaning on its own. Every row states its rating
 * in words in a column of its own, so the table reads identically to somebody
 * who cannot separate the pine green from the rust — and identically again to
 * a crawler or an assistant, which reads the DOM and never sees a background
 * colour at all. The tint is a second encoding of something already written
 * down, never the first.
 *
 * It is a real <table> for the same reason: a grid of coloured divs is a
 * picture of a table, and a screen reader cannot announce "March, possible"
 * from a picture.
 */

const RATING_LABEL: Record<MonthRating["rating"], string> = {
  best: "Best",
  good: "Good",
  possible: "Possible",
  avoid: "Avoid",
};

/**
 * A short glyph beside the word, for scanning down the column at speed.
 * Hidden from assistive technology — the word next to it already says this.
 */
const RATING_MARK: Record<MonthRating["rating"], string> = {
  best: "●●●",
  good: "●●○",
  possible: "●○○",
  avoid: "○○○",
};

const RATING_STYLE: Record<MonthRating["rating"], string> = {
  best: "bg-verified/12 text-verified",
  good: "bg-info/12 text-info",
  possible: "bg-muted text-muted-foreground",
  avoid: "bg-prayer/12 text-prayer-deep",
};

export function SeasonalityTable({
  months,
  trekName,
}: {
  months: MonthRating[];
  trekName: string;
}) {
  const ordered = [...months].sort((a, b) => a.month - b.month);

  return (
    <div className="mt-10 overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          {trekName}, rated month by month, with the reason for each rating.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="w-28 py-3 pr-4 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
            >
              Month
            </th>
            <th
              scope="col"
              className="w-32 py-3 pr-4 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
            >
              Rating
            </th>
            <th
              scope="col"
              className="py-3 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
            >
              What that means here
            </th>
          </tr>
        </thead>
        <StaggerGroup as="tbody" stagger={0.03}>
          {ordered.map((m) => (
            <Reveal as="tr" key={m.month} className="border-b border-border/60">
              <th
                scope="row"
                className="py-4 pr-4 align-top font-normal whitespace-nowrap"
              >
                {MONTH_NAME[m.month - 1]}
              </th>
              <td className="py-4 pr-4 align-top">
                <span
                  className={cn(
                    "inline-flex items-baseline gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-[0.06em] uppercase",
                    RATING_STYLE[m.rating],
                  )}
                >
                  <span aria-hidden className="text-[0.6rem] tracking-[0.1em]">
                    {RATING_MARK[m.rating]}
                  </span>
                  {RATING_LABEL[m.rating]}
                </span>
              </td>
              <td className="max-w-[52ch] py-4 align-top text-muted-foreground">
                {m.note}
              </td>
            </Reveal>
          ))}
        </StaggerGroup>
      </table>
    </div>
  );
}
