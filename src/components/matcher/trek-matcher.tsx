"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Pencil, RotateCcw } from "lucide-react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { WHATSAPP_NUMBER } from "@/content/ask-source";
import {
  departureStatus,
  departures,
  formatDateRange,
  guaranteeMeta,
  type Departure,
} from "@/content/departures";
import {
  FALLBACK_QUESTIONS,
  fallbackMatch,
  parseFreeText,
  type FallbackAnswers,
} from "@/lib/matcher-fallback";
import { fadeUp } from "@/lib/motion";
import {
  MAX_QUESTIONS,
  type MatchTurn,
  type MatcherFrame,
  type MatcherQuestion,
  type MatcherResult,
} from "@/lib/matcher-types";
import { cn } from "@/lib/utils";

/**
 * The trek matcher.
 *
 * Not a chat window. There are no avatars, no bubbles, no typing dots pretending
 * to be thought — those are decoration borrowed from messaging apps, and they
 * make a tool for narrowing six departures look like a toy. What is here is a
 * question, three answers, and a record of what you have already said that you
 * can go back and change.
 *
 * The opening question is rendered locally and instantly. Nothing is sent
 * anywhere until someone answers it, which means the section costs nothing to
 * look at and has no spinner on arrival.
 *
 * If the endpoint is unreachable the same conversation continues against the
 * deterministic matcher in the browser. The panel does not have a broken state.
 */

type Step = { question: string; options: string[]; answer: string };

const OPENING: MatcherQuestion = {
  text: FALLBACK_QUESTIONS[0].text,
  options: FALLBACK_QUESTIONS[0].options.map((o) => o.label),
};

/** Answer labels the local ladder knows how to turn into structured answers. */
const PATCH_BY_LABEL = new Map<string, FallbackAnswers>(
  FALLBACK_QUESTIONS.flatMap((q) =>
    q.options.map((o) => [o.label.toLowerCase(), o.patch] as const),
  ),
);

function patchFor(answer: string): FallbackAnswers {
  return {
    ...parseFreeText(answer),
    ...(PATCH_BY_LABEL.get(answer.trim().toLowerCase()) ?? {}),
  };
}

/** Which structured answer each rung of the local ladder is trying to fill. */
const LADDER_KEY: Record<string, keyof FallbackAnswers> = {
  maxDays: "maxDays",
  month: "months",
  altitudeCeilingM: "altitudeCeilingM",
  fitness: "fitness",
  intent: "intent",
};

/**
 * The next question the local ladder still needs.
 *
 * Skips anything already asked and anything a free-text answer has already
 * covered — someone who types "nine days in October" should not then be asked
 * how many days they have. This is the deterministic half of "adapts its
 * follow-ups"; when the assistant is answering, it does the adapting itself.
 */
function nextLadderQuestion(
  answers: FallbackAnswers,
  steps: Step[],
): MatcherQuestion | null {
  const askedText = new Set(steps.map((s) => s.question));
  const question = FALLBACK_QUESTIONS.find(
    (q) =>
      !askedText.has(q.text) && answers[LADDER_KEY[String(q.id)]] === undefined,
  );
  return question
    ? { text: question.text, options: question.options.map((o) => o.label) }
    : null;
}

const byId = new Map(departures.map((d) => [d.id, d]));

