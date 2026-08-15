# Trust claims

What may appear in the strip beneath the hero, and what may not.

## Why this file has rules

Nepal's trekking market has a specific fraud pattern: a polished website,
attractive prices, a deposit taken, nobody reachable on arrival. A new company
is indistinguishable from that on first landing. Assurance does not help —
every scam site claims transparent pricing and licensed guides. Only claims a
stranger can check without contacting us carry any signal.

## What qualifies as a claim

A point belongs here only if all four hold:

1. **A stranger can settle it without asking us.** A public register, a
   published document, a named person. If the only proof is our own say-so, it
   is not a trust point.
2. **It has a `verify` link.** The type requires one. No proof, no claim.
3. **The figure is specific.** "1:4", "100%", "0" — not "low", "full", "none".
4. **The body is one sentence and survives being read by a sceptic.**

## The absolute rule

**Never invent a registration, licence or membership number.** Not as a
realistic placeholder, not to see how the layout sits, not temporarily. A
fabricated credential is indistinguishable from fraud, it is checkable, and
someone will check it. Unfilled numbers are `—` and the point stays `pending`.

This is also why `check:trust` exists: the dangerous moment is not writing a
fake number, it is flipping `status` to `verified` while the number is still a
dash and forgetting.

## No adjectives in `body`

Banned: expert, world-class, unbeatable, best, premier, leading, luxury,
ultimate, exceptional, trusted, renowned, award-winning, seamless, authentic,
breathtaking, unforgettable, and the rest of `BANNED_ADJECTIVES`.

They are the vocabulary of the thing we are distinguishing ourselves from, and
none of them can be checked. Replace with the fact underneath:

> ~~Our expert guides are world-class.~~
> Every departure publishes its guide-to-trekker ratio and does not exceed it.

## Flipping a point to `verified`

1. Obtain the actual document or register entry.
2. Put the real value in `figure` (or in the body where it belongs) — the
   number as published, not a rounded version.
3. Point `verify.href` at the page where a stranger lands on the proof itself,
   not at a homepage they then have to search.
4. Set `status: "verified"`.
5. Run `pnpm check:trust`. It fails if step 2 or 3 was skipped.

## Checking

```bash
pnpm check:trust
```

Fails the build on a verified point with a placeholder, a missing or
non-absolute external href, or a banned adjective in `body`.
