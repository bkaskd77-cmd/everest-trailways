"use client";

import * as m from "motion/react-m";

import { TrekMatcher } from "@/components/matcher/trek-matcher";
import { NO_STORAGE_NOTICE } from "@/lib/matcher-types";
import { fadeUp } from "@/lib/motion";

/**
 * The matcher, closing the departures grid.
 *
 * It used to be its own section above the grid, which asked someone to describe
 * their fitness and altitude history before they had seen a departure worth the
 * trouble. It then spent a version as a collapsed card you had to click to open
 * — which was worse in a different way: a tall dark tile that told you nothing
 * about itself and charged a click to find out. Nobody pays that toll to
 * discover what a panel is for.
 *
 * So it is open. The first question is on screen at first sight, the heading
 * says what it is, and answering it is the only interaction there is. It spans
 * the full width of the grid as its own row, a little clear of the last card
 * but plainly still part of the same block.
 *
 * The surface is juniper rather than summit. Summit is the hero's near-black,
 * and against a warm off-white page under six white cards it read as a hole
 * punched in the layout rather than as an instrument sitting on it.
 */
export function MatcherCell() {
  return (
    <m.li data-motion variants={fadeUp} className="col-span-full">
      <div className="mt-4 rounded-lg border border-glacier/15 bg-juniper p-6 text-glacier on-instrument lg:mt-6 lg:p-8">
        <p className="text-xs tracking-[0.24em] text-glacier/60 uppercase">
          Trek matcher
        </p>
        <h3 className="mt-3 font-display text-2xl tracking-tight text-balance lg:text-3xl">
          None of these six fit?
        </h3>
        <p className="mt-3 max-w-[62ch] text-sm text-glacier/70">
          Tell us your days, fitness and altitude experience and we&rsquo;ll
          tell you which departures actually work. It reads the same live data
          as the cards above — the same seats, dates and thresholds.{" "}
          {NO_STORAGE_NOTICE}
        </p>

        <div className="mt-7">
          <TrekMatcher chrome={false} />
        </div>
      </div>
    </m.li>
  );
}
