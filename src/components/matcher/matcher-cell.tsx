"use client";

import * as React from "react";
import { Compass, X } from "lucide-react";
import * as m from "motion/react-m";

import { CARD_TRACKS } from "@/components/departures/departure-card";
import { TrekMatcher } from "@/components/matcher/trek-matcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { LAYOUT, fadeUp } from "@/lib/motion";
import { NO_STORAGE_NOTICE } from "@/lib/matcher-types";
import { cn } from "@/lib/utils";

/**
 * The matcher, as the seventh cell of the departures grid.
 *
 * It used to be its own section between the trust band and the grid, which was
 * wrong twice over: three stacked text blocks in a row read like a news site,
 * and it asked someone to describe their fitness and altitude history before
 * they had seen a single departure worth the trouble. Here it is the thing you
 * reach for *after* six cards have failed to fit — which is the only moment the
 * question "none of these six fit?" makes any sense.
 *
 * It takes a card's cell and a card's row tracks so the grid stays even, but it
 * is inverted onto summit rather than sitting on the card surface: it is an
 * instrument for narrowing the six, not a seventh thing to buy.
 *
 * Three behaviours by width, because "expand in place" means different things
 * in a three-column grid and on a phone:
 *
 *   ≥1280px — the cell grows to span all three columns, in place. It is the
 *   last row, so nothing above it moves. Motion's layout projection animates
 *   the box from one to the other, so it reads as one cell growing rather than
 *   a small thing disappearing and a large thing appearing.
 *
 *   768–1279px — already full width as a block after the last card; expanding
 *   just makes it taller.
 *
 *   <768px — opens in a bottom sheet. A conversation that grows a phone page by
 *   several screens, under six cards someone has already scrolled past, is a
 *   scroll position nobody can recover from.
 */
export function MatcherCell() {
  const [open, setOpen] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);
  const cell = React.useRef<HTMLLIElement>(null);

  /**
   * Match the height of the card beside it.
   *
   * Six cards in three columns is two full rows, so the seventh cell is alone
   * in a third — its row tracks are sized by its own content and there is no
   * sibling to level against. Left to itself it came out about a quarter of a
   * card tall, which is exactly the uneven grid this is supposed to avoid.
   *
   * So it measures the last card cell and holds itself to that. Written to a
   * custom property rather than to `style.height` so the CSS still owns when it
   * applies — collapsed, at xl, and nowhere else. Set imperatively rather than
   * through React state because Motion owns this element's style attribute for
   * the layout animation, and a `style` prop it does not manage gets dropped.
   */
  React.useLayoutEffect(() => {
    const node = cell.current;
    const sibling = node?.previousElementSibling;
    if (!node || !(sibling instanceof HTMLElement)) return;
    const observer = new ResizeObserver(() => {
      const height = Math.round(sibling.getBoundingClientRect().height);
      if (height > 0) node.style.setProperty("--card-h", `${height}px`);
    });
    observer.observe(sibling);
    return () => observer.disconnect();
  }, []);

  // Read at the moment of the click rather than during render: a media query in
  // render is a different answer on the server than in the browser.
  const start = () => {
    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    setSheet(isPhone);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSheet(false);
  };

  const expandedInline = open && !sheet;

  return (
    <>
      <m.li
        ref={cell}
        data-motion
        layout
        variants={fadeUp}
        transition={LAYOUT}
        className={cn(
          CARD_TRACKS,
          // Full width below xl whatever the state; at xl it is one cell until
          // it is opened, and all three once it is.
          "md:col-span-2",
          expandedInline ? "xl:col-span-3" : "xl:col-span-1",
        )}
      >
        <m.div
          data-motion
          layout
          transition={LAYOUT}
          className={cn(
            // `on-summit` re-points the semantic colour tokens at the dark
            // palette for everything inside, in both themes — see globals.css.
            // Without it every child would need an inverted variant of its own.
            // The hairline is load-bearing in dark mode: summit on the sunk
            // departures band is a 1.08:1 edge, which is no edge at all.
            "row-span-9 flex flex-col overflow-hidden rounded-lg border border-glacier/15 bg-summit text-glacier on-summit",
            expandedInline
              ? "p-6 lg:p-8"
              : "p-5 xl:min-h-[var(--card-h,0px)] xl:justify-between",
          )}
        >
          {expandedInline ? (
            <Expanded onClose={close} />
          ) : (
            <Collapsed onStart={start} />
          )}
        </m.div>
      </m.li>

      <Sheet open={open && sheet} onOpenChange={(next) => !next && close()}>
        <SheetContent
          side="bottom"
          className="h-[88svh] overflow-y-auto border-t-0 bg-summit text-glacier on-summit"
        >
          <div className="px-5 pt-6 pb-10">
            <SheetTitle className="font-display text-2xl tracking-tight">
              None of these six fit?
            </SheetTitle>
            <SheetDescription className="text-sm">
              {NO_STORAGE_NOTICE}
            </SheetDescription>
            <div className="mt-6">
              <TrekMatcher chrome={false} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Collapsed({ onStart }: { onStart: () => void }) {
  return (
    <m.div data-motion layout="position" className="flex h-full flex-col">
      <span
        aria-hidden
        className="inline-flex size-11 items-center justify-center rounded-full bg-glacier/10 text-glacier"
      >
        <Compass className="size-5" />
      </span>

      <h3 className="mt-5 font-display text-2xl tracking-tight text-balance">
        None of these six fit?
      </h3>
      <p className="mt-3 max-w-[38ch] text-sm text-glacier/70">
        Tell us your days, fitness and altitude experience — we&rsquo;ll tell
        you which departures actually work.
      </p>

      <div className="mt-auto pt-6">
        <Button onClick={onStart} size="sm">
          Find what fits
        </Button>
      </div>
    </m.div>
  );
}

function Expanded({ onClose }: { onClose: () => void }) {
  return (
    <m.div data-motion layout="position">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="font-display text-2xl tracking-tight lg:text-3xl">
            Tell us your constraints. We&rsquo;ll tell you what fits.
          </h3>
          <p className="mt-2 max-w-[60ch] text-sm text-glacier/70">
            It reads the same live departure data as the cards beside it — the
            same seats, dates and thresholds. {NO_STORAGE_NOTICE}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="-mt-1 -mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-glacier/70 transition-colors hover:bg-glacier/10 hover:text-glacier"
        >
          <X aria-hidden className="size-4" />
          <span className="sr-only">Close the matcher</span>
        </button>
      </div>

      <div className="mt-6">
        <TrekMatcher chrome={false} />
      </div>
    </m.div>
  );
}
