"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";

import { MagneticButton } from "@/components/motion";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { SPRING } from "@/lib/motion";
import { defaultCurrency, primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Scroll distance at which the header stops being transparent. */
const SOLIDIFY_AT = 80;

/**
 * Transparent over the hero, solid past 80px.
 *
 * While transparent it sits on the always-dark hero panel, so its contents are
 * inverted to glacier; once solid it returns to the page's own foreground.
 */
export function SiteHeader() {
  const [solid, setSolid] = React.useState(false);

  React.useEffect(() => {
    const update = () => setSolid(window.scrollY > SOLIDIFY_AT);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const inverted = !solid;

  return (
    <motion.header
      data-motion
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b",
        solid
          ? "border-border bg-background/85 backdrop-blur-lg"
          : "border-transparent bg-transparent",
      )}
      initial={false}
      animate={{ height: solid ? 64 : 88 }}
      transition={SPRING}
    >
      <div className="shell flex h-full items-center justify-between gap-3 sm:gap-6">
        <Wordmark className={inverted ? "text-glacier" : "text-foreground"} />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "text-sm transition-opacity hover:opacity-60",
                    inverted ? "text-glacier" : "text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "hidden tabular text-xs tracking-[0.14em] sm:inline",
              inverted ? "text-stone-light" : "text-muted-foreground",
            )}
            aria-label={`Prices shown in ${defaultCurrency}`}
          >
            {defaultCurrency}
          </span>

          <ThemeToggle
            className={
              inverted
                ? "text-glacier hover:bg-snow/10 hover:text-glacier"
                : undefined
            }
          />

          <MagneticButton className="hidden sm:inline-block">
            <Button asChild size="lg">
              <Link href="/plan">Plan My Trek</Link>
            </Button>
          </MagneticButton>

          <span className="lg:hidden">
            <MobileNav inverted={inverted} />
          </span>
        </div>
      </div>
    </motion.header>
  );
}
