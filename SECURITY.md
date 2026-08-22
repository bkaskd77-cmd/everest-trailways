# Security policy

A working document. It binds every later step of this build, and it is meant to
be argued with and edited rather than admired.

Last reviewed: 22 August 2026 (step 6a).

---

## 1. Threat model

Who would attack a small Nepali trekking company's website, and why.

**API cost abuse — the live risk.** `/api/match` is unauthenticated and calls a
paid model. It is the only place a stranger can make us spend money, and the
cheapest attack on the internet is a loop. Controls: durable per-IP and
per-session sliding windows, a global daily token ceiling that fails closed, a
32 KB body limit checked before parsing, capped `max_tokens`, and an origin
check. If the counter store is unreachable we do not call the model at all — a
visitor still gets a real answer from the deterministic matcher, and we do not
get a bill we cannot see.

**Prompt injection.** Free text reaches a model whose output is displayed on our
page. An attacker wants it to publish a fake discount, restate its instructions,
or render markup. Controls: user text is stripped of `<`, `>`, control and
bidi characters, then fenced in `<user_message>` markers the sanitiser makes
uncloseable; the response is validated against a closed schema and discarded
whole on any unknown field, unknown departure id, or verbatim echo of the user's
own words. The prompt rules are prevention and are probabilistic. The schema is
containment and is not.

**Competitor scraping.** Our prices, dates and seat counts are public by design —
that is the product. We do not defend against reading. We do rate limit
`/api/departures/feed.json` so it cannot be used as a load generator, and the
feed carries only what a visitor could read on a page.

**Fraud impersonating us.** The realistic version is not a breach: it is a fake
"Everest Trailways" taking deposits by email. Defences are mostly outside the
code — SPF, DKIM and DMARC on the sending domain, a published list of the
channels we actually use, and never asking for payment by bank transfer to a
personal account. **Open task, not yet done.**

**PII theft.** Today we hold almost nothing: no accounts, no database, no stored
conversations. That changes the moment booking arrives, and section 3 is written
now so it is a constraint on that work rather than a retrofit.

**Payment fraud.** Covered in section 5. The short version is that the
application must never see a card number.

**Defacement.** Static pages, no CMS, no admin surface, no user-generated
content rendered anywhere. The route in would be the deploy pipeline or a
compromised dependency, which is why dependencies are pinned and a secret
scanner runs before every commit.

---

## 2. What is in place

| Control                                      | Where                                                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| Durable rate limits (per IP, per session)    | `src/lib/rate-limit.ts`, `src/lib/store.ts`                     |
| Global daily spend ceiling, fails closed     | `src/lib/spend.ts`                                              |
| Input sanitising, fencing, output validation | `src/lib/sanitise.ts`, `src/lib/matcher-types.ts`               |
| Prompt rules, asserted verbatim by a guard   | `src/lib/matcher-prompt.ts`                                     |
| Security headers                             | `next.config.ts`, `src/proxy.ts`, `src/lib/security-headers.ts` |
| Secret scanning, pre-commit and pre-build    | `scripts/scan-secrets.ts`, `.githooks/pre-commit`               |
| Structural guard over all of it              | `scripts/check-security.ts`                                     |

Logging records a hashed key and an event name. It never records an IP address,
a user agent, or anything anyone typed. The matcher's UI promises that nothing
typed there is stored; a log file is storage.

### The CSP trade, stated plainly

`script-src` allows `'unsafe-inline'`. It should not, and here is why it does.

A nonce-based policy requires dynamic rendering, because a nonce must be unique
per response and a prerendered page has no request to read one from. Every page
here except `/api/match` is prerendered. The strict policy was built, deployed
to a production build, and measured: **every script on the page was blocked** —
`'strict-dynamic'` disables `'self'`, and the prerendered HTML carries no nonce.
Next's experimental SRI does not solve it either; the inline RSC payload scripts
still need a nonce or a hash.

So the choice was a strict script policy paid for by giving up static generation
and CDN caching on every page, or a static site with every other directive
locked down. The second shipped. It is defensible here because no
user-generated content is rendered anywhere on this site, the one place model
output reaches a page is stripped of angle brackets first, and there is no
third-party script at all. `object-src 'none'`, `base-uri 'none'`,
`frame-ancestors 'none'`, `connect-src 'self'` and `form-action 'self'` are all
enforced, and those are what stop an injected script exfiltrating anything.

`CSP_STRICT=1` switches to the nonce policy. Doing that without first forcing
every page dynamic will break the site. **Revisit if user-generated content ever
renders on a page.**

---

## 3. Data minimisation — binding on all future steps

**Collect the least data needed, as late as possible.** Not as a principle to
weigh against convenience: as a rule that decides.

Concretely, before any step adds a field:

- Ask what breaks if we do not collect it. If the answer is "nothing until
  later", collect it later.
- Ask when it can be deleted. If there is no answer, do not collect it.
- Never collect data because it might be useful.

### Passports — the specific rule

Nepali trekking operators routinely take passport scans early, email them
between office, guide and permit agent, and keep them on a shared drive
indefinitely. TIMS cards and national park permits genuinely require passport
details. The email habit is not required by anything; it is just how it has
always been done. It is also how a folder of a hundred passport scans ends up in
an inbox that is one password away from anyone.

We will not do that. When booking is built:

1. Passport data is collected **only after a booking is confirmed and paid**,
   never as part of an enquiry, a quote, or a hold.
