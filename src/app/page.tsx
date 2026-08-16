import { FeaturedDepartures } from "@/components/departures/featured-departures";
import { HeroCarousel } from "@/components/hero/hero-carousel";
import { Seam } from "@/components/motion";
import { TrustStrip } from "@/components/trust/trust-strip";

/**
 * The hero and the trust band are wrapped together so the seam between them can
 * be driven from one scroll value rather than two triggers. The matcher no
 * longer sits between them — it is the seventh cell of the departures grid,
 * where it is asked after there is something to compare rather than before.
 */
export default function HomePage() {
  return (
    <>
      <Seam hero={<HeroCarousel />}>
        <TrustStrip />
      </Seam>
      <FeaturedDepartures />
    </>
  );
}
