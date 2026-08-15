import { DepartureCard } from "@/components/departures/departure-card";
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
 */
export function DepartureGrid({ departures }: { departures: Departure[] }) {
  return (
    <StaggerGroup
      as="ul"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {departures.map((departure) => (
        <Reveal as="li" key={departure.id} className="flex">
          <DepartureCard departure={departure} />
        </Reveal>
      ))}
    </StaggerGroup>
  );
}