2. It is uploaded **directly from the traveller's browser to encrypted storage**.
   It does not pass through our application server and is not held in memory
   longer than the request.
3. It is **never sent or received by email**, in either direction, by anyone, for
   any reason. Not to the permit agent, not to the guide, not internally. If a
   permit agent requires email, they are given a time-limited access link
   instead, or we change agent.
4. It is **never written to application logs**, error reports, or analytics. Any
   logging of request bodies on a route that can carry it is a bug.
5. Access is **role-restricted and audited**: the people processing permits, and
   nobody else. Every access is recorded.
6. It is **retained only as long as the permit requires**, and **deleted on a
   schedule** that runs whether or not anyone remembers. The deletion job is part
   of the same step that builds the upload, not a later one.

The same applies to any document image — visas, insurance certificates, medical
forms. Medical forms additionally carry health data, which is a special category
under GDPR: if we ever collect one, it needs its own lawful basis and its own
decision, not this paragraph.

---

## 4. GDPR — a legal task, not a code task

Most customers will be in the EU and UK. **Nepal has no adequacy decision from
either.** Transferring personal data to Nepal is a restricted transfer.

What that means in practice, and what is not solved:

- We need a **lawful basis** for each processing purpose, documented before we
  process.
- We need **Standard Contractual Clauses** in place with any EU/UK-facing entity,
  plus a **transfer impact assessment**, because SCCs alone are not sufficient
  where local law may permit government access without redress.
- We likely need an **Article 27 representative** in the EU and UK if we target
  those markets, which a site in English selling to international travellers
  plainly does.
- We need a privacy notice, a data subject access process, and a breach
  notification path that can meet **72 hours**.

**This is flagged for the owner as a legal task and is not attempted in code.**
Writing a cookie banner and calling it compliance would be worse than doing
nothing, because it would look done. No step should ship a feature that collects
EU personal data until the basis and the SCCs exist.

The current site processes almost nothing: no accounts, no stored conversations,
no analytics, and IP addresses are hashed before they reach a log. That is a
deliberate position and it is worth keeping as long as possible.

---

## 5. Payments — binding before step 9

- **We will never store card data.** Not encrypted, not tokenised by us, not
  "temporarily".
- **PSP-hosted fields only.** The card input is an iframe or redirect owned by the
  payment provider. Our JavaScript must not be able to read it.
- **The application must never see a PAN.** If a card number can reach our server
  in any code path, including an error handler or a log line, that path is a bug
  and blocks release.
- This keeps us in the smallest PCI DSS scope available (SAQ A). Any design that
  widens that scope is rejected by default.
- Refunds and the guarantee promise are stated on the departure pages. The
  refund path must be operable by a person without database access.

Deposits by bank transfer, if offered at all, go to a company account named
identically to the trading name, never to a personal account. That is an
anti-fraud control for the customer, not for us.

---

## 6. Authentication — binding when the ops dashboard arrives

There is no login today, which is the safest possible state. When one exists:

- **MFA required** for every account. No exceptions for convenience, none for the
  owner.
- **Least privilege**: permit processing, seat management and financial data are
  separate permissions. Most staff need one of them.
- **Session limits**: short idle timeout, absolute expiry, revocable server-side.
  A logout must actually end the session.
- **Audit log** of every access to customer data and every change to a booking,
  written where the person who made the change cannot edit it.
- No shared accounts, ever. "The office login" is how an audit log becomes
  worthless.

---

## 7. Incident response

**If an API key leaks** (found in a commit, a log, a screenshot, or a support
thread):

1. **Rotate it immediately.** Before investigating, before telling anyone, before
   working out whether it was used. Rotation is cheap; the window is not.
2. Revoke the old key at the provider so it fails rather than lingering.
3. Check provider usage logs for calls we did not make, and note the window of
   exposure.
4. Remove it from the code and work out how the guard missed it. Add the pattern
   to `scripts/scan-secrets.ts`.
5. A key that reached a working tree is disclosed whether or not it was
   committed, pushed, or public. Treat it as disclosed.

**If personal data is exposed:**

1. Stop the exposure — take the route offline if that is what it takes. A broken
   page is recoverable; a continuing leak is not.
2. Establish what data, whose, how many, and for how long. Write it down as you
   go; you will need it and you will not remember.
3. **Notify the relevant supervisory authority within 72 hours** of becoming
   aware, if EU or UK personal data is involved. Late is much worse than
   incomplete — an initial notification can be updated.
4. **Notify affected people directly** where there is a high risk to them, in
   plain language: what happened, what data, what we have done, what they should
   do. No euphemisms. A company whose entire positioning is that its claims are
   checkable does not get to be vague about this one.
5. If passport or payment data is involved, tell people to watch for identity
   fraud specifically, and say so on the day rather than after the
   investigation.
6. Write up what happened and what changed, and put a guard in the build so the
   same thing fails next time.

**Who to notify:** the owner first and immediately, in every case. Then the
supervisory authority (EU/UK), affected customers, the payment provider if
payments are involved, and the Nepal Tourism Board only if a licence obligation
requires it. Contact details for each belong in an internal runbook, not in a
public repository.

---

## 8. Reporting a vulnerability

Email `hello@everesttrailways.com` with "security" in the subject. We will
acknowledge within three working days. We are a small company with no bounty
programme, and we would rather hear about a problem than not.

Please do not run automated scanners against `/api/match`. It costs us real
money per request, which is the finding you were going to report anyway.
