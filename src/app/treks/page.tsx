import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Treks",
  description:
    "Each trek will carry its own page with the full route, the seasons it runs in and every departure on it. The departures themselves are already published, with their itineraries and altitude profiles.",
  alternates: { canonical: "/treks" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Treks"
      title="Every route, one page each."
      body="Each trek will carry its own page with the full route, the seasons it runs in and every departure on it. The departures themselves are already published, with their itineraries and altitude profiles."
    />
  );
}
