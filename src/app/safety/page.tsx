import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Safety standards",
  description:
    "Guide ratios, assistant guides above altitude, turnaround rules and evacuation cover, written out. The guide ratio for every departure is published on its own page today.",
  alternates: { canonical: "/safety" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Safety standards"
      title="The standard we hold to."
      body="Guide ratios, assistant guides above altitude, turnaround rules and evacuation cover, written out. The guide ratio for every departure is published on its own page today."
    />
  );
}
