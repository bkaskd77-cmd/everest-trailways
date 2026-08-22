"use client";

import * as React from "react";
import * as m from "motion/react-m";
import { Plus } from "lucide-react";

import type { Faq } from "@/content/departures";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The questions people are embarrassed to ask.
 *
 * What if I cannot keep up. What if I do not get on with the group. What
 * happens to my money. An FAQ that only answers the comfortable ones is
 * marketing with a chevron on it, and a reader can tell within two questions
 * which kind they are looking at.
 *
 * Every answer is departure-specific and quotes this date's own numbers, so it
 * cannot drift out of step with the cost sheet further up the same page —
 * `check:departures` re-reads the figures out of the answers and fails if one
 * of them contradicts the departure.
 *
 * Every answer is in the DOM whether or not its item is open. A collapsed
 * answer is hidden with `height`, never unmounted: search engines, assistants
 * and Ctrl+F all need the text to be there.
 */

function Item({
  faq,
  index,
  open,
  onToggle,
}: {
  faq: Faq;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <li className="border-t border-border">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left"
        >
          <span className="max-w-[52ch] text-base font-medium">
            {faq.question}
          </span>
          <Plus
            aria-hidden
            className={cn(
              "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-45",
            )}
          />
        </button>
      </h3>

      {/*
        Always rendered, never conditional.
        The obvious implementation mounts the answer when the item opens, which
        means eleven of the twelve answers are absent from the document at any
        moment — invisible to Ctrl+F, to a crawler, and to an assistant quoting
        us. The panel is always in the DOM and its height is animated instead.
      */}
      <m.div
        data-motion
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: DURATION.fast, ease: EASE }}
        className="overflow-hidden"
      >
        <p className="max-w-[68ch] pb-6 text-base text-muted-foreground">
          {faq.answer}
        </p>
      </m.div>
    </li>
  );
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  // Nothing open to begin with: the questions are the index, and a reader
  // scanning for their own worry wants the list, not the first answer.
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <ul className="mt-12 border-b border-border lg:mt-16">
      {faqs.map((faq, i) => (
        <Item
          key={faq.question}
          faq={faq}
          index={i}
          open={open === i}
          onToggle={() => setOpen(open === i ? null : i)}
        />
      ))}
    </ul>
  );
}
