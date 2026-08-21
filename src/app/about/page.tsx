import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "About",
  description:
    "The guiding team, the licences, and how the company is structured. The registrations are already public and linked from the homepage.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="About"
      title="Who runs these trips."
      body="The guiding team, the licences, and how the company is structured. The registrations are already public and linked from the homepage."
    />
  );
}
