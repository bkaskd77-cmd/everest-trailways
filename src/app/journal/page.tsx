import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = pageMetadata({
  title: "Journal",
  description:
    "Conditions reports, route changes and what we learned on the last departure. Nothing is published here yet, and we would rather say so than fill it.",
  path: "/journal",
});

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Journal"
      title="Notes from the trail."
      body="Conditions reports, route changes and what we learned on the last departure. Nothing is published here yet, and we would rather say so than fill it."
    />
  );
}
