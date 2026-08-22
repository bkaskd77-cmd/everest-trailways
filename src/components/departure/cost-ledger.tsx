"use client";

import * as React from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ChevronDown } from "lucide-react";

import { DURATION, EASE, REVEAL_VIEWPORT } from "@/lib/motion";
import type { CostLine } from "@/content/departures";
import { cn } from "@/lib/utils";

/**
 * The ledger.
 *
 * A table, not cards. Someone reading this is auditing us — they want to run
 * their eye down a column of figures and see it reach the number on the card.
 * Cards make that impossible: they break the column, they lose the shared
 * baseline, and they turn an accounting document into a gallery. The whole
 * rhetorical force of this section is that it looks like something an
 * accountant produced rather than something a marketing team did.
 *
 * So: tabular numerals, amounts right-aligned on a common edge, hairline rules,
 * subtotals in the same column as the lines they total, and a total row that
 * visibly equals the headline price.
 */

const CATEGORY_LABEL: Record<CostLine["category"], string> = {
  permits: "Permits and fees",
  transport: "Transport",
  accommodation: "Accommodation",
  meals: "Meals",
  staff: "Staff",
  equipment: "Equipment",
  // Not "Operating". That read as a grab-bag, and a grab-bag next to a small
  // staff number is what an operator with something to hide would produce.
  admin: "Running the company",
};

/** The order a reader expects: statutory first, ours last. */
const CATEGORY_ORDER: CostLine["category"][] = [
  "permits",
  "transport",
  "accommodation",
  "meals",
  "staff",
  "equipment",
  "admin",
];

const BASIS_LABEL: Record<CostLine["basis"], string> = {
  "per-person": "per person",
  "per-group": "per group, divided",
  "per-day": "per day",
};

const money = (n: number) => `$${n.toLocaleString("en-GB")}`;

/**
 * The arithmetic behind a line, in the basis column.
 *
 * "$38 × 3 nights" and "$35 × 12 days ÷ 4" rather than a bare "per day" beside
 * a total that is plainly not a daily figure. The basis and the amount agreed
 * on paper before and did not agree on screen, which is the sort of small
 * incoherence that makes a reader stop trusting the arithmetic they cannot see.
 */
function derivation(line: CostLine): string {
  const { unitAmountUSD, unitCount, unitLabel, dividedBy } = line;

  if (unitAmountUSD === undefined || unitCount === undefined) {
    return BASIS_LABEL[line.basis];
  }

  const unit =
    unitCount === 1 && unitLabel === "set"
      ? money(unitAmountUSD)
      : `${money(unitAmountUSD)} × ${unitCount} ${unitLabel}${unitCount === 1 ? "" : "s"}`;

  return dividedBy ? `${unit} ÷ ${dividedBy}` : unit;
}

function group(lines: CostLine[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    lines: lines.filter((l) => l.category === category),
  })).filter((g) => g.lines.length > 0);
}

/**
 * One row.
 *
 * The reveal is a 12px lift over 0.28s, staggered 0.04s down the table. Fast
 * enough that a reader scrolling normally sees a settled table rather than an
 * animation; slow enough that the eye registers the rows as a sequence and
 * follows them downward, which is the direction you read a ledger in.
 */
function Row({
  line,
  index,
  total,
}: {
  line: CostLine;
  index: number;
  total: number;
}) {
  return (
    <m.tr
      data-motion
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{
        duration: DURATION.fast,
        ease: EASE,
        delay: Math.min(index * 0.04, 0.5),
      }}
      className="border-t border-border/60"
    >
      <th scope="row" className="py-3 pr-4 text-left align-top font-normal">
        <span className="block text-sm">{line.label}</span>
        {line.note && (
          <span className="mt-1 block max-w-[52ch] text-xs text-muted-foreground">
            {line.note}
          </span>
        )}
        {line.payableTo && (
          <span className="mt-1 block text-xs text-muted-foreground">
            Paid to {line.payableTo}
          </span>
        )}
      </th>
      <td className="hidden py-3 pr-4 align-top tabular text-xs whitespace-nowrap text-muted-foreground sm:table-cell">
        {derivation(line)}
      </td>
      <td className="py-3 text-right align-top tabular text-sm whitespace-nowrap">
        {total === 0 ? (
          <span className="text-muted-foreground">varies</span>
        ) : (
          money(line.amountUSD)
        )}
      </td>
    </m.tr>
  );
}

