# Departures

What goes in `departures.ts`, and the rules that make the section worth having.

## What this section is for

It does not sell trips. It sells **certainty that a date will run**.

Travellers here have learned to distrust "fixed departure": the common
experience is an advertised date quietly cancelled for low numbers, or arriving
to find you are a group of one. Around half of group-departure participants are
solo travellers, and the industry guide ratio is 1:8–10. Every field below
exists to answer one question for someone deciding whether to commit: _will
this actually go?_

## Pricing

- **`priceUSD` is all-in, per person, for one solo traveller.** Not a "from"
  price, not a double-occupancy figure with a supplement added later. Hidden
  cost is the biggest complaint in this market and the fastest way to look like
  everyone else.
- **`singleSupplementUSD` is always displayed, including when it is `0`.**
  "No single supplement" is a claim worth making; silence reads as a number
  waiting to appear at checkout.
- **`priceExcludes` must be non-empty.** Every trip excludes something. An
  empty list means nobody wrote it down, not that it is all-in.
- **`costSheetHref` is required** and must lead to the itemised sheet for that
  specific departure.

## Why `minimumToRun` and `decisionDate` are public

Because they are the promise. Every operator has a threshold; almost none
publish it, which is precisely why the cancellation happens as a surprise.
Publishing both converts a risk into a contract:

> Runs at 4 · 2 more needed by 14 Sept 2026

`decisionDate` must always fall before `departsOn`. The guard enforces it.

## Status is derived, never stored

| Status       | Condition                                            |
| ------------ | ---------------------------------------------------- |
| `full`       | no seats remaining                                   |
| `closed`     | decision date passed without reaching `minimumToRun` |
| `filling`    | at or above `minimumToRun`, 3 or fewer seats left    |
| `guaranteed` | at or above `minimumToRun`                           |
| `needs-n`    | below `minimumToRun`                                 |

Never add a `status` field. `pnpm check:departures` re-derives it with a second,
independent implementation and fails if the two disagree — that is how a
contradiction between the badge and the numbers gets caught.

## `groupSoFar` privacy

Country and count only:

```ts
groupSoFar: [{ country: "Germany", count: 2 }];
```

Never names, never ages, never home towns, never anything that lets someone
identify a person who has already booked. These are real customers who did not
agree to appear on a marketing page. The guard rejects entries that look like
names and any total exceeding `seatsBooked`.

## Images

4:3, 1200px wide minimum, same swap-a-string pattern as the hero: change only
`image.src` to `/departures/<id>.jpg` once real photography lands.

## Checking

```bash
pnpm check:departures
```

Runs before every build. Fails on: empty `priceExcludes`, missing
`costSheetHref`, `seatsBooked > seatsTotal`, `minimumToRun > seatsTotal`,
`returnsOn <= departsOn`, `decisionDate` after `departsOn`, a departure in the
past, a missing `singleSupplementUSD`, name-like `groupSoFar` entries, a status
contradiction, and a malformed `/api/departures/feed.json` shape.
