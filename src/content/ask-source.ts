import {
  departureStatus,
  formatDate,
  seatsToGuarantee,
  type Departure,
} from "@/content/departures";

/**
 * Where the ask panel's answers come from.
 *
 * Deliberately an interface with a single stub implementation. Step 5 replaces
 * `cannedAskSource` with an assistant that has the full departure context; the
 * panel does not change, because it only ever knew about this shape.
 *
 * Answers are written from the departure's own data rather than stored prose,
 * so they cannot drift out of step with the numbers on the card.
 */
export type AskQuestion = { id: string; label: string };

export type AskSource = {
  /** Identifies the implementation in the UI and in future analytics. */
  kind: "canned" | "assistant";
  questions: AskQuestion[];
  answer: (questionId: string, departure: Departure) => string;
  /**
   * Streams an answer, calling `onDelta` with each new fragment and resolving
   * with the whole thing. Optional: a source that only has canned prose does
   * not implement it, and the panel falls back to `answer`.
   */
  answerStream?: (
    input: { questionId?: string; text: string; departure: Departure },
    onDelta: (fragment: string) => void,
    signal?: AbortSignal,
  ) => Promise<string>;
};

/**
 * Published, specific, and checkable — the same standard as every other claim
 * on the site. "Fast response" would mean nothing here.
 */
export const RESPONSE_COMMITMENT = "We reply within 4 hours, 06:00–22:00 NPT";

/** WhatsApp is the channel this market actually uses. */
export const WHATSAPP_NUMBER = "+9779800000000";

export const cannedAskSource: AskSource = {
  kind: "canned",
  questions: [
    { id: "fitness", label: "What fitness does this need?" },
    { id: "altitude", label: "What is the altitude profile?" },
    { id: "minimum", label: "What if it does not reach the minimum?" },
    { id: "insurance", label: "What insurance do I need?" },
  ],
  answer(questionId, d) {
    switch (questionId) {
      case "fitness":
        return `${d.days} days of walking, rated ${d.difficulty}. Most days are 5–7 hours on trail with a daypack; porters carry the rest. If you can walk a hilly 15 km day back to back, you are ready for this one.`;
      case "altitude":
        return `The high point is ${d.maxAltitudeM.toLocaleString("en-GB")} m.${
          d.assistantGuideAbove
            ? ` A second guide joins the group above ${d.assistantGuideAbove.toLocaleString("en-GB")} m.`
            : ""
        } The itinerary is built around acclimatisation days rather than speed, and the guide ratio is ${d.guideRatio}.`;
      case "minimum": {
        const status = departureStatus(d);
        const needed = seatsToGuarantee(d);
        if (status === "needs-n") {
          return `This departure runs at ${d.minimumToRun} bookings. It currently has ${d.seatsBooked} and needs ${needed} more. We decide by ${formatDate(d.decisionDate)} and tell you that day either way. If it does not run, you are refunded in full — not credited, not transferred without your say-so.`;
        }
        return `It has already passed its minimum of ${d.minimumToRun}, so it runs regardless of further bookings. Had it not, we would have told you by ${formatDate(d.decisionDate)} and refunded you in full.`;
      }
      case "insurance":
        return `You need travel insurance that covers trekking to ${d.maxAltitudeM.toLocaleString("en-GB")} m and helicopter evacuation. We do not sell it and take no commission on it. Send us the policy and we will tell you plainly whether it covers this trip.`;
      default:
        return "";
    }
  },
};

/**
 * The same endpoint the trek matcher uses, scoped to one departure.
 *
 * There is deliberately no second prompt: `/api/match` builds its system prompt
 * from `buildSystemPrompt({ departureId })`, so the hard constraints that
 * govern the matcher govern this panel too. A separate "ask about this trip"
 * prompt would be a second place for those rules to drift.
 *
 * `answer` still returns the canned prose, which is what the panel shows if the
 * request fails or the assistant is unavailable — the panel is never empty.
 */
export const assistantAskSource: AskSource = {
  kind: "assistant",
  questions: cannedAskSource.questions,
  answer: cannedAskSource.answer,
  async answerStream({ questionId, text, departure }, onDelta, signal) {
    const response = await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        turns: [{ role: "user", content: text }],
        scope: { departureId: departure.id, questionId },
      }),
      signal,
    });

    if (!response.ok || !response.body) throw new Error("unavailable");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamed = "";
    let final = "";

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
        try {
          const frame = JSON.parse(line) as {
            t: string;
            v?: string;
            result?: { message?: string };
          };
          if (frame.t === "delta" && frame.v) {
            streamed += frame.v;
            onDelta(frame.v);
          } else if (frame.t === "result" && frame.result?.message) {
            final = frame.result.message;
          }
        } catch {
          continue;
        }
      }
    }

    return final || streamed;
  },
};
