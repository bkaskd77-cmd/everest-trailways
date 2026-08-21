import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Price transparency",
  description:
    "How a price is built, what is in it and what is not. Every departure already publishes its inclusions, its exclusions and its single supplement.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Price transparency"
      title="Why the number is the number."
      body="How a price is built, what is in it and what is not. Every departure already publishes its inclusions, its exclusions and its single supplement."
    />
  );
}
