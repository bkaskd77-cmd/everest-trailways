import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Our licences",
  description:
    "The Nepal Tourism Board and TAAN registration numbers, with the documents behind them. Both numbers are already published on the homepage and link to the public directories.",
  alternates: { canonical: "/licences" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Our licences"
      title="Every registration, in full."
      body="The Nepal Tourism Board and TAAN registration numbers, with the documents behind them. Both numbers are already published on the homepage and link to the public directories."
    />
  );
}
