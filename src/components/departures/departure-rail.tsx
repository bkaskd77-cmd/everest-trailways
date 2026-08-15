"use client";

import * as React from "react";

import { DepartureCard } from "@/components/departures/departure-card";
import { Reveal, StaggerGroup } from "@/components/motion";
import type { Departure } from "@/content/departures";

/**
 * Desktop: a snap rail showing three at a time, driven by the arrow keys.
 * Tablet: two across. Mobile: a plain vertical stack — a carousel on a phone
 * hides most of the list behind a gesture, and this market books on mobile.
 */
export function DepartureRail({ departures }: { departures: Departure[] }) {
  const ref = React.useRef<HTMLUListElement>(null);

  const scrollByCard = (direction: 1 | -1) => {
    const list = ref.current;
    if (!list) return;
    const card = list.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : 320;
    list.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <StaggerGroup
        as="ul"
        className={
          "grid grid-cols-1 gap-6 sm:grid-cols-2 " +
          // The rail only exists from lg up; below that it stays a grid.
          "lg:snap-x lg:snap-mandatory lg:auto-cols-[calc((100%-3rem)/3)] lg:grid-flow-col " +
          "lg:[scrollbar-width:none] lg:overflow-x-auto lg:pb-4 lg:[&::-webkit-scrollbar]:hidden"
        }
      >
        {departures.map((departure) => (
          <Reveal as="li" key={departure.id} className="lg:snap-start">
            <DepartureCard departure={departure} />
          </Reveal>
        ))}
      </StaggerGroup>

      {/* Right-edge fade, desktop only. Sits over the rail, never over a card's
          controls — it is inert and 4rem wide. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 lg:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--band-rgb) / 0), rgb(var(--band-rgb) / 1))",
        }}
      />

      <div className="mt-6 hidden gap-2 lg:flex">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          <span aria-hidden>←</span>
          <span className="sr-only">Previous departures</span>
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          <span aria-hidden>→</span>
          <span className="sr-only">Next departures</span>
        </button>
      </div>
    </div>
  );
}
