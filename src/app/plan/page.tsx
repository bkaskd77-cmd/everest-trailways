import type { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = pageMetadata({
  title: "Plan my trek",
  description:
    "A longer planning conversation than the matcher on the homepage, with a person on the other end. The matcher is live now and reads the same departure data.",
  path: "/plan",
});

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Plan my trek"
      title="Tell us your constraints."
      body="A longer planning conversation than the matcher on the homepage, with a person on the other end. The matcher is live now and reads the same departure data."
    />
  );
}
