import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Regions",
  description:
    "Khumbu, Annapurna, Langtang, Mustang and the Terai, each with its walking seasons and what the ground is actually like. The regions are named on every departure in the meantime.",
  alternates: { canonical: "/regions" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Regions"
      title="Nepal, by where you would be."
      body="Khumbu, Annapurna, Langtang, Mustang and the Terai, each with its walking seasons and what the ground is actually like. The regions are named on every departure in the meantime."
    />
  );
}
