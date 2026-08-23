import type { Metadata } from "next";
import { MessageCircle, Mail, MapPin } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { SectionHead } from "@/components/departure/section-head";
import { ContactForm } from "@/components/contact/contact-form";
import { ANSWER_SPEED, CONTACT } from "@/content/contact";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "WhatsApp, email or a form. What we can answer immediately and what needs a day, our hours in Nepal time, and the office you can walk into.",
  alternates: { canonical: "/contact" },
};

/**
 * Not a form dump.
 *
 * In this market the channels that work are WhatsApp and email, and a
 * traveller partly chooses an operator on how fast somebody answers. So the
 * response commitment is the first thing on the page rather than fine print
 * under a submit button, WhatsApp sits beside the form rather than beneath it,
 * and the page says which questions we can answer now and which need a day —
 * because the alternative is a reader waiting on a permit question and
 * wondering whether they have been forgotten.
 */
export default function ContactPage() {
  const wa = `https://wa.me/${CONTACT.whatsappNumber.replace(/\D/g, "")}`;

  return (
    <main className="bg-band-sunk">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: `Contact ${siteConfig.name}`,
          url: `${siteConfig.url}/contact`,
        }}
      />

      <div className="shell pt-32 pb-24 lg:pt-40 lg:pb-28">
        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
          Contact
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-4xl tracking-tight text-balance lg:text-5xl">
          A person answers, and here is how fast.
        </h1>
        <p className="mt-5 max-w-[62ch] text-base text-muted-foreground">
          {CONTACT.responseCommitment}. That commitment is the same one quoted
          on every departure page — one sentence in one file, so it cannot
          promise four hours here and three somewhere else.
        </p>

        {/* ---------------------------------------------- the channels */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <a
            href={wa}
            target="_blank"
            rel="noreferrer noopener"
            className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25"
          >
            <MessageCircle aria-hidden className="size-5 text-verified" />
            <h2 className="mt-3 font-display text-xl tracking-tight">
              WhatsApp
            </h2>
            <p className="mt-2 tabular text-sm">{CONTACT.whatsappNumber}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The fastest of the three, and the one most people here actually
              use. Same people, same hours.
            </p>
          </a>

          <a
            href={`mailto:${CONTACT.email}`}
            className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/25"
          >
            <Mail aria-hidden className="size-5 text-verified" />
            <h2 className="mt-3 font-display text-xl tracking-tight">Email</h2>
            <p className="mt-2 text-sm break-all">{CONTACT.email}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Best for anything with a document attached, or where you want the
              answer in writing.
            </p>
          </a>

          <div className="rounded-lg border border-border bg-card p-6">
            <MapPin aria-hidden className="size-5 text-verified" />
            <h2 className="mt-3 font-display text-xl tracking-tight">
              The office
            </h2>
            <address className="mt-2 text-sm not-italic">
              {CONTACT.office.line1}
              <br />
              {CONTACT.office.line2}
              <br />
              {CONTACT.office.city}, {CONTACT.office.country}
            </address>
            <p className="mt-2 text-sm text-muted-foreground">
              We have a physical office and you can walk into it. Plenty of
              operators selling Nepal treks do not, which is worth knowing
              before you send anybody money.
            </p>
            <p className="mt-2 text-xs tracking-[0.06em] text-prayer-deep uppercase">
              {CONTACT.office.note}
            </p>
          </div>
        </div>

        {/* -------------------------------------- fast versus not fast */}
        <section aria-labelledby="speed-heading" className="mt-20">
          <SectionHead
            eyebrow="What takes how long"
            id="speed-heading"
            title="Some of it we can answer now. Some of it we cannot."
          >
            <p>
              Published so that a slow answer reads as a hard question rather
              than as being ignored.
            </p>
          </SectionHead>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-lg border border-verified/30 bg-verified/5 p-6">
                <h3 className="font-display text-xl tracking-tight">
                  Answered straight away
                </h3>
                <ul className="mt-4 grid gap-3 text-sm">
                  {ANSWER_SPEED.immediate.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="h-full rounded-lg border border-prayer/30 bg-prayer/5 p-6">
                <h3 className="font-display text-xl tracking-tight">
                  Usually needs a day
                </h3>
                <ul className="mt-4 grid gap-3 text-sm">
                  {ANSWER_SPEED.needsADay.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------- the form */}
        <section aria-labelledby="form-heading" className="mt-20">
          <SectionHead
            eyebrow="Or write here"
            id="form-heading"
            title="Three fields, and no more."
          >
            <p>
              What it is about, what you want to know, and how to reach you.
              Nothing else is asked, because nothing else is needed to reply and
              every extra field is data somebody then has to protect.
            </p>
          </SectionHead>

          <div className="mt-10 max-w-2xl">
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}
