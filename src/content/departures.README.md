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

## Two files, not one

`treks.ts` holds the route: name, region, difficulty, guide ratio, summary,
physical demand, and the itinerary. `departures.ts` holds the date: when it
leaves, what it costs, how many seats have gone.

They are separate because two Everest dates walk the same trail. Duplicating a
twelve-day itinerary across every date on it is how the March version quietly
acquires an extra acclimatisation day the October one does not have.

A departure is written as a **seed** — `trekId`, `departsOn`, price, seats — and
`compose()` derives the rest: `days`, `returnsOn`, `decisionDate`, `slug`,
`costSheetHref`, `acclimatisationDays`, and every field copied from the trek. So
a date cannot disagree with its own route, because it does not restate it.

To add a departure, add a seed. To add a trek, add a `TrekProfile` and give it
an entry in `TREK_INTENT` — the matcher guard fails on an untagged trek, because
a trek with no intent can never be returned to anyone.

## Itinerary rules

`sleepAltitudeM` is required on every day and it is **the altitude you sleep
at**, not the day's high point. This is the field that matters: altitude illness
is governed by where you spend the night, and an itinerary that advertises its
peaks while omitting its sleeping heights has published the flattering half. Put
the day's high point in `maxAltitudeM` when the walk goes over something —
Thorong La, Kala Patthar — and leave it out when it doesn't.

**Acclimatisation days are marked and never hidden.** `isAcclimatisation: true`
puts a day on the altitude profile as a distinct marker and labels it in the
day-by-day list. An operator who removes them to make a trek look shorter and
cheaper has removed the part that keeps people well. They are counted, published,
and priced in.

**Travel days are marked and never disguised as trekking days.**
`isTravelDay: true` for a drive, a flight, or an arrival. A five-day Chitwan trip
with two travel days is a five-day trip with two travel days; calling it five
days of wildlife is the ordinary lie in this market and the reason the maximum
altitude is re-derived from walking days only.

The last day must end at a return point (`RETURN_POINTS` — Kathmandu or
Pokhara). An itinerary that ends at Lukla has ended halfway.

## Coverage floors

The matcher can only answer with what is in stock. Six departures meant most
honest answers returned an empty list, so `check:departures` now holds floors:
at least 16 departures across at least 8 treks; at least 4 under 3,000 m; at
least 4 in October or November; every month from September 2026 to May 2027
represented; at least 3 distinct treks of 7 days or fewer; at least three
distinct fill states, including one `full`.

The `full` one is deliberate. A seat meter that never shows its own end state
has an end state nobody has ever looked at.

## Checking

```bash
pnpm check:departures
```

Runs before every build. Fails on: empty `priceExcludes`, missing
`costSheetHref`, `seatsBooked > seatsTotal`, `minimumToRun > seatsTotal`,
`returnsOn <= departsOn`, `decisionDate` after `departsOn`, a departure in the
past, a missing `singleSupplementUSD`, name-like `groupSoFar` entries, a status
contradiction, and a malformed `/api/departures/feed.json` shape.

Since step 6 it also fails on: a duplicate `slug`, a day missing
`sleepAltitudeM`, an itinerary day count that disagrees with `days`, a day whose
`maxAltitudeM` is below its own `sleepAltitudeM`, an advertised `maxAltitudeM`
the walking days never reach, a last day that does not return to Kathmandu or
Pokhara, `acclimatisationDays` that has drifted from the days actually marked,
a `groupSizeMax` below `seatsTotal`, and any coverage floor above.

```bash
pnpm check:links
```

Also runs before every build. It reads every internal `href` out of `src/**` and
resolves it against the route files on disk, filling `/departures/[slug]` with
the nineteen slugs that actually exist. Nothing on this site is allowed to link
to a 404 — a page whose argument is "check us" cannot have a nav bar pointing
into nothing.
