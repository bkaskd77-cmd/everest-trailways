"use client";

import * as React from "react";
import { MessageCircle, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  RESPONSE_COMMITMENT,
  WHATSAPP_NUMBER,
  cannedAskSource,
  type AskSource,
} from "@/content/ask-source";
import {
  departureStatus,
  formatDateRange,
  type Departure,
} from "@/content/departures";

/**
 * "Ask about this departure".
 *
 * Deliberately the quietest of the three actions: a text link below the two
 * buttons, not beside them. Someone who is ready to book should not have to
 * step past a support affordance to do it.
 *
 * The panel takes its content from an `AskSource`. Today that is a canned
 * implementation reading the departure's own numbers; Step 5 swaps in an
 * assistant with the full context and this component does not change.
 */
export function AskPanel({
  departure,
  source = cannedAskSource,
}: {
  departure: Departure;
  source?: AskSource;
}) {
  const [open, setOpen] = React.useState(false);
  const [asked, setAsked] = React.useState<string | null>(null);
  const status = departureStatus(departure);

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hello — I have a question about ${departure.trekName}, departing ${departure.departsOn}.`,
  )}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <MessageSquare aria-hidden className="size-3.5 shrink-0" />
          Ask about this departure
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[85svh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-w-md sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right"
      >
        <div className="px-6 pt-6 pb-10">
          <SheetTitle className="font-display text-2xl tracking-tight">
            {departure.trekName}
          </SheetTitle>
          <SheetDescription className="tabular text-sm">
            {formatDateRange(departure.departsOn, departure.returnsOn)} ·{" "}
            {status === "needs-n"
              ? `runs at ${departure.minimumToRun}`
              : status === "full"
                ? "fully booked"
                : "guaranteed to run"}
          </SheetDescription>

          <p className="mt-5 border-y border-border py-3 text-sm font-medium text-foreground">
            {RESPONSE_COMMITMENT}
          </p>

          <p className="mt-6 text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Common questions
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {source.questions.map((question) => (
              <div key={question.id}>
                <button
                  type="button"
                  onClick={() =>
                    setAsked(asked === question.id ? null : question.id)
                  }
                  aria-expanded={asked === question.id}
                  className="w-full cursor-pointer rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {question.label}
                </button>
                {asked === question.id && (
                  <p className="mt-2 rounded-md bg-muted/60 p-3 text-sm text-foreground">
                    {source.answer(question.id, departure)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* WhatsApp sits level with the form, not beneath it — it is the
              channel this market actually uses. */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="w-full">
              <a href={whatsappHref} target="_blank" rel="noreferrer noopener">
                <MessageCircle aria-hidden />
                WhatsApp us
              </a>
            </Button>
            <Button asChild className="w-full">
              <a
                href={`mailto:hello@everesttrailways.com?subject=${encodeURIComponent(departure.trekName)}`}
              >
                Email a question
              </a>
            </Button>
          </div>

          <label className="mt-6 block">
            <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Or write it here
            </span>
            <textarea
              rows={4}
              name="question"
              placeholder="Anything you want to know before committing."
              className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </label>

          <p className="mt-4 text-xs text-muted-foreground">
            No obligation, and no payment at this stage. Asking a question does
            not hold a seat.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