export function TrekMatcher() {
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [question, setQuestion] = React.useState<MatcherQuestion | null>(
    OPENING,
  );
  const [answers, setAnswers] = React.useState<FallbackAnswers>({});
  const [turns, setTurns] = React.useState<MatchTurn[]>([]);
  const [streamed, setStreamed] = React.useState("");
  const [result, setResult] = React.useState<MatcherResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const inFlight = React.useRef<AbortController | null>(null);
  const asked = steps.length;

  const reset = React.useCallback(() => {
    inFlight.current?.abort();
    setSteps([]);
    setQuestion(OPENING);
    setAnswers({});
    setTurns([]);
    setStreamed("");
    setResult(null);
    setBusy(false);
    setNotice(null);
    setDraft("");
  }, []);

  /**
   * Settle a turn.
   *
   * The deterministic matcher answers in one shot, so on its own it would turn
   * a five-question conversation into a single question and a verdict. When it
   * is the one answering, the local ladder carries the conversation instead and
   * its verdict is held back until there is nothing useful left to ask.
   */
  const finish = React.useCallback(
    (
      resolved: MatcherResult,
      nextAnswers: FallbackAnswers,
      nextSteps: Step[],
    ) => {
      const capped = nextSteps.length >= MAX_QUESTIONS;
      const follow =
        resolved.source === "fallback"
          ? nextLadderQuestion(nextAnswers, nextSteps)
          : resolved.done
            ? null
            : resolved.question;

      if (!capped && follow) {
        setResult(null);
        setQuestion(follow);
        return;
      }
      setResult(resolved);
      setQuestion(null);
    },
    [],
  );

  const send = React.useCallback(
    async (
      nextTurns: MatchTurn[],
      nextAnswers: FallbackAnswers,
      nextSteps: Step[],
    ) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setBusy(true);
      setStreamed("");
      setResult(null);
      setQuestion(null);
      setNotice(null);

      try {
        const response = await fetch("/api/match", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ turns: nextTurns, answers: nextAnswers }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          setNotice(
            "That is more questions than we allow from one place in five minutes. Message us directly and a person will pick it up.",
          );
          // Rate limited: stop asking and give them the answer we already have.
          setResult(fallbackMatch(nextAnswers));
          setQuestion(null);
          setBusy(false);
          return;
        }
        if (!response.ok || !response.body) throw new Error("unavailable");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let final: MatcherResult | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
            if (!line) continue;

            let frame: MatcherFrame;
            try {
              frame = JSON.parse(line) as MatcherFrame;
            } catch {
              continue;
            }
            if (frame.t === "delta") setStreamed((s) => s + frame.v);
            else if (frame.t === "error") setNotice(frame.v);
            else if (frame.t === "result") final = frame.result;
          }
        }

        const resolved = final ?? fallbackMatch(nextAnswers);
        setStreamed("");
        finish(resolved, nextAnswers, nextSteps);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setNotice(
          "We could not reach the assistant, so this is our own matcher answering.",
        );
        setStreamed("");
        finish(fallbackMatch(nextAnswers), nextAnswers, nextSteps);
      } finally {
        setBusy(false);
      }
    },
    [finish],
  );

  const answerWith = React.useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || busy || !question) return;

      const nextSteps: Step[] = [
        ...steps,
        { question: question.text, options: question.options, answer: clean },
      ];
      const nextAnswers = { ...answers, ...patchFor(clean) };
      const nextTurns: MatchTurn[] = [
        ...turns,
        { role: "assistant", content: question.text },
        { role: "user", content: clean },
      ];

      setSteps(nextSteps);
      setAnswers(nextAnswers);
      setTurns(nextTurns);
      setDraft("");
      void send(nextTurns, nextAnswers, nextSteps);
    },
    [answers, busy, question, send, steps, turns],
  );

  /** Rewind to a chip and ask it again. Everything after it is discarded. */
  const editStep = React.useCallback(
    (index: number) => {
      inFlight.current?.abort();
      const keptSteps = steps.slice(0, index);
      const rewound = steps[index];

      setSteps(keptSteps);
      setTurns(turns.slice(0, index * 2));
      setAnswers(
        keptSteps.reduce<FallbackAnswers>(
          (acc, step) => ({ ...acc, ...patchFor(step.answer) }),
          {},
        ),
      );
      setResult(null);
      setStreamed("");
      setNotice(null);
      setBusy(false);
      setDraft(rewound.answer);
      setQuestion({ text: rewound.question, options: rewound.options });
    },
    [steps, turns],
  );

  React.useEffect(() => () => inFlight.current?.abort(), []);

  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-8">
      {/* What has been said, as chips you can go back and change. */}
      {steps.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <li key={`${step.question}-${index}`}>
              <button
                type="button"
                onClick={() => editStep(index)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <Pencil aria-hidden className="size-3 shrink-0" />
                <span className="sr-only">
                  Change your answer to “{step.question}”:{" "}
                </span>
                {step.answer}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The live region. Given a floor so a streamed answer cannot push the
          controls down the page as it arrives. */}
      <div aria-live="polite" aria-atomic="false" className="min-h-24">
        {busy && !streamed && (
          <p className="text-sm text-muted-foreground">
            Reading the departures…
          </p>
        )}

        {streamed && <p className="text-lg text-pretty">{streamed}</p>}

        {result && !streamed && (
          <m.p
            data-motion
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-lg text-pretty"
          >
            {result.message}
          </m.p>
        )}

        {question && !busy && (
          <m.p
            data-motion
            key={question.text}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-2xl tracking-tight text-balance"
          >
            {question.text}
          </m.p>
        )}
      </div>

      {notice && (
        <p className="mt-3 border-l-2 border-border pl-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {/* Matches. Compact, but carrying the same guarantee and price the full
          card carries — a summary that quietly drops the caveats would undo the
          point of the section above it. */}
      {result && result.matches.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {result.matches.map((match) => {
            const departure = byId.get(match.id);
            if (!departure) return null;
            return (
              <MatchCard
                key={match.id}
                departure={departure}
                reason={match.reason}
                caution={match.caution}
              />
            );
          })}
        </ul>
      )}

      {/* The three tappable answers, plus free text — always both. */}
      {question && !busy && (
        <div className="mt-6">
          {question.options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => answerWith(option)}
                  // py-2.5 rather than py-2: 44px, the smallest target that is
                  // reliably hit with a thumb on a phone held one-handed.
                  className="min-h-11 cursor-pointer rounded-full border border-border px-4 py-2.5 text-sm transition-colors hover:border-foreground/40 hover:bg-muted"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              answerWith(draft);
            }}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <label className="flex-1">
              <span className="sr-only">Or answer in your own words</span>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Or answer in your own words"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </label>
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
          <p className="mt-2 tabular text-xs text-muted-foreground">
            Question {Math.min(asked + 1, MAX_QUESTIONS)} of at most{" "}
            {MAX_QUESTIONS}
          </p>
        </div>
      )}

      {/* Both escapes, at every stage. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <RotateCcw aria-hidden className="size-3.5 shrink-0" />
          Start over
        </button>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
            "Hello — I would rather talk to a person about which trek fits.",
          )}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <MessageCircle aria-hidden className="size-3.5 shrink-0" />
          Talk to a human instead
        </a>
      </div>
    </div>
  );
}

function MatchCard({
  departure,
  reason,
  caution,
}: {
  departure: Departure;
  reason: string;
  caution: string;
}) {
  const status = departureStatus(departure);

  return (
    <li className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display text-xl tracking-tight">
          {departure.trekName}
        </h4>
        <p className="font-display tabular text-xl tracking-tight">
          ${departure.priceUSD.toLocaleString("en-GB")}
        </p>
      </div>

      <p className="tabular text-sm text-muted-foreground">
        {formatDateRange(departure.departsOn, departure.returnsOn)} ·{" "}
        {departure.days} days · {departure.maxAltitudeM.toLocaleString("en-GB")}{" "}
        m
      </p>

      <p
        className={cn(
          "mt-2 tabular text-xs",
          status === "guaranteed" || status === "filling"
            ? "text-verified"
            : "text-muted-foreground",
        )}
      >
        {guaranteeMeta(departure)}
      </p>

      <p className="mt-3 text-sm">{reason}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caution}</p>

      <Link
        href={`/departures/${departure.id}`}
        className="group/link mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-prayer-deep dark:text-prayer-light"
      >
        The full departure
        <ArrowRight
          aria-hidden
          className="size-3 transition-transform duration-200 group-hover/link:translate-x-[3px]"
        />
      </Link>
    </li>
  );
}
