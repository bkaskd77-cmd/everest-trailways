"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { defaultCurrency, primaryNav, siteConfig } from "@/lib/site";
import * as m from "motion/react-m";

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
};

/**
 * Hamburger → full-screen navigation.
 *
 * Radix's Dialog underneath the Sheet supplies the focus trap, Escape handling
 * and scroll lock, so the keyboard path is handled by the primitive rather than
 * re-implemented here.
 */
export function MobileNav({ inverted }: { inverted: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className={inverted ? "text-glacier hover:bg-snow/10" : undefined}
        >
          <Menu aria-hidden className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full border-0 bg-summit text-glacier sm:max-w-full"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Browse {siteConfig.name}
        </SheetDescription>

        <div className="flex items-center justify-between px-6 pt-5">
          <span className="font-sans text-xs tracking-[0.18em] text-stone-light uppercase">
            Menu
          </span>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-glacier hover:bg-snow/10 hover:text-glacier"
            >
              Close
            </Button>
          </SheetClose>
        </div>

        <m.nav
          data-motion
          variants={list}
          initial="hidden"
          animate="visible"
          className="flex flex-1 flex-col justify-center px-6 pb-16"
          aria-label="Primary"
        >
          <ul className="flex flex-col gap-1">
            {primaryNav.map((link) => (
              <m.li key={link.href} data-motion variants={item}>
                <SheetClose asChild>
                  <Link
                    href={link.href}
                    className="block py-2 font-display text-4xl tracking-tight"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              </m.li>
            ))}
          </ul>

          <m.div
            data-motion
            variants={item}
            className="mt-10 flex items-center gap-4 border-t border-stone/30 pt-8"
          >
            <span className="tabular text-sm text-stone-light">
              {defaultCurrency}
            </span>
            <SheetClose asChild>
              <Button asChild size="lg" className="flex-1">
                <Link href="/plan">Plan My Trek</Link>
              </Button>
            </SheetClose>
          </m.div>
        </m.nav>
      </SheetContent>
    </Sheet>
  );
}
