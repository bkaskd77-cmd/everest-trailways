import { SectionHead } from "@/components/departure/section-head";
import type { Practicalities } from "@/content/departures";

/**
 * What it is actually like.
 *
 * Squat toilets, cold water above a certain height, paying by the hour to
 * charge a phone, no signal for a week. All true, all normal, and all of it
 * routinely left for people to discover on day four.
 *
 * The reason to publish it is not candour for its own sake. A person who knows
 * a squat toilet is coming packs for it and copes with it; a person who does
 * not feels lied to, and the feeling attaches to everything else the operator
 * said. Unglamorous accuracy is cheaper than a complaint.
 *
 * Rendered as a definition list because that is what it is — a reader arrives
 * with one specific question and needs to find it, not read an essay.
 */

const FIELDS: { key: keyof Practicalities; label: string }[] = [
  { key: "accommodation", label: "Where you sleep" },
  { key: "roomSharing", label: "Room sharing" },
  { key: "toilets", label: "Toilets" },
  { key: "showers", label: "Showers and washing" },
  { key: "food", label: "Food" },
  { key: "dietary", label: "Dietary requirements" },
  { key: "water", label: "Drinking water" },
  { key: "electricity", label: "Electricity and charging" },
  { key: "signal", label: "Signal and wifi" },
  { key: "luggage", label: "Luggage and what porters carry" },
  { key: "laundry", label: "Laundry" },
];

export function PracticalitiesSection({
  practicalities,
}: {
  practicalities: Practicalities;
}) {
  return (
    <section
      id="practicalities"
      aria-labelledby="practicalities-heading"
      className="scroll-mt-24 border-t border-border bg-band-sunk"
    >
      <div className="shell py-16 lg:py-20">
        <SectionHead
          eyebrow="Practical detail"
          title="What it is actually like."
          id="practicalities-heading"
        >
          The unglamorous answers, in advance. Nothing here is a complaint about
          Nepal — it is how these trips work, and knowing it beforehand is the
          difference between packing for it and being surprised by it.
        </SectionHead>

        {/*
          Three columns at desktop, not two.
          Two columns of a 1,425px band gave each field a 684px cell holding
          text capped at 58 characters — half of every cell was empty, which is
          the fault this page keeps making. Three narrower columns put the
          measure and the cell at roughly the same width.
        */}
        <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="min-w-0 border-t border-border pt-5">
              <dt className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-3 max-w-[46ch] text-base">
                {practicalities[key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
