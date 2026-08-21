import type { Metadata } from "next";

import { Forthcoming } from "@/components/layout/forthcoming";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description:
    "Ours and yours, in plain terms. The half that matters most is already published: if a departure does not reach its minimum, you are refunded in full.",
  alternates: { canonical: "/cancellation" },
};

export default function Page() {
  return (
    <Forthcoming
      eyebrow="Cancellation policy"
      title="What happens if plans change."
      body="Ours and yours, in plain terms. The half that matters most is already published: if a departure does not reach its minimum, you are refunded in full."
    />
  );
}
