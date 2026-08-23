# Permits

Every amount and date in `permits.ts` is a placeholder. None of it has been
checked against a real fee schedule and none of it should be published.

## Why permits are records rather than numbers

Nepal's permit regime moves. TIMS — a card every trekker carried and every
operator charged for — was discontinued outright. A codebase with `TIMS card,
$20` written into a cost sheet builder would have gone on charging for a permit
that no longer existed, on every departure page, inside the total, until
somebody noticed. Finding all the places it had been typed would then have been
the second problem.

So no departure stores a permit, and no trek stores an amount. A trek declares
which permit **types** its route needs; the records that satisfy those types on
a given date are resolved at build time.

## The composition rule

A permit applies to a departure when all three are true:

1. its `status` is `active`
2. its `appliesToRegions` includes the trek's region
3. the departure date falls inside `[effectiveFrom, effectiveUntil]`

That is the whole rule, in `permitsFor()`. It is deliberately small, because
everything admin needs follows from it without a code change:

| What admin does                                | What happens                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Sets a record's `status` to `discontinued`     | It leaves every affected cost sheet at once. Prices fall by its amount.                         |
| Adds a new record with a later `effectiveFrom` | Departures after that date pick it up; earlier ones keep the record that applied on their date. |
| Adds a permit type to a trek                   | The fee appears on that trek's departures. No cost profile is edited.                           |
| Adds a region to a record                      | Every trek in that region picks it up.                                                          |

`pnpm demo:permit <permitId> discontinue` prints exactly which departures move
and by how much, without writing anything.

## Validity windows

`effectiveFrom` is inclusive. `effectiveUntil` is inclusive and optional —
absent means "still in force".

Windows are what make a past departure truthful. A trip that ran in 2026 under
a $15 levy still shows $15 after the levy rises to $20 in 2027, because the
2026 record still covers its date. Nothing is rewritten and no history is lost.

The seed data demonstrates this: `local-levy-2024` covers up to 2026-12-31 at
$15, `local-levy-2027` takes over at $20. Annapurna departures in 2026 carry
the first; the March 2027 Annapurna Circuit carries the second. Neither trek
was edited.

## Statuses

- **`active`** — in force, subject to its window. Only these are composed.
- **`superseded`** — replaced by another record, which `supersededBy` must
  name. The guard fails if it does not.
- **`discontinued`** — the permit no longer exists. Kept, never deleted, so
  past cost sheets stay truthful and so nobody re-adds it by hand next year.

**A record only becomes `superseded` once its replacement is actually in
force.** Marking the current record superseded the day a future one is drafted
takes it out of composition while it is still the fee people are paying — a
quiet way to under-charge a whole season. The first draft of the seed data made
exactly this mistake and the levy vanished from every 2026 departure.

## What the guards enforce

`check:departures` fails the build on:

- a trek requiring a permit type with no active record covering a departure's
  date (`permit-unresolved`) — a silently missing fee somebody will be charged
- a cost sheet carrying a permit line no active record covers on that date
  (`permit-out-of-window`)
- `effectiveUntil` earlier than `effectiveFrom` (`permit-bad-window`) — a
  record that matches nothing
- `status: "superseded"` with no `supersededBy`, or one naming a record that
  does not exist (`permit-superseded-orphan`)

## How admin will manage these

Records are append-mostly. The three operations are:

**Change a fee.** Do not edit the amount. Add a new record with the new amount
and an `effectiveFrom` of the day it takes effect, and set `effectiveUntil` on
the outgoing record to the day before. Both stay in the file.

**Discontinue a permit.** Set `status` to `discontinued` and `effectiveUntil`
to its last valid date. Do not delete the record.

**Add a permit.** Add the record, then add its `name` to the
`requiredPermitTypes` of every trek that needs it. The name is the join, so it
must match exactly — the guard catches a mismatch as `permit-unresolved`.

`verifyUrl` should point at the issuing body's own published schedule wherever
one exists, so a reader can check the figure against the source rather than
against us. `issuingBody` currently reads `PLACEHOLDER — issuing body not
verified` on every record and must be replaced before launch.
