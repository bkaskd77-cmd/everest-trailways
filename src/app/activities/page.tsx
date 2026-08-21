import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Jungle, river and cultural journeys run by the same licensed team. The Chitwan and Bardia departures are live now; the rest of the activities catalogue follows.",
  alternates: { canonical: "/activities" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Activities"
      title="Not every trip is a trek."
      body="Jungle, river and cultural journeys run by the same licensed team. The Chitwan and Bardia departures are live now; the rest of the activities catalogue follows."
    />
  );
}
