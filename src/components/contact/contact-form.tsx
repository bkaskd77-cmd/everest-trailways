"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { CONTACT, SUBJECTS, localHours } from "@/content/contact";

/**
 * Three fields, and the reason there are only three.
 *
 * What it is about, what you want to know, and how to reach you. Nothing else
 * is asked because nothing else is needed to reply, and every extra field on a
 * public form is data that then has to be stored, secured and deleted on a
 * schedule. Passport, date of birth and address are collected after a
 * confirmed booking, uploaded straight to encrypted storage, and never through
 * a page anybody can load.
 *
 * The office hours are rendered in NPT on the server and re-rendered with the
 * reader's own offset once mounted. Nepal is UTC+05:45 and those forty-five
 * minutes are exactly what makes somebody mis-time a message.
 */
/* The value is fixed for the life of the page, so there is nothing to watch. */
const subscribeToNothing = () => () => {};

let cachedLocalHours: ReturnType<typeof localHours> | null | undefined;

/**
 * Cached because `getSnapshot` must return a stable reference — a fresh object
 * each call makes React believe the store changed on every render.
 *
 * `getTimezoneOffset` is minutes BEHIND UTC, so the sign is inverted.
 */
function readLocalHours() {
  if (cachedLocalHours === undefined) {
    cachedLocalHours =
      typeof window === "undefined"
        ? null
        : localHours(-new Date().getTimezoneOffset());
  }
  return cachedLocalHours;
}

export function ContactForm() {
  const [state, setState] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = React.useState<string>("");
  /*
   * The reader's own hours, which only exist on the client.
   *
   * `useSyncExternalStore` rather than an effect that calls `setState`: the
   * value never changes after mount, so subscribing to nothing and returning
   * `null` on the server is exactly what it describes. Setting state in an
   * effect for this would render twice and trip React's own lint rule about
   * cascading renders, which is the rule being right.
   */
  const local = React.useSyncExternalStore(
    subscribeToNothing,
    readLocalHours,
    () => null,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");

    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: data.get("subject"),
        message: data.get("message"),
        reply: data.get("reply"),
        website: data.get("website"),
      }),
    }).catch(() => null);

    if (!response) {
      setState("error");
      setError("That did not send. WhatsApp reaches us either way.");
      return;
    }
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    if (response.ok && json?.ok) {
      setState("sent");
      return;
    }
    setState("error");
    setError(
      json?.error ?? "That did not send. WhatsApp reaches us either way.",
    );
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-verified/30 bg-verified/5 p-6">
        <p className="font-display text-xl tracking-tight">That is with us.</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {CONTACT.responseCommitment}. If it is urgent, WhatsApp is faster and
          reaches the same people.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <p className="text-sm text-muted-foreground">
        {CONTACT.responseCommitment}
        {local && (
          <>
            {" "}
            — that is {local.from} to {local.to} where you are
            {local.crossesMidnight ? ", crossing midnight" : ""}.
          </>
        )}
      </p>

      <div className="grid gap-2">
        <label htmlFor="subject" className="text-sm font-medium">
          What is this about?
        </label>
        <select
          id="subject"
          name="subject"
          required
          defaultValue={SUBJECTS[0]}
          className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium">
          Your question
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="The more specific it is, the faster the answer."
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="reply" className="text-sm font-medium">
          Email or WhatsApp number to reply to
        </label>
        <input
          id="reply"
          name="reply"
          required
          maxLength={200}
          className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          The only thing we keep about you, and only to answer this. We do not
          ask for your passport, your date of birth or your address here, and we
          never will on a public page.
        </p>
      </div>

      {/*
        A honeypot. Off-screen rather than `display: none`, because some
        assistive technology skips the latter and some bots check for it.
      */}
      <div
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p role="alert" className="text-sm text-prayer-deep">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" size="lg" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send it"}
        </Button>
      </div>
    </form>
  );
}
