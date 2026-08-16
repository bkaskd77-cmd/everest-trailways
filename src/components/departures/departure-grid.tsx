import {
  CARD_TRACKS,
  DepartureCard,
} from "@/components/departures/departure-card";
import { Reveal, StaggerGroup } from "@/components/motion";
import type { Departure } from "@/content/departures";

/**
 * A grid, not a rail.
 *
 * Choosing a departure is a comparison, not a browse: someone is weighing six
 * dates against each other, and a horizontal rail hides half of them behind a
 * scroll many people never perform. It also kept those cards out of reach of
 * crawlers and assistants, which is the opposite of what this section is for.
 *
 * The grid removed three layout bugs on its own — the rail's container height
 * left ~600px of dead space, clipped the third card mid-sentence, and painted a
 * stray rule down its left edge.
 *
 * Each card spans nine implicit row tracks rather than one, so `subgrid` can
 * level the guarantee block, spec row, solo line, price and actions across a
 * row (see departure-card.tsx). The 24px row gutter is set on this element and
 * suppressed inside each card — a subgrid overrides the gutters of the tracks
 * it spans but not the ones at its outer edges, which is exactly the split we
 * want: no gaps between a card's own tracks, a full gutter between card rows.
 */
export function DepartureGrid({ departures }: { departures: Departure[] }) {
  return (
    <StaggerGroup
      as="ul"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {departures.map((departure) => (
        <Reveal as="li" key={departure.id} className={CARD_TRACKS}>
          <DepartureCard departure={departure} />
        </Reveal>
      ))}
    </StaggerGroup>
  );
}
