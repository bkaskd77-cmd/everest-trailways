"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import {
  MagneticButton,
  Parallax,
  Reveal,
  StaggerGroup,
  TextReveal,
} from "@/components/motion";
import { Button } from "@/components/ui/button";
import { fadeIn, scaleIn } from "@/lib/motion";

function Demo({
  name,
  usage,
  children,
}: {
  name: string;
  usage: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-border p-6">
      <p className="font-mono text-xs">{name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
      <div className="mt-6">{children}</div>
    </li>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-20 items-center justify-center rounded-md bg-muted px-4 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * Live specimen of every motion primitive. Replay remounts the subtree, since
 * each primitive is deliberately once-only.
 */
export function MotionLab() {
  const [run, setRun] = React.useState(0);

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRun((value) => value + 1)}
      >
        <RotateCcw aria-hidden />
        Replay all
      </Button>

      <ul key={run} className="mt-6 grid gap-6 lg:grid-cols-2">
        <Demo name="<Reveal>" usage="Once-only fade-up when it enters view.">
          <Reveal>
            <Tile>fadeUp · 0.5s · expo-out</Tile>
          </Reveal>
        </Demo>

        <Demo
          name="<StaggerGroup>"
          usage="Reveals its children 0.08s apart from a single observer."
        >
          <StaggerGroup as="ul" className="grid grid-cols-3 gap-3">
            {["one", "two", "three"].map((label) => (
              <Reveal as="li" key={label}>
                <Tile>{label}</Tile>
              </Reveal>
            ))}
          </StaggerGroup>
        </Demo>

        <Demo
          name="<TextReveal>"
          usage="Line-by-line mask. Opacity never drops, so it stays LCP-safe."
        >
          <TextReveal
            trigger="inView"
            lines={["Earned confidence,", "line by line."]}
            className="font-display text-3xl tracking-tight"
          />
        </Demo>

        <Demo
          name="<Parallax>"
          usage="Scroll-linked drift, capped at 40px. Scroll the page to drive it."
        >
          <Parallax distance={24}>
            <Tile>translateY ±24px</Tile>
          </Parallax>
        </Demo>

        <Demo
          name="<MagneticButton>"
          usage="Cursor attraction. Inert on touch and under reduced motion."
        >
          <MagneticButton>
            <Button size="lg">Hover me</Button>
          </MagneticButton>
        </Demo>

        <Demo
          name="fadeIn · scaleIn"
          usage="The remaining shared variants, passed into <Reveal>."
        >
          <div className="grid grid-cols-2 gap-3">
            <Reveal variants={fadeIn}>
              <Tile>fadeIn</Tile>
            </Reveal>
            <Reveal variants={scaleIn} delay={0.15}>
              <Tile>scaleIn · delay 0.15</Tile>
            </Reveal>
          </div>
        </Demo>
      </ul>
    </div>
  );
}