/**
 * A subtotal for a group whose amounts are all unquantified.
 *
 * The not-included table carries lines we cannot price — international flights
 * from an unknown airport, gear you may already own — and those sit at zero so
 * they do not distort a total. Rendering that zero as "$0" told the reader the
 * category was free, which is the opposite of what it means.
 */
function subtotalLabel(lines: CostLine[]): string {
  const total = lines.reduce((sum, l) => sum + l.amountUSD, 0);
  if (total > 0) return money(total);
  return lines.every((l) => l.amountUSD === 0) ? "varies" : money(total);
}

function CategoryBlock({
  label,
  lines,
  startIndex,
  collapsible,
}: {
  label: string;
  lines: CostLine[];
  startIndex: number;
  collapsible: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  const headingId = `cost-group-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <tbody className="border-t-2 border-foreground/15">
      <tr>
        <th
          scope="colgroup"
          colSpan={2}
          className="pt-6 pb-2 text-left text-xs tracking-[0.18em] uppercase"
        >
          {collapsible ? (
            <button
              type="button"
              id={headingId}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex cursor-pointer items-center gap-1.5 tracking-[0.18em] uppercase hover:text-muted-foreground"
            >
              {label}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  !open && "-rotate-90",
                )}
              />
            </button>
          ) : (
            label
          )}
        </th>
        <td className="pt-6 pb-2 text-right tabular text-xs text-muted-foreground">
          {subtotalLabel(lines)}
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {open &&
          lines.map((line, i) => (
            <Row
              key={line.id}
              line={line}
              index={startIndex + i}
              total={line.amountUSD}
            />
          ))}
      </AnimatePresence>
    </tbody>
  );
}

export function CostLedger({
  lines,
  priceUSD,
  caption,
  collapsible = true,
  className,
}: {
  lines: CostLine[];
  /** When given, a total row is drawn and shown to equal this figure. */
  priceUSD?: number;
  caption: string;
  collapsible?: boolean;
  className?: string;
}) {
  const groups = group(lines);

  // The stagger delay is a position in the whole table, not within a group, so
  // each group needs to know how many rows precede it. Computed up front rather
  // than accumulated during render: a counter mutated while React renders is
  // wrong under concurrent rendering and the lint rule is right to refuse it.
  const offsets: number[] = [];
  groups.reduce((total, g) => {
    offsets.push(total);
    return total + g.lines.length;
  }, 0);

  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col />
        <col className="w-48" />
        <col className="w-28" />
      </colgroup>

      {groups.map((g, i) => (
        <CategoryBlock
          key={g.category}
          label={g.label}
          lines={g.lines}
          startIndex={offsets[i]}
          collapsible={collapsible}
        />
      ))}

      {priceUSD !== undefined && (
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-6">
              {/*
                The rule under the total draws itself, once, a beat after the
                rows have settled. It is the only decorative motion in the
                section and it exists to make the eye stop where the arithmetic
                stops.
              */}
              <m.div
                data-motion
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={REVEAL_VIEWPORT}
                transition={{
                  duration: DURATION.base,
                  ease: EASE,
                  delay: 0.35,
                }}
                style={{ transformOrigin: "left" }}
                className="h-px w-full bg-foreground"
              />
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-4 text-left">
              <span className="font-display text-xl tracking-tight">
                Total, per person
              </span>
            </th>
            <td className="hidden sm:table-cell" />
            <td className="py-4 text-right font-display tabular text-2xl tracking-tight whitespace-nowrap">
              {money(priceUSD)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
