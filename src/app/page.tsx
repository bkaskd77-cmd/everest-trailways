import { FeaturedDepartures } from "@/components/departures/featured-departures";
import { HeroCarousel } from "@/components/hero/hero-carousel";
import { TrustStrip } from "@/components/trust/trust-strip";

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <TrustStrip />
      <FeaturedDepartures />
    </>
  );
}
