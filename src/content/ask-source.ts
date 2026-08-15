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
